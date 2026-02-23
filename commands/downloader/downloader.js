// ═══════════════════════════════════════════════════════════════════════
// downloader.js — Firekid XMD
// Free methods only (no yt-dlp, no auth), 2026 verified
//
// Architecture:
//  • Cobalt OSS (community instances, no auth)  ← universal backbone
//  • Pinterest Internal API (reversed-engineered, no auth)
//  • YouTube HTML search (no auth)
//  • Spotify oEmbed (no auth)
//  • Google Drive direct link bypass
//  • RapidAPI YouTube + TikTok for PREMIUM users (keys from worker)
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
// COBALT — universal free downloader
// Supports: YouTube, TikTok, Instagram, Facebook, Twitter/X,
//           Pinterest, Reddit, SoundCloud, Twitch clips, and more.
//
// Strategy: dynamically fetch the live instance list from
//   https://instances.cobalt.best/api/instances.json
// and pick the best no-auth online instance, with a hardcoded
// fallback list if the instance registry is unreachable.
// ─────────────────────────────────────────────────────────────────────

// Cache so we only re-fetch instances once per process lifetime
let _cobaltInstanceCache = null
let _cobaltCacheTs        = 0
const COBALT_CACHE_TTL    = 30 * 60 * 1000  // 30 min

// Hardcoded fallback instances (no turnstile, no api key required)
// Updated Feb 2026 — verified working from instances.cobalt.best
const COBALT_FALLBACK = [
  'https://cobalt.api.lostdusty.workers.dev',
  'https://cobalt.nadeko.net',
  'https://co.wuk.sh',
  'https://cobalt.ggtyler.dev',
  'https://cobalt-api.hyper.lol',
  'https://cobalt.private.coffee',
]

// Fetch live list and return up to 6 no-auth online instances
async function getCobaltInstances() {
  const now = Date.now()
  if (_cobaltInstanceCache && now - _cobaltCacheTs < COBALT_CACHE_TTL) {
    return _cobaltInstanceCache
  }

  try {
    const res = await fetch('https://instances.cobalt.best/api/instances.json', {
      headers: { 'User-Agent': 'firekidxmd/1.0 (+https://github.com/firekid)' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) throw new Error(`registry ${res.status}`)
    const list = await res.json()

    const good = list
      .filter(i => i.online && i.info?.auth === false && i.api)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 6)
      .map(i => `https://${i.api}`)

    if (good.length) {
      _cobaltInstanceCache = good
      _cobaltCacheTs       = now
      return good
    }
  } catch { /* fall through */ }

  return COBALT_FALLBACK
}

// POST to cobalt; tries all instances until one succeeds
// Returns { mediaUrl, filename, type: 'audio'|'video'|'image' }
async function cobalt(url, opts = {}) {
  const instances = await getCobaltInstances()

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
    twitterGif:         false,
    alwaysProxy:        true,   // get a proxied tunnel URL we can fetch
  })

  const errors = []

  for (const base of instances) {
    try {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(25_000),
      })

      if (!res.ok) { errors.push(`${base}: HTTP ${res.status}`); continue }

      const data = await res.json()

      if (data.status === 'error') {
        // If this instance wants auth, skip it silently
        const code = data.error?.code || ''
        if (code.includes('auth')) continue
        errors.push(`${base}: ${code}`)
        continue
      }

      // picker = multiple items (e.g. Instagram carousel) — take first video, else first item
      if (data.status === 'picker') {
        const videos = data.picker?.filter(p => p.type === 'video')
        const item   = videos?.[0] || data.picker?.[0]
        if (item?.url) return { mediaUrl: item.url, filename: `media.${item.type === 'video' ? 'mp4' : 'jpg'}`, type: item.type || 'video' }
        continue
      }

      // tunnel or redirect
      if ((data.status === 'tunnel' || data.status === 'redirect') && data.url) {
        const fname = data.filename || 'media'
        const type  = fname.match(/\.(mp3|ogg|wav|opus|flac)$/i) ? 'audio'
                    : fname.match(/\.(jpg|jpeg|png|webp|gif)$/i)  ? 'image'
                    : 'video'
        return { mediaUrl: data.url, filename: fname, type }
      }

    } catch (e) { errors.push(`${base}: ${e.message}`) }
  }

  throw new Error(`All cobalt instances failed.\nErrors: ${errors.slice(0, 3).join(' | ')}`)
}

// Fetch a URL and return a Buffer
async function toBuffer(url, label = 'media') {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Firekid/1.0)' },
    signal: AbortSignal.timeout(90_000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`${label} server returned ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ─────────────────────────────────────────────────────────────────────
// PINTEREST — internal resource API (no auth, public pins)
// Reversed-engineered from the Pinterest web frontend, stable 2024-2026
// ─────────────────────────────────────────────────────────────────────

function extractPinId(url) {
  // Handles: /pin/123456/, pin.it/AbCdEf (short links resolve on fetch)
  const m = url.match(/\/pin\/(\d+)/) || url.match(/pin\.it\/([A-Za-z0-9]+)/)
  return m?.[1] || null
}

async function pinterestMedia(url) {
  // Step 1: Resolve short links (pin.it) to full URL
  let fullUrl = url
  if (url.includes('pin.it')) {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8_000) })
    fullUrl  = r.url  // final URL after redirect
  }

  const pinId = extractPinId(fullUrl)
  if (!pinId) throw new Error('Could not extract pin ID from URL.')

  // Step 2: Hit Pinterest's internal resource API (no auth required for public pins)
  const apiUrl = `https://www.pinterest.com/resource/PinResource/get/?data=${encodeURIComponent(JSON.stringify({
    options: {
      id: pinId,
      field_set_key: 'detailed',
    },
    context: {},
  }))}&source_url=/pin/${pinId}/`

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
      'Accept':           'application/json, text/javascript, */*; q=0.01',
      'Accept-Language':  'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer':          `https://www.pinterest.com/pin/${pinId}/`,
    },
    signal: AbortSignal.timeout(12_000),
  })

  if (!res.ok) throw new Error(`Pinterest API returned ${res.status}`)

  const json   = await res.json()
  const pin    = json?.resource_response?.data

  if (!pin) throw new Error('Pinterest returned empty pin data.')

  // Check for video first
  const videos = pin.videos?.video_list
  if (videos) {
    // Sort by quality descending: V_720P, V_480P, V_EXP7, V_EXP6, ...
    const sorted = Object.values(videos).sort((a, b) => (parseInt(b.width) || 0) - (parseInt(a.width) || 0))
    const best   = sorted.find(v => v.url && !v.url.includes('.m3u8')) || sorted[0]
    if (best?.url) return { type: 'video', mediaUrl: best.url, title: pin.title || 'Pinterest Video' }
  }

  // Then image
  const img = pin.images?.orig || pin.images?.['736x'] || pin.images?.['474x']
  if (img?.url) return { type: 'image', mediaUrl: img.url, title: pin.title || 'Pinterest Image' }

  throw new Error('No media found in this Pinterest pin.')
}

// ─────────────────────────────────────────────────────────────────────
// TIKWM — free no-auth TikTok downloader (no watermark)
// https://www.tikwm.com — no API key needed, stable 2026
// ─────────────────────────────────────────────────────────────────────
async function tikwm(url) {
  const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
      'Accept':     'application/json',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`TikWM returned ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.msg || 'TikWM failed')
  const d = data.data
  const mediaUrl = d.hdplay || d.play
  if (!mediaUrl) throw new Error('TikWM: no video URL in response')
  return {
    mediaUrl,
    title:  d.title || 'TikTok Video',
    author: d.author?.nickname || '',
  }
}
// ─────────────────────────────────────────────────────────────────────

async function youtubeSearch(query) {
  // YouTube's search page embeds a JSON blob in the page source
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`
  const res  = await fetch(url, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10_000),
  })
  const html  = await res.text()
  const match = html.match(/"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/)
  if (!match) throw new Error(`No YouTube results found for: ${query}`)
  return match[1]
}

function extractYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|v%3D)([A-Za-z0-9_-]{11})/)
  return m?.[1] || null
}

// ─────────────────────────────────────────────────────────────────────
// SPOTIFY oEmbed — get track title without any auth
// ─────────────────────────────────────────────────────────────────────

async function spotifyTitle(url) {
  const res  = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error('Could not fetch Spotify track info.')
  const data = await res.json()
  return data.title || null
}

// ─────────────────────────────────────────────────────────────────────
// RAPIDAPI — Premium-only wrappers (keys fetched from worker)
// ─────────────────────────────────────────────────────────────────────

// YouTube via RapidAPI (yt-api.p.rapidapi.com)
// Returns { mediaUrl, title, duration }
async function rapidYouTube(videoId, apiKey, wantAudio) {
  const host = 'yt-api.p.rapidapi.com'
  const res  = await fetch(`https://${host}/dl?id=${videoId}`, {
    headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`RapidAPI YouTube: ${res.status}`)
  const data = await res.json()
  if (data.status !== 'OK') throw new Error(data.message || 'RapidAPI YouTube failed')

  const title    = data.title || 'YouTube Video'
  const seconds  = data.lengthSeconds || 0
  const duration = seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : ''

  if (wantAudio) {
    const fmt = (data.adaptiveFormats || [])
      .filter(f => f.mimeType?.startsWith('audio/') && f.url)
      .sort((a, b) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0))[0]
    if (!fmt?.url) throw new Error('RapidAPI: no audio format found')
    return { mediaUrl: fmt.url, title, duration }
  }

  // Video: best mp4 at or under 720p
  const fmt = (data.formats || [])
    .filter(f => f.mimeType?.includes('video/mp4') && f.url)
    .sort((a, b) => (parseInt(b.height) || 0) - (parseInt(a.height) || 0))
    .find(f => (parseInt(f.height) || 0) <= 720)
    || (data.formats || []).find(f => f.url)

  if (!fmt?.url) throw new Error('RapidAPI: no video format found')
  return { mediaUrl: fmt.url, title, duration }
}

// TikTok no-watermark HD via RapidAPI (tiktok-video-no-watermark2.p.rapidapi.com)
async function rapidTikTok(url, apiKey) {
  const host = 'tiktok-video-no-watermark2.p.rapidapi.com'
  const res  = await fetch(`https://${host}/index?url=${encodeURIComponent(url)}&hd=1`, {
    headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`RapidAPI TikTok: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.msg || 'RapidAPI TikTok failed')
  const d = data.data
  return {
    mediaUrl: d.hdplay || d.play,
    title:    d.title || 'TikTok Video',
    author:   d.author?.nickname || '',
  }
}

// ─────────────────────────────────────────────────────────────────────
// GOOGLE DRIVE — direct link bypass (large file confirmation)
// ─────────────────────────────────────────────────────────────────────

function gdriveId(url) {
  const m = url.match(/[-\w]{25,}(?!.*[-\w]{25,})/)
  if (!m) throw new Error('Could not extract Google Drive file ID from URL.')
  return m[0]
}

async function gdriveDownload(url) {
  const fileId    = gdriveId(url)
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
  const ua        = { 'User-Agent': 'Mozilla/5.0', redirect: 'follow' }

  let res = await fetch(directUrl, { headers: ua, signal: AbortSignal.timeout(90_000) })
  if (!res.ok) throw new Error(`Drive returned ${res.status}. Is the file public?`)

  // Large file: Google shows a confirmation HTML page
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('text/html')) {
    const html    = await res.text()
    const confirm = html.match(/confirm=([A-Za-z0-9_-]+)/)?.[1]
    if (!confirm) throw new Error('Drive file may be too large or restricted.')
    const newUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=${confirm}`
    res = await fetch(newUrl, { headers: ua, signal: AbortSignal.timeout(90_000) })
    if (!res.ok) throw new Error(`Drive download failed: ${res.status}`)
  }

  const buf   = Buffer.from(await res.arrayBuffer())
  const cd    = res.headers.get('content-disposition') || ''
  const fname = cd.match(/filename[^;=\n]*=([^;\n]*)/)?.[1]?.replace(/['"]/g, '').trim() || `gdrive_${fileId}`
  const mime  = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim()
  return { buf, fname, mime }
}

// ─────────────────────────────────────────────────────────────────────
// SEND HELPERS
// ─────────────────────────────────────────────────────────────────────

const sendAudio = async (sock, msg, ctx, buf, caption) => {
  checkSize(buf, MAX_AUDIO_MB, 'Audio')
  return sock.sendMessage(ctx.from, { audio: buf, mimetype: 'audio/mpeg', ptt: false, caption }, { quoted: msg })
}

const sendVideo = async (sock, msg, ctx, buf, caption) => {
  checkSize(buf, MAX_VIDEO_MB, 'Video')
  return sock.sendMessage(ctx.from, { video: buf, mimetype: 'video/mp4', caption }, { quoted: msg })
}

const sendImage = async (sock, msg, ctx, buf, caption) => {
  checkSize(buf, MAX_VIDEO_MB, 'Image')
  return sock.sendMessage(ctx.from, { image: buf, caption }, { quoted: msg })
}

const placeholder = async (sock, ctx, msg, text) =>
  sock.sendMessage(ctx.from, { text }, { quoted: msg })

const editPlaceholder = async (sock, ph, text) => {
  try { await sock.sendMessage(ph.key.remoteJid, { edit: ph.key, text }) } catch {}
}

const deletePlaceholder = async (sock, ph) => {
  try { await sock.sendMessage(ph.key.remoteJid, { delete: ph.key }) } catch {}
}

// ═══════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════

export default [

  // ─────────────────────────────────────────────────────────────────
  // YouTube Audio (MP3)
  // Free: YouTube search → cobalt tunnel → mp3
  // Premium: RapidAPI (higher quality, more reliable)
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'ytmp3',
    aliases:  ['play', 'ymp3', 'youtubemp3', 'ytaudio'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}ytmp3 <YouTube URL or song name>\n\n*Examples:*\n${ctx.prefix}ytmp3 Burna Boy Last Last\n${ctx.prefix}ytmp3 https://youtu.be/dQw4w9WgXcQ`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '🎵 Fetching audio...')

      try {
        const isUrl   = query.startsWith('http')
        const videoId = isUrl ? extractYouTubeId(query) : await youtubeSearch(query)
        if (!videoId) throw new Error('Could not find that YouTube video.')

        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`
        let buf, caption

        // Try premium RapidAPI first
        if (ctx.isPremium) {
          try {
            const keyRes = await ctx.api?.getKey?.('youtube', ctx.senderNumber)
            if (keyRes?.key) {
              await editPlaceholder(sock, ph, '🎵 Fetching via premium service...')
              const track = await rapidYouTube(videoId, keyRes.key, true)
              buf     = await toBuffer(track.mediaUrl, 'audio')
              caption = `🎵 *${track.title}*${track.duration ? '\n⏱️ ' + track.duration : ''}\n_Firekid XMD Premium_`
            }
          } catch { /* fall through to cobalt */ }
        }

        // Free: cobalt
        if (!buf) {
          await editPlaceholder(sock, ph, '🎵 Downloading audio...')
          const result = await cobalt(ytUrl, { downloadMode: 'audio', audioFormat: 'mp3', audioBitrate: '128' })
          buf     = await toBuffer(result.mediaUrl, 'audio')
          caption = `🎵 *${query}*\n_Downloaded via Firekid XMD_`
        }

        await deletePlaceholder(sock, ph)
        await sendAudio(sock, msg, ctx, buf, caption)

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Download failed: ${err.message}`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // YouTube Video (MP4)
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'ytmp4',
    aliases:  ['video', 'ymp4', 'ytv', 'youtubevideo'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}ytmp4 <YouTube URL or video name>\n\n*Examples:*\n${ctx.prefix}ytmp4 Davido Unavailable\n${ctx.prefix}ytmp4 https://youtu.be/dQw4w9WgXcQ`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '🎬 Fetching video...')

      try {
        const isUrl   = query.startsWith('http')
        const videoId = isUrl ? extractYouTubeId(query) : await youtubeSearch(query)
        if (!videoId) throw new Error('Could not find that YouTube video.')

        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`
        let buf, caption

        if (ctx.isPremium) {
          try {
            const keyRes = await ctx.api?.getKey?.('youtube', ctx.senderNumber)
            if (keyRes?.key) {
              await editPlaceholder(sock, ph, '🎬 Fetching via premium service...')
              const track = await rapidYouTube(videoId, keyRes.key, false)
              buf     = await toBuffer(track.mediaUrl, 'video')
              caption = `🎬 *${track.title}*${track.duration ? '\n⏱️ ' + track.duration : ''}\n_Firekid XMD Premium_`
            }
          } catch { /* fall through to cobalt */ }
        }

        if (!buf) {
          await editPlaceholder(sock, ph, '🎬 Downloading video (720p)...')
          const result = await cobalt(ytUrl, { downloadMode: 'auto', videoQuality: '720' })
          buf     = await toBuffer(result.mediaUrl, 'video')
          caption = `🎬 *${query}*\n_Downloaded via Firekid XMD_`
        }

        await deletePlaceholder(sock, ph)
        await sendVideo(sock, msg, ctx, buf, caption)

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Download failed: ${err.message}`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // TikTok — no watermark
  // Free: cobalt (watermark-free)
  // Premium: RapidAPI HD no-watermark
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'tt',
    aliases:  ['tiktok', 'ttdl', 'tiktokdl'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.startsWith('http')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}tt <TikTok URL>\n\n*Example:*\n${ctx.prefix}tt https://vm.tiktok.com/xxxxx`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '🎵 Downloading TikTok (no watermark)...')

      try {
        let buf, caption

        if (ctx.isPremium) {
          try {
            const keyRes = await ctx.api?.getKey?.('tiktok', ctx.senderNumber)
            if (keyRes?.key) {
              await editPlaceholder(sock, ph, '🎵 Fetching HD via premium service...')
              const tt = await rapidTikTok(url, keyRes.key)
              buf      = await toBuffer(tt.mediaUrl, 'video')
              caption  = `🎵 *${tt.title}*${tt.author ? '\n👤 @' + tt.author : ''}\n_Firekid XMD Premium — HD No Watermark_`
            }
          } catch { /* fall through */ }
        }

        if (!buf) {
          // Free Method 1: TikWM (no auth, no watermark, most reliable 2026)
          try {
            await editPlaceholder(sock, ph, '🎵 Downloading TikTok (no watermark)...')
            const tt = await tikwm(url)
            buf      = await toBuffer(tt.mediaUrl, 'video')
            caption  = `🎵 *${tt.title}*${tt.author ? '\n👤 @' + tt.author : ''}\n_No watermark — Firekid XMD_`
          } catch { /* fall through to cobalt */ }
        }

        // Free Method 2: cobalt fallback
        if (!buf) {
          await editPlaceholder(sock, ph, '🎵 Trying alternative method...')
          const result = await cobalt(url, { downloadMode: 'auto', videoQuality: '720' })
          buf     = await toBuffer(result.mediaUrl, 'video')
          caption = `🎵 *TikTok Video*\n_No watermark — Firekid XMD_`
        }

        await deletePlaceholder(sock, ph)
        await sendVideo(sock, msg, ctx, buf, caption)

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ TikTok download failed: ${err.message}`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // Instagram — reels, posts, carousels (public only)
  // Free: cobalt
  // Note: private accounts require cookies — not supported
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'ig',
    aliases:  ['instagram', 'igdl', 'insta', 'reels'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.startsWith('http')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}ig <Instagram URL>\n\n*Example:*\n${ctx.prefix}ig https://www.instagram.com/reel/xxxxx\n\n_Only public posts are supported_`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '📸 Downloading Instagram media...')

      try {
        const result = await cobalt(url, { downloadMode: 'auto', videoQuality: '720' })
        const buf    = await toBuffer(result.mediaUrl)

        await deletePlaceholder(sock, ph)

        if (result.type === 'image') {
          await sendImage(sock, msg, ctx, buf, `📸 *Instagram Post*\n_Firekid XMD_`)
        } else {
          await sendVideo(sock, msg, ctx, buf, `📸 *Instagram Reel*\n_Firekid XMD_`)
        }

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Instagram download failed: ${err.message}\n\n_Make sure the post is public_`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // Facebook — public videos
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'fb',
    aliases:  ['facebook', 'fbdl', 'fbvid'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.startsWith('http')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}fb <Facebook video URL>\n\n*Example:*\n${ctx.prefix}fb https://www.facebook.com/watch?v=xxxxx`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '📘 Downloading Facebook video...')

      try {
        const result = await cobalt(url, { downloadMode: 'auto', videoQuality: '720' })
        const buf    = await toBuffer(result.mediaUrl)

        await deletePlaceholder(sock, ph)
        await sendVideo(sock, msg, ctx, buf, `📘 *Facebook Video*\n_Firekid XMD_`)

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Facebook download failed: ${err.message}\n\n_Only public videos are supported_`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // Twitter / X
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'twitter',
    aliases:  ['xdl', 'twdl', 'xvideo', 'twitterdl'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.startsWith('http')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}twitter <Twitter/X post URL>\n\n*Example:*\n${ctx.prefix}twitter https://x.com/user/status/xxxxx`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '🐦 Downloading Twitter/X media...')

      try {
        const result = await cobalt(url, { downloadMode: 'auto', videoQuality: '720' })
        const buf    = await toBuffer(result.mediaUrl)

        await deletePlaceholder(sock, ph)

        if (result.type === 'image') {
          await sendImage(sock, msg, ctx, buf, `🐦 *Twitter/X Image*\n_Firekid XMD_`)
        } else {
          await sendVideo(sock, msg, ctx, buf, `🐦 *Twitter/X Video*\n_Firekid XMD_`)
        }

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Twitter/X download failed: ${err.message}\n\n_Only public posts are supported_`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // Spotify
  // Strategy: oEmbed (no auth) → get track title → YouTube search → cobalt
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'spotify',
    aliases:  ['spdl', 'spotifydl', 'spmusic'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const query = ctx.query?.trim()
      if (!query) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}spotify <Spotify URL or song name>\n\n*Examples:*\n${ctx.prefix}spotify https://open.spotify.com/track/xxxxx\n${ctx.prefix}spotify Burna Boy Alone`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '🎧 Processing Spotify request...')

      try {
        let searchQuery = query

        if (query.includes('spotify.com/track')) {
          await editPlaceholder(sock, ph, '🎧 Fetching track info from Spotify...')
          const title = await spotifyTitle(query)
          if (!title) throw new Error('Could not get track info from Spotify.')
          searchQuery = title
        }

        await editPlaceholder(sock, ph, `🎵 Searching: *${searchQuery}*...`)

        const videoId = await youtubeSearch(searchQuery + ' audio')
        const ytUrl   = `https://www.youtube.com/watch?v=${videoId}`
        const result  = await cobalt(ytUrl, { downloadMode: 'audio', audioFormat: 'mp3', audioBitrate: '128' })
        const buf     = await toBuffer(result.mediaUrl, 'audio')

        await deletePlaceholder(sock, ph)
        await sendAudio(sock, msg, ctx, buf, `🎧 *${searchQuery}*\n_Firekid XMD_`)

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Spotify download failed: ${err.message}`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // Pinterest
  // Method 1: Pinterest internal resource API (reversed-engineered, no auth)
  //           Works for public pins — returns original quality video/image
  // Method 2: Cobalt fallback (also supports Pinterest)
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'pin',
    aliases:  ['pinterest', 'pindl', 'pindownload'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.startsWith('http')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}pin <Pinterest pin URL>\n\n*Example:*\n${ctx.prefix}pin https://www.pinterest.com/pin/xxxxx\n${ctx.prefix}pin https://pin.it/AbCdEf`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '📌 Downloading Pinterest media...')

      try {
        let buf, isVideo

        // Method 1: Pinterest internal API (original quality, fastest)
        try {
          const media = await pinterestMedia(url)
          buf     = await toBuffer(media.mediaUrl, media.type)
          isVideo = media.type === 'video'
        } catch {
          // Method 2: cobalt fallback
          await editPlaceholder(sock, ph, '📌 Trying alternative method...')
          const result = await cobalt(url, { downloadMode: 'auto' })
          buf     = await toBuffer(result.mediaUrl)
          isVideo = result.type !== 'image'
        }

        await deletePlaceholder(sock, ph)

        if (isVideo) {
          await sendVideo(sock, msg, ctx, buf, `📌 *Pinterest Video*\n_Firekid XMD_`)
        } else {
          await sendImage(sock, msg, ctx, buf, `📌 *Pinterest Image*\n_Firekid XMD_`)
        }

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Pinterest download failed: ${err.message}`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // Reddit — images, videos, gifs (public posts)
  // Free: cobalt
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'reddit',
    aliases:  ['rdl', 'redditsave', 'reddl'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.startsWith('http')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}reddit <Reddit post URL>\n\n*Example:*\n${ctx.prefix}reddit https://www.reddit.com/r/memes/comments/xxxxx`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '🤖 Downloading Reddit media...')

      try {
        const result = await cobalt(url, { downloadMode: 'auto', videoQuality: '720' })
        const buf    = await toBuffer(result.mediaUrl)

        await deletePlaceholder(sock, ph)

        if (result.type === 'image') {
          await sendImage(sock, msg, ctx, buf, `🤖 *Reddit Post*\n_Firekid XMD_`)
        } else {
          await sendVideo(sock, msg, ctx, buf, `🤖 *Reddit Video*\n_Firekid XMD_`)
        }

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Reddit download failed: ${err.message}`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // SoundCloud — free streaming tracks (no auth)
  // Free: cobalt
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'sc',
    aliases:  ['soundcloud', 'scdl'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.startsWith('http')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}sc <SoundCloud track URL>\n\n*Example:*\n${ctx.prefix}sc https://soundcloud.com/artist/trackname`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '🎶 Downloading SoundCloud track...')

      try {
        const result = await cobalt(url, { downloadMode: 'audio', audioFormat: 'mp3', audioBitrate: '128' })
        const buf    = await toBuffer(result.mediaUrl, 'audio')

        await deletePlaceholder(sock, ph)
        await sendAudio(sock, msg, ctx, buf, `🎶 *SoundCloud Track*\n_Firekid XMD_`)

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ SoundCloud download failed: ${err.message}`)
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // Google Drive — public files (any type)
  // Free: direct link + confirmation bypass
  // ─────────────────────────────────────────────────────────────────
  {
    command:  'gdrive',
    aliases:  ['gdl', 'gdrivedl', 'gddownload'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url?.includes('drive.google.com')) return sock.sendMessage(ctx.from, {
        text: `❌ *Usage:* ${ctx.prefix}gdrive <Google Drive link>\n\n*Example:*\n${ctx.prefix}gdrive https://drive.google.com/file/d/xxxxx/view\n\n_File must be shared as "Anyone with the link"_`
      }, { quoted: msg })

      const ph = await placeholder(sock, ctx, msg, '☁️ Fetching Google Drive file...')

      try {
        const { buf, fname, mime } = await gdriveDownload(url)
        checkSize(buf, MAX_VIDEO_MB, 'File')

        await deletePlaceholder(sock, ph)
        await sock.sendMessage(ctx.from, {
          document: buf,
          fileName: fname,
          mimetype: mime,
          caption:  `☁️ *${fname}*\n📦 ${(buf.length / MB).toFixed(2)} MB`,
        }, { quoted: msg })

      } catch (err) {
        await editPlaceholder(sock, ph, `❌ Google Drive download failed: ${err.message}`)
      }
    },
  },

]
