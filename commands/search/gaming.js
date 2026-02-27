// commands/search/gaming.js
// Gaming profile lookups + GitHub profile + downloadrepo
//
// APIs used (all free):
//   playerdb.co        — Minecraft, Xbox, Steam (no key needed)
//   users.roblox.com   — Roblox (no key needed)
//   api.github.com     — GitHub (no key needed, higher rate with GITHUB_TOKEN)
//   api.chess.com      — Chess.com (no key needed)
//   fortnite-api.com   — Fortnite (free key from dash.fortnite-api.com → env FORTNITE_API_KEY)
//   api.henrikdev.xyz  — Valorant (free key from henrikdev.xyz → env HENRIK_API_KEY)
//   psnprofiles.com    — PSN (scrape, no key needed)

const D = '─'.repeat(28)
const n = (v) => (v ?? 'N/A').toLocaleString()
const timeAgo = (date) => {
  if (!date) return 'N/A'
  const secs = Math.floor((Date.now() - new Date(date)) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

const GET = (url, headers = {}) =>
  fetch(url, { headers: { 'User-Agent': 'FirekidXMD/2.0', ...headers }, signal: AbortSignal.timeout(12_000) })

export default [

  // ── .minecraft ──────────────────────────────────────────────────────────────
  {
    command: 'minecraft',
    aliases: ['mc'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.query?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `⛏️ *Usage:* ${ctx.prefix}minecraft <username>\n*Example:* ${ctx.prefix}minecraft Notch`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `⛏️ Looking up *${username}* on Minecraft...` }, { quoted: msg })
      try {
        const r = await GET(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`)
        const d = await r.json()
        if (!d.success) throw new Error(d.code || 'Player not found')

        const p = d.data.player
        const skin = `https://crafatar.com/renders/body/${p.id}?overlay`

        await sock.sendMessage(ctx.from, {
          image: { url: skin },
          caption: [
            `⛏️ *Minecraft Profile*`,
            D,
            `👤 Username: *${p.username}*`,
            `🆔 UUID: \`${p.id}\``,
            `🔗 NameMC: https://namemc.com/profile/${p.username}`,
            ``,
            `_Powered by playerdb.co_`,
          ].join('\n'),
        }, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Minecraft lookup failed: ${e.message}` })
      }
    }
  },

  // ── .xbox ────────────────────────────────────────────────────────────────────
  {
    command: 'xbox',
    aliases: ['xbl', 'xboxlive'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.query?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `🎮 *Usage:* ${ctx.prefix}xbox <gamertag>\n*Example:* ${ctx.prefix}xbox Major Nelson`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🎮 Looking up *${username}* on Xbox...` }, { quoted: msg })
      try {
        const r = await GET(`https://playerdb.co/api/player/xbox/${encodeURIComponent(username)}`)
        const d = await r.json()
        if (!d.success) throw new Error(d.code || 'Gamertag not found')

        const p = d.data.player
        const meta = p.meta || {}

        const lines = [
          `🎮 *Xbox Profile*`,
          D,
          `👤 Gamertag: *${p.username}*`,
          `🆔 XUID: \`${p.id}\``,
        ]
        if (meta.gamerscore !== undefined) lines.push(`🏆 Gamerscore: *${n(meta.gamerscore)}*`)
        if (meta.accountTier) lines.push(`🎖️ Tier: *${meta.accountTier}*`)
        if (meta.xboxOneRep) lines.push(`⭐ Reputation: *${meta.xboxOneRep}*`)
        if (meta.gamerPicture) lines.push(`🖼️ Avatar: ${meta.gamerPicture}`)
        lines.push('', `_Powered by playerdb.co_`)

        const msgContent = meta.gamerPicture
          ? { image: { url: meta.gamerPicture }, caption: lines.join('\n') }
          : { text: lines.join('\n') }

        await sock.sendMessage(ctx.from, msgContent, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Xbox lookup failed: ${e.message}` })
      }
    }
  },

  // ── .steam ───────────────────────────────────────────────────────────────────
  {
    command: 'steam',
    aliases: ['steamprofile'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const input = ctx.query?.trim()
      if (!input) return sock.sendMessage(ctx.from, {
        text: `🎮 *Usage:* ${ctx.prefix}steam <vanity URL or SteamID64>\n*Example:* ${ctx.prefix}steam gaben`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🎮 Looking up *${input}* on Steam...` }, { quoted: msg })
      try {
        // Try resolving vanity URL via the community XML endpoint
        let steamId = input
        if (!/^\d{17}$/.test(input)) {
          const xmlRes = await GET(`https://steamcommunity.com/id/${encodeURIComponent(input)}/?xml=1`)
          const xml = await xmlRes.text()
          const match = xml.match(/<steamID64>(\d+)<\/steamID64>/)
          if (!match) throw new Error('Could not resolve vanity URL — try using your SteamID64 instead')
          steamId = match[1]
        }

        const r = await GET(`https://playerdb.co/api/player/steam/${steamId}`)
        const d = await r.json()
        if (!d.success) throw new Error(d.code || 'Profile not found')

        const p = d.data.player
        const meta = p.meta || {}

        const lines = [
          `🎮 *Steam Profile*`,
          D,
          `👤 Name: *${p.username}*`,
          `🆔 SteamID64: \`${p.id}\``,
          `🌍 Country: *${meta.countryCode || 'Hidden'}*`,
          `📊 Profile State: *${meta.profileState === 1 ? 'Public' : 'Private'}*`,
        ]
        if (meta.lastLogOff) lines.push(`🕐 Last Online: *${timeAgo(meta.lastLogOff * 1000)}*`)
        lines.push(`🔗 Profile: https://steamcommunity.com/profiles/${p.id}`)
        lines.push('', `_Powered by playerdb.co_`)

        const avatar = meta.avatarfull || meta.avatarmedium
        const msgContent = avatar
          ? { image: { url: avatar }, caption: lines.join('\n') }
          : { text: lines.join('\n') }

        await sock.sendMessage(ctx.from, msgContent, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Steam lookup failed: ${e.message}` })
      }
    }
  },

  // ── .roblox ──────────────────────────────────────────────────────────────────
  {
    command: 'roblox',
    aliases: ['rbx'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.query?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `🎮 *Usage:* ${ctx.prefix}roblox <username>\n*Example:* ${ctx.prefix}roblox Builderman`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🎮 Looking up *${username}* on Roblox...` }, { quoted: msg })
      try {
        // Step 1: username → userId
        const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'FirekidXMD/2.0' },
          body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
          signal: AbortSignal.timeout(12_000),
        })
        const userData = await userRes.json()
        const user = userData.data?.[0]
        if (!user) throw new Error('User not found')

        const uid = user.id

        // Step 2: fetch full profile
        const [profileRes, followersRes, followingRes, friendsRes] = await Promise.allSettled([
          GET(`https://users.roblox.com/v1/users/${uid}`),
          GET(`https://friends.roblox.com/v1/users/${uid}/followers/count`),
          GET(`https://friends.roblox.com/v1/users/${uid}/followings/count`),
          GET(`https://friends.roblox.com/v1/users/${uid}/friends/count`),
        ])

        const profile = profileRes.status === 'fulfilled' ? await profileRes.value.json() : {}
        const followers = followersRes.status === 'fulfilled' ? (await followersRes.value.json()).count : '?'
        const following = followingRes.status === 'fulfilled' ? (await followingRes.value.json()).count : '?'
        const friends = friendsRes.status === 'fulfilled' ? (await friendsRes.value.json()).count : '?'

        const avatar = `https://www.roblox.com/headshot-thumbnail/image?userId=${uid}&width=420&height=420&format=png`

        const lines = [
          `🎮 *Roblox Profile*`,
          D,
          `👤 Username: *${profile.name || username}*`,
          `📛 Display Name: *${profile.displayName || 'N/A'}*`,
          `🆔 User ID: \`${uid}\``,
          `📅 Joined: *${profile.created ? new Date(profile.created).toLocaleDateString() : 'N/A'}*`,
          `👥 Friends: *${n(friends)}*`,
          `📣 Followers: *${n(followers)}*`,
          `👀 Following: *${n(following)}*`,
          profile.description ? `\n📝 Bio: _${profile.description.slice(0, 100).replace(/\n/g, ' ')}_` : '',
          ``,
          `🔗 Profile: https://www.roblox.com/users/${uid}/profile`,
          `_Powered by Roblox API_`,
        ].filter(Boolean)

        await sock.sendMessage(ctx.from, {
          image: { url: avatar },
          caption: lines.join('\n'),
        }, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Roblox lookup failed: ${e.message}` })
      }
    }
  },

  // ── .psn ─────────────────────────────────────────────────────────────────────
  {
    command: 'psn',
    aliases: ['playstation'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.query?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `🎮 *Usage:* ${ctx.prefix}psn <PSN ID>\n*Example:* ${ctx.prefix}psn Ninja`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🎮 Looking up *${username}* on PSN...` }, { quoted: msg })
      try {
        const r = await GET(`https://psnprofiles.com/${encodeURIComponent(username)}`, {
          'Accept': 'text/html',
        })
        if (!r.ok) throw new Error(`Profile not found (${r.status})`)
        const html = await r.text()

        const get = (regex, fallback = 'N/A') => {
          const m = html.match(regex)
          return m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').trim() : fallback
        }

        const level    = get(/psnprofiles-trophycount[^>]*>Level (\d+)/) || get(/class="level">(\d+)/)
        const platinum = get(/num-platinum">([\d,]+)/)
        const gold     = get(/num-gold">([\d,]+)/)
        const silver   = get(/num-silver">([\d,]+)/)
        const bronze   = get(/num-bronze">([\d,]+)/)
        const games    = get(/(\d+)\s*Games? Played/)
        const avatar   = (html.match(/src="(https:\/\/[^"]+psnprofiles\.com\/avatars[^"]+)"/) || [])[1]

        const lines = [
          `🎮 *PlayStation Network Profile*`,
          D,
          `👤 PSN ID: *${username}*`,
          `🏆 Level: *${level}*`,
          ``,
          `🏅 *Trophies*`,
          `   🥇 Platinum: *${platinum}*`,
          `   🥇 Gold: *${gold}*`,
          `   🥈 Silver: *${silver}*`,
          `   🥉 Bronze: *${bronze}*`,
          ``,
          `🎮 Games Played: *${games}*`,
          ``,
          `🔗 Profile: https://psnprofiles.com/${encodeURIComponent(username)}`,
          `_Powered by PSNProfiles_`,
        ]

        const msgContent = avatar
          ? { image: { url: avatar }, caption: lines.join('\n') }
          : { text: lines.join('\n') }

        await sock.sendMessage(ctx.from, msgContent, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ PSN lookup failed: ${e.message}` })
      }
    }
  },

  // ── .fortnite ────────────────────────────────────────────────────────────────
  {
    command: 'fortnite',
    aliases: ['fn'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.query?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `🎮 *Usage:* ${ctx.prefix}fortnite <username>\n*Example:* ${ctx.prefix}fortnite Ninja\n\n_Requires FORTNITE_API_KEY env variable (free at dash.fortnite-api.com)_`
      }, { quoted: msg })

      const key = process.env.FORTNITE_API_KEY
      if (!key) return sock.sendMessage(ctx.from, {
        text: `❌ *FORTNITE_API_KEY* is not set.\n\nGet a free key at: https://dash.fortnite-api.com\nThen add it to your .env file.`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🎮 Fetching *${username}'s* Fortnite stats...` }, { quoted: msg })
      try {
        const r = await GET(
          `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(username)}&timeWindow=lifetime`,
          { Authorization: key }
        )
        const d = await r.json()
        if (d.status !== 200) throw new Error(d.error || 'Player not found or stats are private')

        const s = d.data?.stats?.all?.overall || {}
        const acc = d.data?.account || {}

        const lines = [
          `🎮 *Fortnite Stats*`,
          D,
          `👤 Name: *${acc.name || username}*`,
          ``,
          `🏆 *Lifetime (All Modes)*`,
          `   🥇 Wins: *${n(s.wins)}*`,
          `   🎯 K/D: *${s.kd?.toFixed(2) || 'N/A'}*`,
          `   📊 Win Rate: *${s.winRate?.toFixed(2) || 'N/A'}%*`,
          `   ☠️ Kills: *${n(s.kills)}*`,
          `   🎮 Matches: *${n(s.matches)}*`,
          `   💀 Deaths: *${n(s.deaths)}*`,
          `   🕐 Time Played: *${s.minutesPlayed ? Math.floor(s.minutesPlayed / 60) + 'h' : 'N/A'}*`,
          ``,
          `_Powered by fortnite-api.com_`,
        ]

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Fortnite lookup failed: ${e.message}` })
      }
    }
  },

  // ── .valorant ────────────────────────────────────────────────────────────────
  {
    command: 'valorant',
    aliases: ['val'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const input = ctx.query?.trim()
      if (!input || !input.includes('#')) return sock.sendMessage(ctx.from, {
        text: `🎮 *Usage:* ${ctx.prefix}valorant <name#tag>\n*Example:* ${ctx.prefix}valorant Ninja#NA1\n\n_Requires HENRIK_API_KEY env variable (free at henrikdev.xyz)_`
      }, { quoted: msg })

      const key = process.env.HENRIK_API_KEY
      if (!key) return sock.sendMessage(ctx.from, {
        text: `❌ *HENRIK_API_KEY* is not set.\n\nGet a free key at: https://henrikdev.xyz\nThen add it to your .env file.`
      }, { quoted: msg })

      const [name, tag] = input.split('#')
      const ph = await sock.sendMessage(ctx.from, { text: `🎮 Fetching *${input}'s* Valorant profile...` }, { quoted: msg })
      try {
        const [accountRes, mmrRes] = await Promise.allSettled([
          GET(`https://api.henrikdev.xyz/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, { Authorization: key }),
          GET(`https://api.henrikdev.xyz/valorant/v2/mmr/na/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, { Authorization: key }),
        ])

        const account = accountRes.status === 'fulfilled' ? await accountRes.value.json() : {}
        const mmr     = mmrRes.status === 'fulfilled'     ? await mmrRes.value.json()     : {}

        if (account.status !== 200) throw new Error(account.message || 'Player not found')

        const acc = account.data
        const rank = mmr.data?.current_data

        const lines = [
          `🎮 *Valorant Profile*`,
          D,
          `👤 Name: *${acc.name}#${acc.tag}*`,
          `🌍 Region: *${acc.region?.toUpperCase() || 'N/A'}*`,
          `📊 Account Level: *${n(acc.account_level)}*`,
          ``,
          `🏅 *Ranked*`,
          `   🥇 Rank: *${rank?.currenttierpatched || 'Unranked'}*`,
          `   🔢 RR: *${rank?.ranking_in_tier ?? 'N/A'}*`,
          `   🏆 Peak: *${mmr.data?.highest_rank?.patched_tier || 'N/A'}*`,
          ``,
          `_Powered by HenrikDev API_`,
        ]

        const card = acc.card?.small
        const msgContent = card
          ? { image: { url: card }, caption: lines.join('\n') }
          : { text: lines.join('\n') }

        await sock.sendMessage(ctx.from, msgContent, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Valorant lookup failed: ${e.message}` })
      }
    }
  },

  // ── .chess ───────────────────────────────────────────────────────────────────
  {
    command: 'chess',
    aliases: ['chesscom'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.query?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `♟️ *Usage:* ${ctx.prefix}chess <username>\n*Example:* ${ctx.prefix}chess MagnusCarlsen`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `♟️ Looking up *${username}* on Chess.com...` }, { quoted: msg })
      try {
        const [profileRes, statsRes] = await Promise.all([
          GET(`https://api.chess.com/pub/player/${username.toLowerCase()}`),
          GET(`https://api.chess.com/pub/player/${username.toLowerCase()}/stats`),
        ])

        if (!profileRes.ok) throw new Error('Player not found')

        const p = await profileRes.json()
        const s = await statsRes.json()

        const rating = (mode) => s[mode]?.last?.rating || s[mode]?.best?.rating || 'N/A'
        const wld    = (mode) => {
          const r = s[mode]?.record
          return r ? `${r.win}W/${r.loss}L/${r.draw}D` : 'N/A'
        }

        const lines = [
          `♟️ *Chess.com Profile*`,
          D,
          `👤 Username: *${p.username}*`,
          p.title ? `🏅 Title: *${p.title}*` : '',
          `🌍 Country: *${(p.country || '').split('/').pop() || 'N/A'}*`,
          `📅 Joined: *${p.joined ? new Date(p.joined * 1000).toLocaleDateString() : 'N/A'}*`,
          `🟢 Status: *${p.status || 'N/A'}*`,
          ``,
          `📊 *Ratings*`,
          `   ⚡ Bullet: *${rating('chess_bullet')}* (${wld('chess_bullet')})`,
          `   🔥 Blitz: *${rating('chess_blitz')}* (${wld('chess_blitz')})`,
          `   🎯 Rapid: *${rating('chess_rapid')}* (${wld('chess_rapid')})`,
          ``,
          `🔗 Profile: ${p.url}`,
          `_Powered by Chess.com API_`,
        ].filter(Boolean)

        const msgContent = p.avatar
          ? { image: { url: p.avatar }, caption: lines.join('\n') }
          : { text: lines.join('\n') }

        await sock.sendMessage(ctx.from, msgContent, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Chess.com lookup failed: ${e.message}` })
      }
    }
  },

  // ── .github ──────────────────────────────────────────────────────────────────
  {
    command: 'github',
    aliases: ['gh', 'ghprofile'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const username = ctx.query?.trim()
      if (!username) return sock.sendMessage(ctx.from, {
        text: `🐙 *Usage:* ${ctx.prefix}github <username>\n*Example:* ${ctx.prefix}github torvalds`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🐙 Fetching *${username}'s* GitHub profile...` }, { quoted: msg })
      try {
        const headers = {}
        if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`

        const [userRes, reposRes] = await Promise.all([
          GET(`https://api.github.com/users/${encodeURIComponent(username)}`, headers),
          GET(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=3`, headers),
        ])

        if (!userRes.ok) throw new Error('User not found')
        const u = await userRes.json()
        const repos = reposRes.ok ? await reposRes.json() : []

        const topRepos = repos.slice(0, 3).map(r => `   📦 *${r.name}* — ⭐${r.stargazers_count} (${r.language || 'N/A'})`).join('\n')

        const lines = [
          `🐙 *GitHub Profile*`,
          D,
          `👤 Name: *${u.name || u.login}*`,
          `🔖 Username: @${u.login}`,
          u.bio ? `📝 Bio: _${u.bio.slice(0, 100)}_` : '',
          u.company ? `🏢 Company: *${u.company}*` : '',
          u.location ? `📍 Location: *${u.location}*` : '',
          u.blog ? `🌐 Website: ${u.blog}` : '',
          ``,
          `📊 *Stats*`,
          `   📦 Repos: *${n(u.public_repos)}*`,
          `   👥 Followers: *${n(u.followers)}*`,
          `   👀 Following: *${n(u.following)}*`,
          `   ⭐ Gists: *${n(u.public_gists)}*`,
          `📅 Joined: *${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}*`,
          repos.length ? `\n🌟 *Top Repos*\n${topRepos}` : '',
          ``,
          `🔗 Profile: ${u.html_url}`,
          `_Powered by GitHub API_`,
        ].filter(Boolean)

        await sock.sendMessage(ctx.from, {
          image: { url: u.avatar_url },
          caption: lines.join('\n'),
        }, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ GitHub lookup failed: ${e.message}` })
      }
    }
  },

  // ── .downloadrepo ────────────────────────────────────────────────────────────
  {
    command: 'downloadrepo',
    aliases: ['dlrepo', 'gitdownload', 'ghdownload'],
    category: 'search',
    handler: async (sock, msg, ctx) => {
      const input = ctx.query?.trim()
      if (!input) return sock.sendMessage(ctx.from, {
        text: [
          `📦 *Download GitHub Repo as ZIP*`,
          `${'─'.repeat(28)}`,
          `*Usage:* ${ctx.prefix}downloadrepo <github URL or owner/repo>`,
          ``,
          `*Examples:*`,
          `• ${ctx.prefix}downloadrepo https://github.com/WhiskeySockets/Baileys`,
          `• ${ctx.prefix}downloadrepo torvalds/linux`,
        ].join('\n')
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `📦 Fetching repo info...` }, { quoted: msg })
      try {
        // Parse input — accept full URL or owner/repo
        let owner, repo
        const urlMatch   = input.match(/github\.com\/([^/]+)\/([^/\s?#]+)/)
        const shortMatch = input.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)

        if (urlMatch)      { owner = urlMatch[1];  repo = urlMatch[2].replace(/\.git$/, '') }
        else if (shortMatch) { owner = shortMatch[1]; repo = shortMatch[2] }
        else throw new Error('Invalid format. Use a GitHub URL or `owner/repo`')

        const headers = { 'User-Agent': 'FirekidXMD/2.0' }
        if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`

        await sock.sendMessage(ctx.from, { edit: ph.key, text: `📦 Getting repo info for *${owner}/${repo}*...` })

        // Get repo info to find default branch + size
        const infoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers,
          signal: AbortSignal.timeout(15_000),
        })
        if (infoRes.status === 404) throw new Error(`Repo not found: *${owner}/${repo}*\n\nCheck the URL and make sure it's a public repo.`)
        if (!infoRes.ok) throw new Error(`GitHub API error (${infoRes.status})`)

        const info   = await infoRes.json()
        const sizeMB = (info.size / 1024).toFixed(1)
        if (info.size > 100_000) throw new Error(`Repo is too large (${sizeMB}MB). WhatsApp max is ~64MB. Try a smaller repo.`)

        const branch = info.default_branch || 'main'
        const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`

        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: `📦 Downloading *${owner}/${repo}* (~${sizeMB}MB)...\n_This may take a moment_`
        })

        // codeload.github.com serves direct ZIP — no redirect needed unlike github.com/archive
        const zipRes = await fetch(zipUrl, {
          headers,
          redirect: 'follow',
          signal: AbortSignal.timeout(90_000),
        })

        if (!zipRes.ok) throw new Error(`ZIP download failed (HTTP ${zipRes.status})`)

        const buf = Buffer.from(await zipRes.arrayBuffer())
        if (buf.length < 100) throw new Error('Downloaded file is empty — repo may be empty or access denied')

        const actualMB  = (buf.length / 1024 / 1024).toFixed(1)
        const fileName  = `${repo}-${branch}.zip`

        await sock.sendMessage(ctx.from, {
          document: buf,
          mimetype: 'application/zip',
          fileName,
          caption: [
            `📦 *${owner}/${repo}*`,
            `${'─'.repeat(28)}`,
            `📝 ${info.description || 'No description'}`,
            `⭐ Stars: *${info.stargazers_count?.toLocaleString()}*`,
            `🍴 Forks: *${info.forks_count?.toLocaleString()}*`,
            `💻 Language: *${info.language || 'N/A'}*`,
            `🌿 Branch: *${branch}*`,
            `📏 Size: *${actualMB}MB*`,
            ``,
            `🔗 ${info.html_url}`,
          ].join('\n'),
        }, { quoted: msg })

        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Download failed: ${e.message}` })
      }
    }
  },
]
