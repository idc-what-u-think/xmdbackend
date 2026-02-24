// commands/search/lookup1.js
// Google search, Wikipedia, Dictionary, News, Weather
// All free endpoints — no API keys needed

const DIVIDER = '─'.repeat(28)

export default [

  // ── .google ───────────────────────────────────────────────────────────────
  {
    command: 'google',
    aliases: ['search', 'gsearch', 'googlesearch'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}google <query>\n\n*Example:* ${ctx.prefix}google latest AI news`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🔍 Searching Google...` }, { quoted: msg })

      try {
        // DuckDuckGo instant answers API (free, no key, privacy-safe)
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        const data = await res.json()

        const lines = [
          `🔍 *Google Search: ${query}*`,
          DIVIDER, ``,
        ]

        if (data.AbstractText) {
          lines.push(`📖 *Summary:*`, data.AbstractText)
          if (data.AbstractSource) lines.push(`\n🔗 Source: _${data.AbstractSource}_`)
          lines.push(``)
        }

        // Related topics
        const topics = (data.RelatedTopics || []).slice(0, 5)
        if (topics.length) {
          lines.push(`📌 *Related:*`)
          for (const t of topics) {
            if (t.Text) lines.push(`• ${t.Text.slice(0, 120)}`)
          }
          lines.push(``)
        }

        // Infobox
        if (data.Infobox?.content?.length) {
          lines.push(`ℹ️ *Info:*`)
          data.Infobox.content.slice(0, 4).forEach(c => {
            if (c.label && c.value) lines.push(`• *${c.label}:* ${String(c.value).slice(0, 80)}`)
          })
          lines.push(``)
        }

        if (lines.length <= 3) {
          lines.push(`No instant results found for: _${query}_`, ``, `Try: https://www.google.com/search?q=${encodeURIComponent(query)}`)
        } else {
          lines.push(`🌐 _Full results: https://www.google.com/search?q=${encodeURIComponent(query)}_`)
        }

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Search failed: ${err.message}` })
      }
    }
  },

  // ── .wiki ─────────────────────────────────────────────────────────────────
  {
    command: 'wiki',
    aliases: ['wikipedia', 'wikisearch', 'wp'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}wiki <topic>\n\n*Example:* ${ctx.prefix}wiki Elon Musk`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `📖 Searching Wikipedia...` }, { quoted: msg })

      try {
        // Wikipedia REST API — free, no key
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=search&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1`,
          { signal: AbortSignal.timeout(10_000) }
        )
        const searchData = await searchRes.json()
        const title = searchData?.query?.search?.[0]?.title
        if (!title) throw new Error('No results found')

        const summaryRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { signal: AbortSignal.timeout(10_000) }
        )
        const data = await summaryRes.json()

        const text = [
          `📖 *${data.title}*`,
          DIVIDER, ``,
          data.extract || 'No summary available.', ``,
          `🔗 ${data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`}`
        ].join('\n')

        await sock.sendMessage(ctx.from, { edit: ph.key, text })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Wikipedia search failed: ${err.message}` })
      }
    }
  },

  // ── .define ───────────────────────────────────────────────────────────────
  {
    command: 'define',
    aliases: ['definition', 'dict', 'dictionary', 'meaning'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const word = ctx.query?.trim()?.split(' ')[0]
      if (!word) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}define <word>\n\n*Example:* ${ctx.prefix}define serendipity`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `📚 Looking up _${word}_...` }, { quoted: msg })

      try {
        // Free Dictionary API — no key needed
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
          { signal: AbortSignal.timeout(10_000) }
        )
        if (!res.ok) throw new Error(`Word not found: ${word}`)
        const [entry] = await res.json()

        const lines = [
          `📚 *${entry.word}*`,
          DIVIDER,
        ]

        if (entry.phonetics?.[0]?.text) lines.push(`🔤 Pronunciation: _${entry.phonetics[0].text}_`)
        lines.push(``)

        for (const meaning of (entry.meanings || []).slice(0, 3)) {
          lines.push(`*${meaning.partOfSpeech}*`)
          for (const def of (meaning.definitions || []).slice(0, 2)) {
            lines.push(`• ${def.definition}`)
            if (def.example) lines.push(`  _"${def.example}"_`)
          }
          if (meaning.synonyms?.length) lines.push(`  Synonyms: ${meaning.synonyms.slice(0, 4).join(', ')}`)
          lines.push(``)
        }

        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Definition not found for: _${word}_\n\n_Check spelling or try a simpler form_` })
      }
    }
  },

  // ── .news ─────────────────────────────────────────────────────────────────
  {
    command: 'news',
    aliases: ['latestnews', 'headlines', 'breakingnews'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim() || 'Nigeria'

      const ph = await sock.sendMessage(ctx.from, { text: `📰 Fetching news about _${query}_...` }, { quoted: msg })

      try {
        // GNews API — free tier 100 req/day, no key needed for RSS
        // Using BBC RSS as primary (always free)
        const rssUrl = query.toLowerCase() === 'nigeria' || query.toLowerCase() === 'naija'
          ? `https://feeds.bbci.co.uk/news/world/africa/rss.xml`
          : `https://feeds.bbci.co.uk/news/rss.xml?edition=int`

        const res = await fetch(rssUrl, {
          headers: { 'User-Agent': 'FirekidXMD/1.0 RSS Reader', 'Accept': 'application/rss+xml, application/xml' },
          signal: AbortSignal.timeout(12_000)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const xml = await res.text()

        // Parse RSS items with regex (no xml parser needed)
        const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].slice(0, 8)
        if (!items.length) throw new Error('No news items in feed')

        const lines = [`📰 *Latest News: ${query}*`, DIVIDER, ``]

        for (const [i, item] of items.entries()) {
          const title = item[0].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] || item[0].match(/<title>(.*?)<\/title>/)?.[1] || 'No title'
          const pubDate = item[0].match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
          const link = item[0].match(/<link>(.*?)<\/link>|<link[^>]*\/>/)?.[1] || ''
          const cleanTitle = title.replace(/<[^>]+>/g, '').trim()
          const cleanDate = pubDate ? new Date(pubDate).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

          lines.push(`*${i + 1}.* ${cleanTitle}`)
          if (cleanDate) lines.push(`   _${cleanDate}_`)
          lines.push(``)
        }

        lines.push(`_Powered by BBC News RSS_`)
        await sock.sendMessage(ctx.from, { edit: ph.key, text: lines.join('\n') })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ News fetch failed: ${err.message}` })
      }
    }
  },

  // ── .weather ──────────────────────────────────────────────────────────────
  {
    command: 'weather',
    aliases: ['wx', 'forecast', 'climate'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const city = ctx.query?.trim() || 'Lagos'
      const ph = await sock.sendMessage(ctx.from, { text: `🌤️ Getting weather for _${city}_...` }, { quoted: msg })

      try {
        // wttr.in — completely free, no auth, JSON format
        const res = await fetch(
          `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        if (!res.ok) throw new Error(`City not found: ${city}`)
        const data = await res.json()

        const cur = data.current_condition?.[0]
        const nearest = data.nearest_area?.[0]
        const areaName = nearest?.areaName?.[0]?.value || city
        const country = nearest?.country?.[0]?.value || ''
        const weather = cur?.weatherDesc?.[0]?.value || 'Unknown'
        const tempC = cur?.temp_C || '?'
        const feelsLike = cur?.FeelsLikeC || '?'
        const humidity = cur?.humidity || '?'
        const windKmph = cur?.windspeedKmph || '?'
        const windDir = cur?.winddir16Point || '?'
        const visibility = cur?.visibility || '?'
        const uvIndex = cur?.uvIndex || '?'
        const cloudcover = cur?.cloudcover || '?'

        // Emoji for condition
        const condLower = weather.toLowerCase()
        const icon = condLower.includes('sun') || condLower.includes('clear') ? '☀️'
          : condLower.includes('cloud') ? '☁️'
          : condLower.includes('rain') ? '🌧️'
          : condLower.includes('thunder') ? '⛈️'
          : condLower.includes('snow') ? '❄️'
          : condLower.includes('fog') || condLower.includes('mist') ? '🌫️'
          : condLower.includes('wind') ? '💨' : '🌡️'

        // Tomorrow forecast
        const tomorrow = data.weather?.[1]
        const tmwMaxC = tomorrow?.maxtempC || '?'
        const tmwMinC = tomorrow?.mintempC || '?'
        const tmwDesc = tomorrow?.hourly?.[4]?.weatherDesc?.[0]?.value || 'N/A'

        const text = [
          `${icon} *Weather: ${areaName}${country ? ', ' + country : ''}*`,
          DIVIDER, ``,
          `🌡️ Temperature:  *${tempC}°C* (Feels ${feelsLike}°C)`,
          `⛅ Condition:    *${weather}*`,
          `💧 Humidity:    *${humidity}%*`,
          `💨 Wind:        *${windKmph} km/h ${windDir}*`,
          `👁️  Visibility:  *${visibility} km*`,
          `☁️  Cloud Cover: *${cloudcover}%*`,
          `🔆 UV Index:    *${uvIndex}*`,
          ``,
          `📅 *Tomorrow:* ${tmwDesc}`,
          `   High: *${tmwMaxC}°C* | Low: *${tmwMinC}°C*`,
          ``,
          `_Powered by wttr.in_`
        ].join('\n')

        await sock.sendMessage(ctx.from, { edit: ph.key, text })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Weather fetch failed: ${err.message}\n\n_Try a major city name, e.g. Lagos, London, New York_` })
      }
    }
  },

  // ── .image (image search) ─────────────────────────────────────────────────
  {
    command: 'imgsearch',
    aliases: ['imagesearch', 'imgs', 'searchimage'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}imgsearch <query>\n\n*Example:* ${ctx.prefix}imgsearch sunset beach`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🖼️ Searching images for _${query}_...` }, { quoted: msg })

      try {
        // Use Pollinations to generate an image based on the query (instant, free)
        const prompt = encodeURIComponent(query)
        const seed = Math.floor(Math.random() * 9999)
        const imgUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=768&seed=${seed}&nologo=true`
        const res = await fetch(imgUrl, {
          headers: { 'User-Agent': 'FirekidXMD/1.0' },
          signal: AbortSignal.timeout(45_000)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        await sock.sendMessage(ctx.from, { delete: ph.key })
        await sock.sendMessage(ctx.from, {
          image: buf,
          caption: `🖼️ *Image Result: ${query}*\n_Generated by AI (Pollinations) 🔥_`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Image search failed: ${err.message}` })
      }
    }
  },
]
