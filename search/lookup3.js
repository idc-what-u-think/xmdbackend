// commands/search/lookup3.js
// Bible, Quran/Al-Quran, Crypto prices, IP Info, WHOIS lookup

const DIVIDER = '─'.repeat(28)

export default [

  // ── .bible ────────────────────────────────────────────────────────────────
  {
    command: 'bible',
    aliases: ['bibleverse', 'verse', 'scripture'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()

      // If no query, get random verse
      const isRandom = !query

      const ph = await sock.sendMessage(ctx.from, {
        text: isRandom ? '✝️ Fetching random Bible verse...' : `✝️ Looking up _${query}_...`
      }, { quoted: msg })

      try {
        let book, chapter, verse, text, ref

        if (isRandom) {
          // Random verse from Bible API
          const r = await fetch('https://bible-api.com/?random=verse', { signal: AbortSignal.timeout(10_000) })
          if (!r.ok) throw new Error('Failed to fetch random verse')
          const d = await r.json()
          text = d.text?.trim()
          ref  = d.reference || 'Unknown'
        } else {
          // Parse reference like "John 3:16" or "Genesis 1:1"
          const r = await fetch(`https://bible-api.com/${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10_000) })
          if (!r.ok) throw new Error(`Verse not found: ${query}`)
          const d = await r.json()
          text = (d.verses || []).map(v => v.text?.trim()).join(' ') || d.text?.trim()
          ref  = d.reference || query
        }

        if (!text) throw new Error('No text returned')

        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: [
            `✝️ *${ref}*`,
            DIVIDER, ``,
            `_"${text}"_`, ``,
            `_Bible (KJV) 📖_`
          ].join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: `❌ Bible verse error: ${err.message}\n\n*Usage:* ${ctx.prefix}bible John 3:16\n_Or just ${ctx.prefix}bible for a random verse_`
        })
      }
    }
  },

  // ── .quran ────────────────────────────────────────────────────────────────
  {
    command: 'quran',
    aliases: ['alquran', 'quranverse', 'surah'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      const isRandom = !query

      const ph = await sock.sendMessage(ctx.from, {
        text: isRandom ? '🕌 Fetching random Quran verse...' : `🕌 Looking up _${query}_...`
      }, { quoted: msg })

      try {
        let surah, ayah, arabicText, englishText, reference

        if (isRandom) {
          surah = Math.floor(Math.random() * 114) + 1
          ayah  = Math.floor(Math.random() * 10) + 1
        } else {
          // Parse "2:255" or "Al-Fatiha 1" or "2 255"
          const match = query.match(/(\d+)[:\s]+(\d+)/)
          if (match) {
            surah = parseInt(match[1])
            ayah  = parseInt(match[2])
          } else {
            // Try by name — search surah list
            const listRes = await fetch('https://api.alquran.cloud/v1/surah', { signal: AbortSignal.timeout(8_000) })
            const listData = await listRes.json()
            const found = listData?.data?.find(s =>
              s.englishName?.toLowerCase().includes(query.toLowerCase()) ||
              s.name?.includes(query)
            )
            if (!found) throw new Error(`Surah not found: ${query}`)
            surah = found.number
            ayah  = 1
          }
        }

        // Fetch Arabic + English translation
        const [arRes, enRes] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`, { signal: AbortSignal.timeout(10_000) }),
          fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.asad`, { signal: AbortSignal.timeout(10_000) }),
        ])

        const arData = await arRes.json()
        const enData = await enRes.json()

        if (arData.code !== 200) throw new Error(`Ayah not found: ${surah}:${ayah}`)

        arabicText  = arData.data?.text
        englishText = enData.data?.text
        reference   = `Surah ${arData.data?.surah?.englishName || surah} (${arData.data?.surah?.name || ''}), Ayah ${ayah}`

        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: [
            `🕌 *${reference}*`,
            DIVIDER, ``,
            arabicText ? `🌙 *Arabic:*\n${arabicText}` : '',
            ``,
            englishText ? `📖 *Translation:*\n_"${englishText}"_` : '',
            ``,
            `_Al-Quran 📖 — al-Quran.cloud_`
          ].filter(l => l !== undefined).join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: `❌ Quran lookup failed: ${err.message}\n\n*Usage:* ${ctx.prefix}quran 2:255\n_Or just ${ctx.prefix}quran for a random verse_`
        })
      }
    }
  },

  // ── .cryptoprice ──────────────────────────────────────────────────────────
  {
    command: 'cryptoprice',
    aliases: ['crypto', 'coin', 'coinprice', 'price'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const coin = ctx.query?.trim()?.toLowerCase() || 'bitcoin'
      const ph = await sock.sendMessage(ctx.from, { text: `💰 Fetching price for _${coin}_...` }, { quoted: msg })

      try {
        // CoinGecko free API — no key needed for basic endpoints
        const searchRes = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(coin)}`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        const searchData = await searchRes.json()
        const coinId = searchData?.coins?.[0]?.id || coin

        const priceRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        if (!priceRes.ok) throw new Error(`Coin not found: ${coin}`)
        const d = await priceRes.json()

        const usd   = d.market_data?.current_price?.usd
        const ngn   = d.market_data?.current_price?.ngn
        const chg24 = d.market_data?.price_change_percentage_24h
        const mktCap = d.market_data?.market_cap?.usd
        const vol    = d.market_data?.total_volume?.usd
        const high24 = d.market_data?.high_24h?.usd
        const low24  = d.market_data?.low_24h?.usd
        const rank   = d.market_cap_rank

        const arrow = chg24 >= 0 ? '🟢 ▲' : '🔴 ▼'
        const fmt = (n) => n ? `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A'
        const fmtK = (n) => n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : fmt(n)

        const text = [
          `💰 *${d.name} (${d.symbol?.toUpperCase()})*`,
          DIVIDER, ``,
          `💵 Price USD:   *${fmt(usd)}*`,
          ngn ? `🇳🇬 Price NGN:   *₦${Number(ngn).toLocaleString()}*` : '',
          `📈 24h Change:  *${arrow} ${Math.abs(chg24 || 0).toFixed(2)}%*`,
          `⬆️  24h High:   *${fmt(high24)}*`,
          `⬇️  24h Low:    *${fmt(low24)}*`,
          `📊 Market Cap:  *${fmtK(mktCap)}*`,
          `💹 24h Volume:  *${fmtK(vol)}*`,
          rank ? `🏆 Rank:        *#${rank}*` : '',
          ``,
          `_Powered by CoinGecko 🦎_`
        ].filter(Boolean).join('\n')

        await sock.sendMessage(ctx.from, { edit: ph.key, text })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: `❌ Crypto price failed: ${err.message}\n\n_Try full names: bitcoin, ethereum, solana, dogecoin_`
        })
      }
    }
  },

  // ── .ipinfo ───────────────────────────────────────────────────────────────
  {
    command: 'ipinfo',
    aliases: ['ip', 'iplookup', 'ipgeo', 'checkip'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.trim()
      const target = input || 'me'  // 'me' = caller's IP (returns server IP)

      const ph = await sock.sendMessage(ctx.from, { text: `🌐 Looking up IP _${target}_...` }, { quoted: msg })

      try {
        // ip-api.com — free tier 45 req/min, no key
        const url = target === 'me'
          ? 'http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query'
          : `http://ip-api.com/json/${encodeURIComponent(target)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`

        const res = await fetch(url, { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) })
        const d = await res.json()

        if (d.status === 'fail') throw new Error(d.message || 'IP lookup failed')

        const text = [
          `🌐 *IP Info: ${d.query}*`,
          DIVIDER, ``,
          `🏳️ Country:  *${d.country} (${d.countryCode})*`,
          `📍 Region:   *${d.regionName} (${d.region})*`,
          `🏙️  City:     *${d.city}*`,
          `📮 ZIP:      *${d.zip || 'N/A'}*`,
          `🌍 Coords:   *${d.lat}, ${d.lon}*`,
          `⏰ Timezone: *${d.timezone}*`,
          `📡 ISP:      *${d.isp}*`,
          `🏢 Org:      *${d.org}*`,
          `🔢 AS:       *${d.as}*`,
          ``,
          `🗺️ Maps: https://maps.google.com/?q=${d.lat},${d.lon}`,
          ``,
          `_Powered by ip-api.com_`
        ].join('\n')

        await sock.sendMessage(ctx.from, { edit: ph.key, text })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ IP lookup failed: ${err.message}` })
      }
    }
  },

  // ── .whois ────────────────────────────────────────────────────────────────
  {
    command: 'whois',
    aliases: ['domaininfo', 'domainwhois', 'lookup'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const domain = ctx.query?.trim()?.replace(/https?:\/\//i, '').split('/')[0]
      if (!domain) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}whois <domain>\n\n*Example:* ${ctx.prefix}whois google.com`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🔎 Looking up _${domain}_...` }, { quoted: msg })

      try {
        // whoisjson.com — free, no auth
        const res = await fetch(
          `https://whoisjson.com/api/v1/whois?domain=${encodeURIComponent(domain)}`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0', 'Accept': 'application/json' }, signal: AbortSignal.timeout(12_000) }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()

        const w = d.whois || d
        const registrar   = w.registrar || w.Registrar || 'N/A'
        const created     = w.creation_date || w.created_date || w.CreatedDate || 'N/A'
        const updated     = w.updated_date || w.UpdatedDate || 'N/A'
        const expires     = w.expiration_date || w.ExpirationDate || 'N/A'
        const status      = Array.isArray(w.status) ? w.status.slice(0, 2).join(', ') : (w.status || 'N/A')
        const nameservers = Array.isArray(w.name_servers) ? w.name_servers.slice(0, 4) : []
        const registrant  = w.registrant_name || w.registrant?.name || w.RegistrantName || 'Private'
        const emails      = Array.isArray(w.emails) ? w.emails[0] : (w.emails || 'Private')

        const fmtDate = (d) => {
          if (!d || d === 'N/A') return 'N/A'
          try { return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) }
          catch { return String(d).slice(0, 10) }
        }

        const text = [
          `🔎 *WHOIS: ${domain}*`,
          DIVIDER, ``,
          `👤 Registrant: *${registrant}*`,
          `📧 Email:      *${emails}*`,
          `🏢 Registrar:  *${registrar}*`,
          `📅 Created:    *${fmtDate(created)}*`,
          `🔄 Updated:    *${fmtDate(updated)}*`,
          `⏳ Expires:    *${fmtDate(expires)}*`,
          `📋 Status:     *${status}*`,
          nameservers.length ? `\n🖥️  Nameservers:\n${nameservers.map(ns => `• ${ns}`).join('\n')}` : '',
          ``,
          `_Powered by whoisjson.com_`
        ].filter(Boolean).join('\n')

        await sock.sendMessage(ctx.from, { edit: ph.key, text })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: `❌ WHOIS failed: ${err.message}\n\n_Try: ${ctx.prefix}whois google.com_`
        })
      }
    }
  },

  // ── .dnslookup ────────────────────────────────────────────────────────────
  {
    command: 'dnslookup',
    aliases: ['dns', 'dnscheck'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const domain = ctx.query?.trim()?.split(' ')[0]?.replace(/https?:\/\//i, '').split('/')[0]
      if (!domain) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}dnslookup <domain>\n\n*Example:* ${ctx.prefix}dnslookup google.com`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🔍 DNS lookup for _${domain}_...` }, { quoted: msg })

      try {
        // Cloudflare DNS-over-HTTPS — completely free, always up
        const types = ['A', 'AAAA', 'MX', 'NS', 'TXT']
        const results = await Promise.all(
          types.map(t => fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${t}`, {
            headers: { 'Accept': 'application/dns-json', 'User-Agent': 'FirekidXMD/1.0' },
            signal: AbortSignal.timeout(8_000)
          }).then(r => r.json()).catch(() => null))
        )

        const lines = [`🔍 *DNS: ${domain}*`, DIVIDER, ``]

        types.forEach((type, i) => {
          const data = results[i]
          const answers = data?.Answer?.filter(a => a.type)
          if (answers?.length) {
            lines.push(`*${type}:*`)
            answers.slice(0, 3).forEach(a => lines.push(`  • ${a.data}`))
            lines.push(``)
          }
        })

        if (lines.length <= 3) lines.push('No DNS records found.')

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ DNS lookup failed: ${err.message}` })
      }
    }
  },
]
