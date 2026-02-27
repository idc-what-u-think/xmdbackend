// ═══════════════════════════════════════════════════════════════════════
// downloader.js — Firekid XMD  
// YOUR RAILWAY COBALT INSTANCE + fallbacks
// Music (.play) powered by JioSaavn API
// ═══════════════════════════════════════════════════════════════════════

// ── Size limits (WhatsApp) ────────────────────────────────────────────
const MB           = 1024 * 1024
const MAX_AUDIO_MB = 16
const MAX_VIDEO_MB = 64

const checkSize = (buf, maxMB, label = 'File') => {
  if (buf.length > maxMB * MB)
    throw new Error(`${label} too large (${(buf.length / MB).toFixed(1)} MB). Max allowed: ${maxMB} MB.`)
}

// ─────────────────────────────────────────────────────────────────────
// JIOSAAVN — music search + MP3 download (no key needed)
// ─────────────────────────────────────────────────────────────────────
const SAAVN_BASE = 'https://jiosaavn-apifg.vercel.app'

async function saavnSearch(query, limit = 5) {
  const res = await fetch(
    `${SAAVN_BASE}/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
    {
      headers: { 'User-Agent': 'FirekidXMD/2.0' },
      signal: AbortSignal.timeout(15_000),
    }
  )
  if (!res.ok) throw new Error(`JioSaavn search failed (HTTP ${res.status})`)
  const data = await res.json()
  const results = data?.data?.results
  if (!results?.length) return null
  return results
}

function getBestDownloadUrl(song) {
  const dlUrls = song.downloadUrl || []
  const best =
    dlUrls.find(u => u.quality === '320kbps') ||
    dlUrls.find(u => u.quality === '160kbps') ||
    dlUrls.find(u => u.quality === '96kbps')  ||
    dlUrls[dlUrls.length - 1]
  return best || null
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A'
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ─────────────────────────────────────────────────────────────────────
// COBALT — YOUR PERSONAL RAILWAY INSTANCE + PUBLIC FALLBACKS
// ─────────────────────────────────────────────────────────────────────

// YOUR RAILWAY COBALT INSTANCE (top priority)
const YOUR_COBALT = 'https://cobalt-production-1c11.up.railway.app'

// Public fallback instances (if your Railway instance is down)
const COBALT_FALLBACK = [
  'https://cobalt.api.lostdusty.workers.dev',
  'https://cobalt.nadeko.net',
  'https://co.wuk.sh',
  'https://cobalt.ggtyler.dev',
  'https://cobalt-api.hyper.lol',
  'https://cobalt.private.coffee',
  'https://api.cobalt.tools',
  'https://cobalt-api.kwiatekmiki.com',
  'https://cobalt.meowgi.ru',
  'https://cobalt-api.jl1.dev',
]

// All instances to try (your Railway first, then fallbacks)
const getAllInstances = () => [YOUR_COBALT, ...COBALT_FALLBACK]

// POST to cobalt; tries your Railway instance first, then fallbacks
async function cobalt(url, opts = {}) {
  const instances = getAllInstances()

  const body = JSON.stringify({
    url,
    videoQuality:       opts.videoQuality   || '720',
    audioFormat:        opts.audioFormat     || 'mp3',
    audioBitrate:       opts.audioBitrate    || '128',
    downloadMode:       opts.downloadMode    || 'auto',
    youtubeVideoCodec:  'h264',
    filenameStyle:      'basic',
    disableMetadata:    true,
    tiktokFullAudio:    false,
  })

  const errors = []
  
  for (const inst of instances) {
    try {
      const res = await fetch(inst, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'firekidxmd/1.0'
        },
        body,
        signal: AbortSignal.timeout(45_000),
      })

      if (!res.ok) {
        errors.push(`${inst}: HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      
      // Cobalt v11 response format
      if (data.status === 'error' || data.error) {
        errors.push(`${inst}: ${data.error?.message || data.text || 'Unknown error'}`)
        continue
      }

      // Success - extract download URL
      let mediaUrl = null
      let filename = 'download'
      let type = 'video'

      if (data.status === 'redirect' || data.status === 'stream') {
        mediaUrl = data.url
      } else if (data.url) {
        mediaUrl = data.url
      }

      if (!mediaUrl) {
        errors.push(`${inst}: No download URL in response`)
        continue
      }

      // Determine type from URL or response
      if (mediaUrl.includes('.mp3') || opts.audioFormat === 'mp3' || opts.downloadMode === 'audio') {
        type = 'audio'
        filename = 'audio.mp3'
      } else if (mediaUrl.includes('.mp4')) {
        type = 'video'
        filename = 'video.mp4'
      }

      console.log(`[Cobalt] Success via ${inst}`)
      
      return { mediaUrl, filename, type }
      
    } catch (e) {
      errors.push(`${inst}: ${e.message}`)
      continue
    }
  }

  // All instances failed
  const usedYourRailway = errors.some(e => e.includes(YOUR_COBALT))
  if (usedYourRailway) {
    throw new Error(`Download failed.\n\nYour Railway instance and all fallbacks failed:\n${errors.slice(0, 3).join('\n')}`)
  } else {
    throw new Error(`Download failed. All instances failed:\n${errors.slice(0, 3).join('\n')}`)
  }
}

// ─────────────────────────────────────────────────────────────────────
// PINTEREST
// ─────────────────────────────────────────────────────────────────────
async function pinterest(query, limit = 10) {
  const res = await fetch(
    `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${encodeURIComponent(query)}&data={"options":{"query":"${encodeURIComponent(query)}","scope":"pins"},"context":{}}`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    }
  )
  if (!res.ok) throw new Error(`Pinterest HTTP ${res.status}`)
  
  const json = await res.json()
  const pins = json?.resource_response?.data?.results || []
  
  return pins.slice(0, limit).map(p => ({
    url: p.images?.orig?.url || '',
    title: p.title || '',
    link: `https://pinterest.com/pin/${p.id}/`
  })).filter(p => p.url)
}

// ─────────────────────────────────────────────────────────────────────
// YOUTUBE SEARCH (no auth, HTML scraping)
// ─────────────────────────────────────────────────────────────────────
async function youtubeSearch(query, limit = 10) {
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`)
  
  const html = await res.text()
  const match = html.match(/var ytInitialData = ({.+?});/)
  if (!match) throw new Error('YouTube: could not parse search results')
  
  const data = JSON.parse(match[1])
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || []
  
  const results = []
  for (const item of contents) {
    const video = item.videoRenderer
    if (!video) continue
    
    const id = video.videoId
    const title = video.title?.runs?.[0]?.text || ''
    const views = video.viewCountText?.simpleText || ''
    const duration = video.lengthText?.simpleText || ''
    const channel = video.ownerText?.runs?.[0]?.text || ''
    const thumb = video.thumbnail?.thumbnails?.[0]?.url || ''
    
    results.push({
      id,
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
      views,
      duration,
      channel,
      thumbnail: thumb.startsWith('//') ? `https:${thumb}` : thumb
    })
    
    if (results.length >= limit) break
  }
  
  return results
}

// ─────────────────────────────────────────────────────────────────────
// SPOTIFY
// ─────────────────────────────────────────────────────────────────────
async function spotifyInfo(url) {
  const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(10_000)
  })
  if (!res.ok) throw new Error(`Spotify HTTP ${res.status}`)
  
  const data = await res.json()
  return {
    title: data.title || '',
    artist: data.author_name || '',
    thumbnail: data.thumbnail_url || '',
    type: data.type || 'track'
  }
}

// ─────────────────────────────────────────────────────────────────────
// GOOGLE DRIVE
// ─────────────────────────────────────────────────────────────────────
function gdriveDirect(url) {
  const match = url.match(/\/file\/d\/([^\/]+)/)
  if (!match) throw new Error('Invalid Google Drive URL')
  const id = match[1]
  return `https://drive.google.com/uc?export=download&id=${id}`
}

// ─────────────────────────────────────────────────────────────────────
// COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────

export default [
  // ── TikTok ─────────────────────────────────────────────────────────
  {
    command: 'tiktok',
    aliases: ['tt', 'ttdl'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !url.includes('tiktok.com')) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a TikTok URL.\n📌 *Usage:* ${ctx.prefix}tiktok <url>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⏳ Downloading TikTok video...' }, { quoted: msg })

      try {
        const { mediaUrl } = await cobalt(url, { videoQuality: '720' })
        
        const vidBuf = await fetch(mediaUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
        checkSize(vidBuf, MAX_VIDEO_MB, 'Video')

        await sock.sendMessage(ctx.from, {
          video: vidBuf,
          caption: `🎵 *TikTok Download*\n\n_Downloaded via ${ctx.botName}_`
        })

        await sock.sendMessage(ctx.from, { delete: wait.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ *TikTok download failed*\n\n${e.message}`
        })
      }
    }
  },

  // ── Universal Downloader ───────────────────────────────────────────
  {
    command: 'download',
    aliases: ['dl', 'get'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !url.startsWith('http')) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a valid URL.\n📌 *Usage:* ${ctx.prefix}download <url>\n\n*Supported:* Instagram, Twitter, Facebook, YouTube, Reddit, etc.`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⏳ Downloading...' }, { quoted: msg })

      try {
        const { mediaUrl, type } = await cobalt(url)
        
        const buf = await fetch(mediaUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
        
        if (type === 'audio') {
          checkSize(buf, MAX_AUDIO_MB, 'Audio')
          await sock.sendMessage(ctx.from, {
            audio: buf,
            mimetype: 'audio/mpeg'
          })
        } else {
          checkSize(buf, MAX_VIDEO_MB, 'Video')
          await sock.sendMessage(ctx.from, {
            video: buf,
            caption: `📥 *Downloaded*\n\n_via ${ctx.botName}_`
          })
        }

        await sock.sendMessage(ctx.from, { delete: wait.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ *Download failed*\n\n${e.message}`
        })
      }
    }
  },

  // ── Instagram ──────────────────────────────────────────────────────
  {
    command: 'instagram',
    aliases: ['ig', 'igdl', 'insta'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !url.includes('instagram.com')) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide an Instagram URL.\n📌 *Usage:* ${ctx.prefix}ig <url>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⏳ Downloading from Instagram...' }, { quoted: msg })

      try {
        const { mediaUrl } = await cobalt(url)
        
        const buf = await fetch(mediaUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
        checkSize(buf, MAX_VIDEO_MB, 'Video')

        await sock.sendMessage(ctx.from, {
          video: buf,
          caption: `📸 *Instagram Download*\n\n_via ${ctx.botName}_`
        })

        await sock.sendMessage(ctx.from, { delete: wait.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ *Instagram download failed*\n\n${e.message}`
        })
      }
    }
  },

  // ── Twitter/X ──────────────────────────────────────────────────────
  {
    command: 'twitter',
    aliases: ['x', 'tweet', 'twdl'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !(url.includes('twitter.com') || url.includes('x.com'))) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a Twitter/X URL.\n📌 *Usage:* ${ctx.prefix}twitter <url>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⏳ Downloading from Twitter...' }, { quoted: msg })

      try {
        const { mediaUrl } = await cobalt(url)
        
        const buf = await fetch(mediaUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
        checkSize(buf, MAX_VIDEO_MB, 'Video')

        await sock.sendMessage(ctx.from, {
          video: buf,
          caption: `🐦 *Twitter Download*\n\n_via ${ctx.botName}_`
        })

        await sock.sendMessage(ctx.from, { delete: wait.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ *Twitter download failed*\n\n${e.message}`
        })
      }
    }
  },

  // ── Facebook ───────────────────────────────────────────────────────
  {
    command: 'facebook',
    aliases: ['fb', 'fbdl'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !url.includes('facebook.com')) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a Facebook URL.\n📌 *Usage:* ${ctx.prefix}fb <url>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⏳ Downloading from Facebook...' }, { quoted: msg })

      try {
        const { mediaUrl } = await cobalt(url)
        
        const buf = await fetch(mediaUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
        checkSize(buf, MAX_VIDEO_MB, 'Video')

        await sock.sendMessage(ctx.from, {
          video: buf,
          caption: `📘 *Facebook Download*\n\n_via ${ctx.botName}_`
        })

        await sock.sendMessage(ctx.from, { delete: wait.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ *Facebook download failed*\n\n${e.message}`
        })
      }
    }
  },

  // ── YouTube ────────────────────────────────────────────────────────
  {
    command: 'youtube',
    aliases: ['yt', 'ytdl', 'ytmp4', 'ytmp3'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a YouTube URL.\n📌 *Usage:* ${ctx.prefix}yt <url>`
        }, { quoted: msg })
      }

      const isAudio = ctx.command === 'ytmp3'
      const wait = await sock.sendMessage(ctx.from, { 
        text: `⏳ Downloading ${isAudio ? 'audio' : 'video'} from YouTube...` 
      }, { quoted: msg })

      // Detect if it's a full-length video (not a Short)
      const isShort = url.includes('/shorts/') || url.includes('youtu.be/')
      if (isAudio && !isShort) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: [
            `⚠️ *YouTube MP3 Unavailable*`,
            ``,
            `Full-length YouTube videos are blocked by YouTube's anti-bot system on server IPs.`,
            ``,
            `✅ *Try instead:*`,
            `• ${ctx.prefix}play <song name> — searches JioSaavn and downloads MP3 directly`,
            `• ${ctx.prefix}ytmp3 <youtube shorts url> — Shorts still work`,
          ].join('\n')
        })
        return
      }

      try {
        const opts = isAudio ? { downloadMode: 'audio', audioFormat: 'mp3' } : { videoQuality: '720' }
        const { mediaUrl, type } = await cobalt(url, opts)
        
        const buf = await fetch(mediaUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
        
        if (type === 'audio' || isAudio) {
          checkSize(buf, MAX_AUDIO_MB, 'Audio')
          await sock.sendMessage(ctx.from, {
            audio: buf,
            mimetype: 'audio/mpeg'
          })
        } else {
          checkSize(buf, MAX_VIDEO_MB, 'Video')
          await sock.sendMessage(ctx.from, {
            video: buf,
            caption: `📺 *YouTube Download*\n\n_via ${ctx.botName}_`
          })
        }

        await sock.sendMessage(ctx.from, { delete: wait.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: [
            `❌ *YouTube download failed*`,
            ``,
            `${e.message}`,
            ``,
            `💡 *Tip:* Use *${ctx.prefix}play <song name>* to download music instead — it uses JioSaavn and works reliably.`,
          ].join('\n')
        })
      }
    }
  },

  // ── YouTube Search ─────────────────────────────────────────────────
  {
    command: 'ytsearch',
    aliases: ['yts', 'searchyt'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a search query.\n📌 *Usage:* ${ctx.prefix}ytsearch <query>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '🔍 Searching YouTube...' }, { quoted: msg })

      try {
        const results = await youtubeSearch(ctx.query, 5)
        
        if (!results.length) {
          return sock.sendMessage(ctx.from, {
            edit: wait.key,
            text: '❌ No results found.'
          })
        }

        const text = [
          `🔍 *YouTube Search Results*`,
          ``,
          ...results.map((v, i) => 
            `*${i + 1}.* ${v.title}\n` +
            `   👁️ ${v.views} • ⏱️ ${v.duration}\n` +
            `   📺 ${v.channel}\n` +
            `   🔗 ${v.url}\n`
          ),
          `_Use ${ctx.prefix}yt <url> to download_`
        ].join('\n')

        await sock.sendMessage(ctx.from, { edit: wait.key, text })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ Search failed: ${e.message}`
        })
      }
    }
  },

  // ── Pinterest ──────────────────────────────────────────────────────
  {
    command: 'pinterest',
    aliases: ['pin'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a search query.\n📌 *Usage:* ${ctx.prefix}pinterest <query>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '🔍 Searching Pinterest...' }, { quoted: msg })

      try {
        const results = await pinterest(ctx.query, 5)
        
        if (!results.length) {
          return sock.sendMessage(ctx.from, {
            edit: wait.key,
            text: '❌ No results found.'
          })
        }

        await sock.sendMessage(ctx.from, { delete: wait.key })

        for (const img of results) {
          try {
            const buf = await fetch(img.url).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
            await sock.sendMessage(ctx.from, {
              image: buf,
              caption: img.title ? `📌 ${img.title}` : '📌 Pinterest'
            })
            await new Promise(r => setTimeout(r, 500))
          } catch {}
        }
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ Search failed: ${e.message}`
        })
      }
    }
  },

  // ── Google Drive ───────────────────────────────────────────────────
  {
    command: 'gdrive',
    aliases: ['drive', 'googledrive'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !url.includes('drive.google.com')) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a Google Drive URL.\n📌 *Usage:* ${ctx.prefix}gdrive <url>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⏳ Downloading from Google Drive...' }, { quoted: msg })

      try {
        const directUrl = gdriveDirect(url)
        
        const buf = await fetch(directUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
        checkSize(buf, MAX_VIDEO_MB, 'File')

        await sock.sendMessage(ctx.from, {
          document: buf,
          fileName: 'download',
          caption: `📁 *Google Drive Download*\n\n_via ${ctx.botName}_`
        })

        await sock.sendMessage(ctx.from, { delete: wait.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ Download failed: ${e.message}`
        })
      }
    }
  },

  // ── Spotify Info (No download, just metadata) ─────────────────────
  {
    command: 'spotify',
    aliases: ['spot'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      const url = ctx.query || ctx.quoted?.body
      if (!url || !url.includes('spotify.com')) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a Spotify URL.\n📌 *Usage:* ${ctx.prefix}spotify <url>`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⏳ Fetching Spotify info...' }, { quoted: msg })

      try {
        const info = await spotifyInfo(url)
        
        const text = [
          `🎵 *Spotify ${info.type.charAt(0).toUpperCase() + info.type.slice(1)}*`,
          ``,
          `*Title:* ${info.title}`,
          `*Artist:* ${info.artist}`,
          ``,
          `💡 _Use ${ctx.prefix}play ${info.title} to download this song_`
        ].join('\n')

        if (info.thumbnail) {
          const thumbBuf = await fetch(info.thumbnail).then(r => r.arrayBuffer()).then(b => Buffer.from(b))
          await sock.sendMessage(ctx.from, {
            image: thumbBuf,
            caption: text
          })
          await sock.sendMessage(ctx.from, { delete: wait.key })
        } else {
          await sock.sendMessage(ctx.from, { edit: wait.key, text })
        }
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ Failed: ${e.message}`
        })
      }
    }
  },

  // ── Search Music ──────────────────────────────────────────────────
  {
    command: 'searchmusic',
    aliases: ['musicsearch', 'findmusic', 'smusic'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `🎵 *Search Music*\n\n📌 *Usage:* ${ctx.prefix}searchmusic <song name>\n\n_Example: ${ctx.prefix}searchmusic Blinding Lights_`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: `🔍 Searching for *"${ctx.query}"*...` }, { quoted: msg })

      try {
        // Search JioSaavn first (more reliable for music)
        const saavnResults = await saavnSearch(ctx.query, 5).catch(() => null)

        if (saavnResults?.length) {
          const lines = [
            `🎵 *Music Search Results*`,
            `${'─'.repeat(30)}`,
            `🔎 Query: _${ctx.query}_`,
            ``
          ]

          saavnResults.forEach((s, i) => {
            const artist = s.primaryArtists || s.artists?.primary?.map(a => a.name).join(', ') || 'Unknown'
            const dur = formatDuration(s.duration)
            lines.push(`*${i + 1}.* 🎶 ${s.name}`)
            lines.push(`   🎤 ${artist}`)
            lines.push(`   ⏱️ ${dur}`)
            lines.push(``)
          })

          lines.push(`_Use *${ctx.prefix}play <song name>* to download_`)
          await sock.sendMessage(ctx.from, { edit: wait.key, text: lines.join('\n') })
          return
        }

        // Fallback to YouTube search
        const results = await youtubeSearch(ctx.query + ' song', 6)

        if (!results.length) {
          return sock.sendMessage(ctx.from, {
            edit: wait.key,
            text: `❌ No results found for *"${ctx.query}"*`
          })
        }

        const lines = [
          `🎵 *Music Search Results*`,
          `${'─'.repeat(30)}`,
          `🔎 Query: _${ctx.query}_`,
          ``
        ]

        results.forEach((v, i) => {
          lines.push(`*${i + 1}.* 🎶 ${v.title}`)
          lines.push(`   📺 ${v.channel}`)
          lines.push(`   ⏱️ ${v.duration || 'N/A'} • 👁️ ${v.views || 'N/A'}`)
          lines.push(`   🔗 ${v.url}`)
          lines.push(``)
        })

        lines.push(`_Use *${ctx.prefix}play <song name>* to download_`)

        await sock.sendMessage(ctx.from, { edit: wait.key, text: lines.join('\n') })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ Search failed: ${e.message}`
        })
      }
    }
  },

  // ── Play (search by name + download via JioSaavn) ─────────────────
  {
    command: 'play',
    aliases: ['playmusic', 'music', 'mp3'],
    category: 'downloader',
    handler: async (sock, msg, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `🎵 *Play Music*\n\n📌 *Usage:* ${ctx.prefix}play <song name>\n\n_Example: ${ctx.prefix}play Blinding Lights_\n\n_Searches JioSaavn and downloads as MP3._`
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: `🔍 Searching for *"${ctx.query}"*...` }, { quoted: msg })

      try {
        // Step 1: Search JioSaavn
        const results = await saavnSearch(ctx.query, 5)
        if (!results) {
          return sock.sendMessage(ctx.from, {
            edit: wait.key,
            text: `❌ No results found for *"${ctx.query}"*\n\n_Try a different song name_`
          })
        }

        const song   = results[0]
        const title  = song.name || 'Unknown'
        const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown'
        const dur    = formatDuration(song.duration)

        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `🎵 Found: *${title}* — ${artist}\n⬇️ Downloading...`
        })

        // Step 2: Get best quality download URL
        const best = getBestDownloadUrl(song)
        if (!best?.url) throw new Error('No download URL returned for this song — try a different name')

        // Step 3: Download audio buffer
        const audioRes = await fetch(best.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(60_000),
        })
        if (!audioRes.ok) throw new Error(`Audio download failed (HTTP ${audioRes.status})`)

        const buf = Buffer.from(await audioRes.arrayBuffer())
        if (buf.length < 1000) throw new Error('Downloaded file too small — JioSaavn may have returned an error')
        checkSize(buf, MAX_AUDIO_MB, 'Audio')

        // Step 4: Send audio
        await sock.sendMessage(ctx.from, {
          audio:    buf,
          mimetype: 'audio/mpeg',
          ptt:      false,
        }, { quoted: msg })

        // Step 5: Update wait message
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: [
            `✅ *Downloaded*`,
            ``,
            `🎶 ${title}`,
            `🎤 ${artist}`,
            `⏱️ ${dur}`,
            `🎧 ${best.quality}`,
          ].join('\n')
        })
      } catch (e) {
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: `❌ *Play failed*\n\n${e.message}`
        })
      }
    }
  },
]
