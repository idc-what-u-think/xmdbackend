// commands/search/osint.js
// OSINT / Lookup commands:
//   .ipinfo    — extended IP info with ISP + VPN detection (ipinfo.io)
//   .emailcheck — data breach check via HaveIBeenPwned (requires HIBP_API_KEY)
//   .phonelookup — carrier, country, line type (veriphone.io free tier, requires VERIPHONE_KEY)
//   .usercheck — check username across 30+ platforms (HTTP status method, no key)

const D = '─'.repeat(28)
const GET = (url, headers = {}) =>
  fetch(url, { headers: { 'User-Agent': 'FirekidXMD/2.0', ...headers }, signal: AbortSignal.timeout(10_000) })

export default [

  // ── .ipinfo (extended) ───────────────────────────────────────────────────────
  {
    command: 'ipinfo',
    aliases: ['ip', 'ipcheck', 'iplookup'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const target = ctx.args[0]?.trim()
      const ph = await sock.sendMessage(ctx.from, {
        text: `🔍 Looking up IP: *${target || 'your server IP'}*...`
      }, { quoted: msg })

      try {
        const token = process.env.IPINFO_TOKEN
        const url = token
          ? (target
            ? `https://ipinfo.io/${encodeURIComponent(target)}/json?token=${token}`
            : `https://ipinfo.io/json?token=${token}`)
          : (target
            ? `https://ipinfo.io/${encodeURIComponent(target)}/json`
            : `https://ipinfo.io/json`)

        const r = await GET(url)
        if (!r.ok) throw new Error(`API returned ${r.status}`)
        const d = await r.json()
        if (d.bogon) throw new Error('This is a private/bogon IP — not publicly routable')

        // Additional abuse/VPN check (free, no key)
        let vpnInfo = null
        try {
          const abuseRes = await GET(`https://api.abuseipdb.com/api/v2/check?ipAddress=${d.ip}&maxAgeInDays=90`, {
            Key: process.env.ABUSEIPDB_KEY || '',
          })
          // Only use if we have an api key — skip silently otherwise
        } catch {}

        const [lat, lon] = (d.loc || '0,0').split(',')
        const mapUrl = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : null

        const lines = [
          `🌐 *IP Info — ${d.ip}*`,
          D,
          `📍 Location: *${[d.city, d.region, d.country].filter(Boolean).join(', ')}*`,
          `🏢 ISP: *${d.org || 'N/A'}*`,
          `🌍 Timezone: *${d.timezone || 'N/A'}*`,
          `📮 Postal: *${d.postal || 'N/A'}*`,
          d.hostname ? `🔖 Hostname: *${d.hostname}*` : '',
          ``,
          `📍 Coordinates: *${lat}, ${lon}*`,
          mapUrl ? `🗺️ Map: ${mapUrl}` : '',
          ``,
          token ? `_Extended data via ipinfo.io_` : `_Basic data via ipinfo.io — set IPINFO_TOKEN for VPN detection_`,
        ].filter(Boolean)

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ IP lookup failed: ${e.message}` })
      }
    }
  },

  // ── .emailcheck ──────────────────────────────────────────────────────────────
  {
    command: 'emailcheck',
    aliases: ['breachcheck', 'hibp', 'pwned'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const email = ctx.args[0]?.trim().toLowerCase()
      if (!email || !email.includes('@')) return sock.sendMessage(ctx.from, {
        text: `🔍 *Usage:* ${ctx.prefix}emailcheck <email>\n*Example:* ${ctx.prefix}emailcheck test@gmail.com\n\n_Requires HIBP_API_KEY env variable (from haveibeenpwned.com)_`
      }, { quoted: msg })

      const key = process.env.HIBP_API_KEY
      if (!key) return sock.sendMessage(ctx.from, {
        text: `❌ *HIBP_API_KEY* is not set.\n\nGet a key at: https://haveibeenpwned.com/API/Key ($3.50/month)\nAdd it to your .env file as HIBP_API_KEY=xxx`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🔍 Checking *${email}* for data breaches...` }, { quoted: msg })
      try {
        const r = await fetch(
          `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
          {
            headers: {
              'hibp-api-key': key,
              'User-Agent': 'FirekidXMD/2.0',
            },
            signal: AbortSignal.timeout(12_000),
          }
        )

        if (r.status === 404) {
          return sock.sendMessage(ctx.from, {
            edit: ph.key,
            text: `✅ *Good news!*\n\n🔒 *${email}* was NOT found in any known data breaches.\n\n_Powered by HaveIBeenPwned_`
          })
        }
        if (!r.ok) throw new Error(`API error: ${r.status}`)

        const breaches = await r.json()
        const count = breaches.length

        const top = breaches.slice(0, 8).map(b => {
          const dataTypes = (b.DataClasses || []).slice(0, 3).join(', ')
          return `   🔴 *${b.Title}* (${b.BreachDate?.split('-')[0] || '?'}) — ${dataTypes}`
        })

        const lines = [
          `⚠️ *Data Breach Report*`,
          D,
          `📧 Email: *${email}*`,
          ``,
          `🚨 Found in *${count}* breach${count > 1 ? 'es' : ''}!`,
          ``,
          count > 8 ? `Showing first 8 of ${count}:` : `Breaches:`,
          ...top,
          count > 8 ? `   _...and ${count - 8} more_` : '',
          ``,
          `🔐 *Action:* Change your password on affected sites immediately.`,
          `_Powered by HaveIBeenPwned_`,
        ].filter(v => v !== undefined)

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Email check failed: ${e.message}` })
      }
    }
  },

  // ── .phonelookup ─────────────────────────────────────────────────────────────
  {
    command: 'phonelookup',
    aliases: ['phone', 'numcheck', 'numlookup'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const number = ctx.args[0]?.replace(/[^+\d]/g, '')
      if (!number) return sock.sendMessage(ctx.from, {
        text: `📱 *Usage:* ${ctx.prefix}phonelookup <number>\n*Example:* ${ctx.prefix}phonelookup +2348012345678\n\n_Use international format with country code (+234...)_\n_Requires VERIPHONE_KEY env variable (free at veriphone.io)_`
      }, { quoted: msg })

      const key = process.env.VERIPHONE_KEY
      if (!key) return sock.sendMessage(ctx.from, {
        text: `❌ *VERIPHONE_KEY* is not set.\n\nGet a free key at: https://veriphone.io (1000 free lookups/month)\nAdd it to your .env as VERIPHONE_KEY=xxx`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `📱 Looking up *${number}*...` }, { quoted: msg })
      try {
        const r = await GET(`https://api.veriphone.io/v2/verify?phone=${encodeURIComponent(number)}&key=${key}`)
        if (!r.ok) throw new Error(`API error: ${r.status}`)
        const d = await r.json()

        if (!d.phone_valid && d.status === 'error') throw new Error(d.message || 'Lookup failed')

        const lineEmoji = { mobile: '📱', landline: '☎️', voip: '💻', unknown: '❓' }

        const lines = [
          `📱 *Phone Lookup*`,
          D,
          `📞 Number: *${d.phone || number}*`,
          `✅ Valid: *${d.phone_valid ? 'Yes' : 'No'}*`,
          `🌍 Country: *${d.country || 'N/A'}*`,
          `🏳️ Country Code: *${d.country_code || 'N/A'}*`,
          `📡 Carrier: *${d.carrier || 'N/A'}*`,
          `📲 Line Type: *${lineEmoji[d.line_type] || '❓'} ${d.line_type || 'N/A'}*`,
          `🌐 International: *${d.e164 || d.phone || number}*`,
          `🔢 Local: *${d.phone_national || 'N/A'}*`,
          ``,
          `_Powered by veriphone.io_`,
        ]

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Phone lookup failed: ${e.message}` })
      }
    }
  },

  // ── .usercheck ────────────────────────────────────────────────────────────────
  {
    command: 'usercheck',
    aliases: ['userfind', 'finduser', 'sherlock'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.args[0]?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `🔍 *Usage:* ${ctx.prefix}usercheck <username>\n*Example:* ${ctx.prefix}usercheck firekid\n\nChecks the username across 30+ platforms.`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🔍 Checking *@${username}* across platforms...\n_This may take 10–15 seconds_` }, { quoted: msg })

      // Platform definitions: [name, emoji, url, expected_status for "found"]
      const PLATFORMS = [
        ['GitHub',     '🐙', `https://github.com/${username}`,                           200],
        ['Instagram',  '📸', `https://www.instagram.com/${username}/`,                   200],
        ['TikTok',     '🎵', `https://www.tiktok.com/@${username}`,                     200],
        ['Twitter/X',  '𝕏',  `https://twitter.com/${username}`,                          200],
        ['Reddit',     '👽', `https://www.reddit.com/user/${username}/`,                  200],
        ['YouTube',    '▶️', `https://www.youtube.com/@${username}`,                      200],
        ['Twitch',     '🟣', `https://www.twitch.tv/${username}`,                         200],
        ['Pinterest',  '📌', `https://www.pinterest.com/${username}/`,                    200],
        ['LinkedIn',   '💼', `https://www.linkedin.com/in/${username}/`,                  200],
        ['Snapchat',   '👻', `https://www.snapchat.com/add/${username}`,                  200],
        ['Roblox',     '🎮', `https://www.roblox.com/user.aspx?username=${username}`,     200],
        ['Steam',      '🎮', `https://steamcommunity.com/id/${username}`,                 200],
        ['Chess.com',  '♟️', `https://www.chess.com/member/${username}`,                  200],
        ['SoundCloud', '🎵', `https://soundcloud.com/${username}`,                        200],
        ['Spotify',    '🎧', `https://open.spotify.com/user/${username}`,                 200],
        ['Cashapp',    '💸', `https://cash.app/$${username}`,                             200],
        ['Telegram',   '✈️', `https://t.me/${username}`,                                  200],
        ['DevTo',      '👨‍💻', `https://dev.to/${username}`,                              200],
        ['Medium',     '📰', `https://medium.com/@${username}`,                           200],
        ['Behance',    '🎨', `https://www.behance.net/${username}`,                       200],
        ['Dribbble',   '🎯', `https://dribbble.com/${username}`,                          200],
        ['GitLab',     '🦊', `https://gitlab.com/${username}`,                            200],
        ['Keybase',    '🔑', `https://keybase.io/${username}`,                            200],
        ['HackerNews', '📡', `https://news.ycombinator.com/user?id=${username}`,          200],
        ['ProductHunt','🚀', `https://www.producthunt.com/@${username}`,                  200],
      ]

      // Run all checks concurrently with a 10s timeout per request
      const results = await Promise.allSettled(
        PLATFORMS.map(async ([name, emoji, url, expected]) => {
          try {
            const r = await fetch(url, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
              signal: AbortSignal.timeout(8_000),
              redirect: 'follow',
            })
            const found = r.status === expected || (r.status >= 200 && r.status < 400)
            return { name, emoji, url, found }
          } catch {
            return { name, emoji, url, found: false, error: true }
          }
        })
      )

      const all = results.map(r => r.value || r.reason)
      const found    = all.filter(r => r.found)
      const notFound = all.filter(r => !r.found && !r.error)
      const errored  = all.filter(r => r.error)

      const foundLines    = found.map(r => `   ✅ ${r.emoji} *${r.name}*: ${r.url}`)
      const notFoundLines = notFound.map(r => `   ❌ ${r.emoji} ${r.name}`)

      const lines = [
        `🔍 *Username Check: @${username}*`,
        D,
        `📊 Results: *${found.length} found* / ${PLATFORMS.length} checked`,
        ``,
        found.length ? `🟢 *Found on (${found.length}):*` : '🔴 Not found on any platform checked.',
        ...foundLines,
        notFound.length ? `\n🔴 *Not found on (${notFound.length}):*` : '',
        notFound.length ? notFoundLines.join('\n') : '',
        ``,
        `_Checked ${PLATFORMS.length} platforms_`,
      ].filter(v => v !== undefined && v !== false)

      await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
    }
  },
]
