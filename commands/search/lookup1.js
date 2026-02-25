// commands/search/lookup1.js
// Google search, Wikipedia, Dictionary, News, Weather, Image Search
// Weather: Open-Meteo (free, no key) | ImgSearch: Lexica.art (free, no key)

const DIVIDER = '─'.repeat(28)

// WMO weather code → [emoji, label]
const WMO = {
  0: ['☀️', 'Clear sky'],
  1: ['🌤️', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Foggy'], 48: ['🌫️', 'Icy fog'],
  51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Moderate drizzle'], 55: ['🌧️', 'Dense drizzle'],
  61: ['🌧️', 'Slight rain'], 63: ['🌧️', 'Moderate rain'], 65: ['🌧️', 'Heavy rain'],
  71: ['❄️', 'Slight snow'], 73: ['❄️', 'Moderate snow'], 75: ['❄️', 'Heavy snow'],
  77: ['🌨️', 'Snow grains'],
  80: ['🌦️', 'Slight showers'], 81: ['🌧️', 'Moderate showers'], 82: ['⛈️', 'Violent showers'],
  85: ['🌨️', 'Slight snow showers'], 86: ['❄️', 'Heavy snow showers'],
  95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm w/ hail'], 99: ['⛈️', 'Severe thunderstorm'],
}
const wmo = (code) => WMO[code] || ['🌡️', 'Unknown']
const windDir = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((deg ?? 0) / 45) % 8]

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
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        const data = await res.json()

        const lines = [`🔍 *Google Search: ${query}*`, DIVIDER, ``]

        if (data.AbstractText) {
          lines.push(`📖 *Summary:*`, data.AbstractText)
          if (data.AbstractSource) lines.push(`\n🔗 Source: _${data.AbstractSource}_`)
          lines.push(``)
        }

        const topics = (data.RelatedTopics || []).slice(0, 5)
        if (topics.length) {
          lines.push(`📌 *Related:*`)
          for (const t of topics) {
            if (t.Text) lines.push(`• ${t.Text.slice(0, 120)}`)
          }
          lines.push(``)
        }

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
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
          { signal: AbortSignal.timeout(10_000) }
        )
        if (!res.ok) throw new Error(`Word not found: ${word}`)
        const [entry] = await res.json()

        const lines = [`📚 *${entry.word}*`, DIVIDER]
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
        const rssUrl = query.toLowerCase() === 'nigeria' || query.toLowerCase() === 'naija'
          ? `https://feeds.bbci.co.uk/news/world/africa/rss.xml`
          : `https://feeds.bbci.co.uk/news/rss.xml?edition=int`

        const res = await fetch(rssUrl, {
          headers: { 'User-Agent': 'FirekidXMD/1.0 RSS Reader', 'Accept': 'application/rss+xml, application/xml' },
          signal: AbortSignal.timeout(12_000)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const xml = await res.text()

        const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].slice(0, 8)
        if (!items.length) throw new Error('No news items in feed')

        const lines = [`📰 *Latest News: ${query}*`, DIVIDER, ``]

        for (const [i, item] of items.entries()) {
          const title = item[0].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] || item[0].match(/<title>(.*?)<\/title>/)?.[1] || 'No title'
          const pubDate = item[0].match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
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

  // ── .weather (Open-Meteo — free, no API key needed) ───────────────────────
  {
    command: 'weather',
    aliases: ['wx', 'forecast', 'climate'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const city = ctx.query?.trim() || 'Lagos'
      const ph = await sock.sendMessage(ctx.from, { text: `🌤️ Getting weather for _${city}_...` }, { quoted: msg })

      try {
        // Step 1: Geocode city → coordinates
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        const geoData = await geoRes.json()
        if (!geoData.results?.length) throw new Error(`City not found: ${city}`)

        const { latitude, longitude, name: cityName, country, timezone, country_code } = geoData.results[0]

        // Step 2: Fetch weather using coordinates
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,visibility,uv_index,cloud_cover` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&timezone=${encodeURIComponent(timezone || 'auto')}&forecast_days=2&wind_speed_unit=kmh`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0' }, signal: AbortSignal.timeout(10_000) }
        )
        if (!wxRes.ok) throw new Error(`Weather API error: ${wxRes.status}`)
        const wx = await wxRes.json()

        const cur = wx.current
        const [icon, condition] = wmo(cur.weather_code)
        const dir = windDir(cur.wind_direction_10m)

        // Tomorrow forecast
        const tmwCode = wx.daily?.weather_code?.[1]
        const [tmwIcon, tmwCond] = wmo(tmwCode)
        const tmwMax  = wx.daily?.temperature_2m_max?.[1]?.toFixed(1) ?? '?'
        const tmwMin  = wx.daily?.temperature_2m_min?.[1]?.toFixed(1) ?? '?'
        const tmwRain = wx.daily?.precipitation_probability_max?.[1] ?? '?'

        const text = [
          `${icon} *Weather: ${cityName}${country ? ', ' + country : ''}*`,
          DIVIDER, ``,
          `🌡️ Temperature:   *${cur.temperature_2m}°C* (Feels ${cur.apparent_temperature?.toFixed(1)}°C)`,
          `⛅ Condition:     *${condition}*`,
          `💧 Humidity:     *${cur.relative_humidity_2m}%*`,
          `💨 Wind:         *${cur.wind_speed_10m} km/h ${dir}*`,
          `👁️  Visibility:   *${((cur.visibility ?? 0) / 1000).toFixed(1)} km*`,
          `☁️  Cloud Cover:  *${cur.cloud_cover}%*`,
          `🔆 UV Index:     *${cur.uv_index ?? 'N/A'}*`,
          ``,
          `📅 *Tomorrow:* ${tmwIcon} ${tmwCond}`,
          `   High: *${tmwMax}°C* | Low: *${tmwMin}°C* | 🌧 Rain: *${tmwRain}%*`,
          ``,
          `_Powered by Open-Meteo 🌍_`
        ].join('\n')

        await sock.sendMessage(ctx.from, { edit: ph.key, text })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Weather failed: ${err.message}\n\n_Try a major city name e.g. Lagos, London, New York_` })
      }
    }
  },

  // ── .imgsearch (Lexica.art — free, no API key needed) ────────────────────
  {
    command: 'imgsearch',
    aliases: ['imagesearch', 'imgs', 'searchimage'],
    category: 'search',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}imgsearch <query>\n\n*Example:* ${ctx.prefix}imgsearch sunset beach Nigeria`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, { text: `🖼️ Searching images for _${query}_...` }, { quoted: msg })

      try {
        // Lexica.art — free AI image search, no key needed
        const res = await fetch(
          `https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`,
          { headers: { 'User-Agent': 'FirekidXMD/1.0', 'Accept': 'application/json' }, signal: AbortSignal.timeout(15_000) }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        const images = data?.images || []
        if (!images.length) throw new Error('No images found for that query')

        // Pick a random one from the top 10 results for variety
        const pick = images[Math.floor(Math.random() * Math.min(images.length, 10))]
        const imgUrl = pick.src || pick.srcSmall
        if (!imgUrl) throw new Error('No image URL in response')

        // Fetch image as buffer
        const imgRes = await fetch(imgUrl, {
          headers: { 'User-Agent': 'FirekidXMD/1.0' },
          signal: AbortSignal.timeout(30_000)
        })
        if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`)
        const buf = Buffer.from(await imgRes.arrayBuffer())

        await sock.sendMessage(ctx.from, { delete: ph.key })
        await sock.sendMessage(ctx.from, {
          image: buf,
          caption: `🖼️ *Image Result: ${query}*\n_Powered by Lexica.art 🔥_`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Image search failed: ${err.message}` })
      }
    }
  },
]
