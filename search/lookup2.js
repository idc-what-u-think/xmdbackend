// commands/search/lookup2.js
// IMDB, Lyrics, GSMArena phone specs, YouTube search, Bing search

const DIVIDER = '─'.repeat(28)

export default [

  // ── .imdb ─────────────────────────────────────────────────────────────────
  {
    command: 'imdb',
    aliases: ['movie', 'film', 'movieinfo', 'series'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}imdb <movie or series name>\n\n*Example:* ${ctx.prefix}imdb Breaking Bad`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🎬 Searching IMDB for _${query}_...` }, { quoted: msg })

      try {
        // OMDb API — free tier, no key needed for first 1000/day
        // We use the public open endpoint
        const omdbKey = process.env.OMDB_API_KEY || 'trilogy'  // free fallback key
        const res = await fetch(
          `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${omdbKey}&type=movie`,
          { signal: AbortSignal.timeout(10_000) }
        )
        const data = await res.json()

        if (data.Response === 'False' || !data.Search?.length) {
          // Try series
          const res2 = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${omdbKey}&type=series`, { signal: AbortSignal.timeout(10_000) })
          const data2 = await res2.json()
          if (data2.Response === 'False' || !data2.Search?.length) throw new Error('Not found on IMDB')

          const first = data2.Search[0]
          const detail = await fetch(`https://www.omdbapi.com/?i=${first.imdbID}&apikey=${omdbKey}&plot=short`, { signal: AbortSignal.timeout(10_000) })
          const d = await detail.json()

          const text = buildIMDBText(d)
          await sock.sendMessage(ctx.from, { delete: ph.key })
          if (d.Poster && d.Poster !== 'N/A') {
            await sock.sendMessage(ctx.from, {
              image: { url: d.Poster },
              caption: text
            }, { quoted: msg })
          } else {
            await sock.sendMessage(ctx.from, { text }, { quoted: msg })
          }
          return
        }

        const first = data.Search[0]
        const detail = await fetch(`https://www.omdbapi.com/?i=${first.imdbID}&apikey=${omdbKey}&plot=short`, { signal: AbortSignal.timeout(10_000) })
        const d = await detail.json()

        const text = buildIMDBText(d)
        await sock.sendMessage(ctx.from, { delete: ph.key })
        if (d.Poster && d.Poster !== 'N/A') {
          await sock.sendMessage(ctx.from, {
            image: { url: d.Poster },
            caption: text
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, { text }, { quoted: msg })
        }
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ IMDB search failed: ${err.message}` })
      }
    }
  },

  // ── .lyrics ───────────────────────────────────────────────────────────────
  {
    command: 'lyrics',
    aliases: ['lyric', 'songlyrics', 'getlyrics'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}lyrics <song name> [- artist]\n\n*Example:* ${ctx.prefix}lyrics Essence - Wizkid`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🎵 Searching lyrics for _${query}_...` }, { quoted: msg })

      try {
        // Lyrics.ovh — completely free, no key
        let artist = '', title = query
        if (query.includes(' - ')) {
          const parts = query.split(' - ')
          title = parts[0].trim()
          artist = parts[1].trim()
        }

        let lyricsText, songTitle, songArtist

        if (artist) {
          const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(10_000) })
          if (r.ok) {
            const d = await r.json()
            lyricsText = d.lyrics
            songTitle = title
            songArtist = artist
          }
        }

        if (!lyricsText) {
          // Search first
          const sr = await fetch(`https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10_000) })
          const sd = await sr.json()
          const top = sd?.data?.[0]
          if (!top) throw new Error('Song not found')

          songTitle  = top.title
          songArtist = top.artist?.name || 'Unknown'

          const lr = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(songArtist)}/${encodeURIComponent(songTitle)}`, { signal: AbortSignal.timeout(10_000) })
          if (!lr.ok) throw new Error('Lyrics not available for this song')
          const ld = await lr.json()
          lyricsText = ld.lyrics
        }

        if (!lyricsText) throw new Error('No lyrics found')

        const maxLen = 3000
        const truncated = lyricsText.length > maxLen
        const display = truncated ? lyricsText.slice(0, maxLen) + '\n\n_... (lyrics truncated)_' : lyricsText

        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: [
            `🎵 *${songTitle}*`,
            `👤 ${songArtist}`,
            DIVIDER, ``,
            display
          ].join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Lyrics not found: ${err.message}` })
      }
    }
  },

  // ── .gsmarena ─────────────────────────────────────────────────────────────
  {
    command: 'gsmarena',
    aliases: ['phonespec', 'phonespecs', 'specs', 'phoneinfo', 'deviceinfo'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}gsmarena <phone name>\n\n*Example:* ${ctx.prefix}gsmarena iPhone 15 Pro`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `📱 Looking up _${query}_...` }, { quoted: msg })

      try {
        // GSMArena unofficial scrape via a free proxy API
        const res = await fetch(
          `https://gsmarena-api.cyclic.app/search?query=${encodeURIComponent(query)}`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(12_000) }
        )

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const devices = Array.isArray(data) ? data : data.devices || data.results || []

        if (!devices.length) throw new Error(`No results found for: ${query}`)

        const device = devices[0]
        const name = device.name || device.deviceName || query
        const url = device.url || device.link || `https://www.gsmarena.com/search.php3?sQuickSearch=${encodeURIComponent(query)}`

        // Try to get full specs
        let text = [
          `📱 *${name}*`,
          DIVIDER, ``,
        ]

        const specs = device.specs || device.details || {}
        if (specs.network || device.network)     text.push(`📶 Network: ${specs.network || device.network}`)
        if (specs.display || device.display)     text.push(`🖥️  Display: ${specs.display || device.display}`)
        if (specs.chipset || device.chipset)     text.push(`⚡ Chipset: ${specs.chipset || device.chipset}`)
        if (specs.ram || device.ram)             text.push(`💾 RAM: ${specs.ram || device.ram}`)
        if (specs.storage || device.storage)     text.push(`📦 Storage: ${specs.storage || device.storage}`)
        if (specs.camera || device.camera)       text.push(`📷 Camera: ${specs.camera || device.camera}`)
        if (specs.battery || device.battery)     text.push(`🔋 Battery: ${specs.battery || device.battery}`)
        if (specs.os || device.os)               text.push(`💻 OS: ${specs.os || device.os}`)

        text.push(``, `🔗 ${url}`)

        await sock.sendMessage(ctx.from, { edit: ph.key, text: text.join('\n') })
      } catch (err) {
        // Fallback: send a DuckDuckGo search link
        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: [
            `📱 *${query} Specs*`,
            DIVIDER, ``,
            `Could not fetch specs automatically.`,
            ``,
            `🔗 Search GSMArena:`,
            `https://www.gsmarena.com/search.php3?sQuickSearch=${encodeURIComponent(query)}`
          ].join('\n')
        })
      }
    }
  },

  // ── .youtube (search) ─────────────────────────────────────────────────────
  {
    command: 'ytsearch',
    aliases: ['youtubesearch', 'ytfind', 'yts'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}ytsearch <query>\n\n*Example:* ${ctx.prefix}ytsearch Burna Boy 2025 concert`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `▶️ Searching YouTube for _${query}_...` }, { quoted: msg })

      try {
        // YouTube scrape via Invidious (free, no auth) - open source YouTube frontend
        const instances = [
          'https://invidious.slipfox.xyz',
          'https://invidious.privacyredirect.com',
          'https://inv.nadeko.net',
        ]

        let results = null
        for (const instance of instances) {
          try {
            const r = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=title,videoId,author,lengthSeconds,viewCount`, {
              headers: { 'User-Agent': 'FirekidXMD/1.0' },
              signal: AbortSignal.timeout(8_000)
            })
            if (r.ok) { results = await r.json(); break }
          } catch {}
        }

        if (!results?.length) throw new Error('No results found')

        const lines = [`▶️ *YouTube: ${query}*`, DIVIDER, ``]
        for (const [i, v] of results.slice(0, 6).entries()) {
          const dur = v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${String(v.lengthSeconds % 60).padStart(2, '0')}` : 'LIVE'
          const views = v.viewCount ? Number(v.viewCount).toLocaleString() : '?'
          lines.push(`*${i + 1}.* ${v.title || 'Unknown'}`)
          lines.push(`   👤 ${v.author || '?'} | ⏱ ${dur} | 👁 ${views}`)
          lines.push(`   🔗 https://youtu.be/${v.videoId}`)
          lines.push(``)
        }

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ YouTube search failed: ${err.message}` })
      }
    }
  },

  // ── .bing ─────────────────────────────────────────────────────────────────
  {
    command: 'bing',
    aliases: ['bingsearch', 'msearch'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}bing <query>`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🔍 Bing searching _${query}_...` }, { quoted: msg })

      try {
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        const data = await res.json()

        const lines = [`🔍 *Bing: ${query}*`, DIVIDER, ``]
        if (data.AbstractText) lines.push(data.AbstractText, ``)
        const topics = (data.RelatedTopics || []).slice(0, 6)
        for (const t of topics) {
          if (t.Text) lines.push(`• ${t.Text.slice(0, 120)}`)
        }
        if (lines.length <= 3) lines.push(`No results. Try: https://www.bing.com/search?q=${encodeURIComponent(query)}`)

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Search failed: ${err.message}` })
      }
    }
  },
]

// ── IMDB text builder ────────────────────────────────────────────────────────
function buildIMDBText(d) {
  const lines = [
    `🎬 *${d.Title}* (${d.Year})`,
    DIVIDER, ``,
    `📋 *Type:* ${d.Type?.toUpperCase() || 'N/A'}`,
    `⭐ *Rating:* ${d.imdbRating || 'N/A'} / 10 (${d.imdbVotes || 'N/A'} votes)`,
    `🎭 *Genre:* ${d.Genre || 'N/A'}`,
    `⏱️ *Runtime:* ${d.Runtime || 'N/A'}`,
    `🌍 *Country:* ${d.Country || 'N/A'}`,
    `🗣️ *Language:* ${d.Language || 'N/A'}`,
    `🎬 *Director:* ${d.Director || 'N/A'}`,
    `🌟 *Cast:* ${d.Actors || 'N/A'}`,
    ``,
    `📖 *Plot:*`,
    d.Plot || 'No plot available.', ``,
    `🔗 https://www.imdb.com/title/${d.imdbID}`,
    ``,
    `_Powered by OMDB_`
  ]
  return lines.join('\n')
}
