import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { readFile, unlink, access } from 'fs/promises'

const tmp = (ext) => join(tmpdir(), `fkd_${randomBytes(6).toString('hex')}.${ext}`)

// ── yt-dlp runner ──────────────────────────────────────────
const getYtDlp = async () => {
  try {
    const mod = await import('youtube-dl-exec')
    return mod.default || mod
  } catch {
    throw new Error('youtube-dl-exec not installed. Run: npm install youtube-dl-exec')
  }
}

// Download to a temp file and return buffer + clean up
const dlToBuffer = async (url, ytdlpOpts, outExt) => {
  const outPath = tmp(outExt)
  const ytdlp  = await getYtDlp()

  await ytdlp(url, {
    output:     outPath,
    noPlaylist: true,
    noWarnings: true,
    ...ytdlpOpts,
  })

  // yt-dlp may append extension automatically — try a few variants
  const candidates = [
    outPath,
    outPath.replace(`.${outExt}`, `.mp3`),
    outPath.replace(`.${outExt}`, `.mp4`),
    outPath.replace(`.${outExt}`, `.m4a`),
    outPath.replace(`.${outExt}`, `.webm`),
  ]

  for (const p of candidates) {
    try {
      await access(p)
      const buf = await readFile(p)
      await unlink(p).catch(() => {})
      return buf
    } catch {}
  }

  // fallback: glob-like — just try the original path
  const buf = await readFile(outPath)
  await unlink(outPath).catch(() => {})
  return buf
}

// Get video/audio info without downloading
const getInfo = async (url) => {
  const ytdlp = await getYtDlp()
  return ytdlp(url, {
    dumpSingleJson: true,
    noPlaylist:     true,
    noWarnings:     true,
  })
}

// ── Size guard — WhatsApp limits ───────────────────────────
const MB = 1024 * 1024
const MAX_AUDIO_MB = 16
const MAX_VIDEO_MB = 64

const checkSize = (buf, maxMB) => {
  if (buf.length > maxMB * MB) {
    throw new Error(`File too large (${(buf.length / MB).toFixed(1)}MB). Max is ${maxMB}MB.`)
  }
}

// ── Spotify oEmbed — no auth needed ───────────────────────
const spotifyTitle = async (url) => {
  const res  = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error('Could not fetch Spotify track info')
  const data = await res.json()
  // title is usually "Track Name - Artist Name"
  return data.title || null
}

// ── Pinterest scraper — no auth needed ────────────────────
const scrapePinterest = async (url) => {
  const res  = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  })
  const html = await res.text()

  // Try to extract video URL first
  const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/) ||
                     html.match(/contentUrl["']?\s*:\s*["']([^"']+\.mp4[^"']*)/i)
  if (videoMatch) return { type: 'video', url: videoMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/') }

  // Try high-res image
  const imgMatch = html.match(/"orig"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/) ||
                   html.match(/property="og:image"\s+content="([^"]+)"/) ||
                   html.match(/name="twitter:image:src"\s+content="([^"]+)"/)
  if (imgMatch) return { type: 'image', url: imgMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/') }

  throw new Error('Could not extract media from Pinterest pin.')
}

// ── Google Drive URL converter ─────────────────────────────
const gdriveDirectUrl = (url) => {
  const match = url.match(/[-\w]{25,}(?!.*[-\w]{25,})/)
  if (!match) throw new Error('Could not extract Google Drive file ID from URL.')
  return `https://drive.google.com/uc?export=download&id=${match[0]}&confirm=t`
}

// ═══════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════

export default [

  // ── YouTube MP3 ────────────────────────────────────────
  {
    command:  'ytmp3',
    aliases:  ['play', 'ymp3', 'youtubemp3', 'ytaudio'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const query = ctx.query?.trim()
      if (!query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a YouTube URL or search term.`,
            `📌 *Usage:* ${ctx.prefix}ytmp3 <url or song name>`,
            ``,
            `*Examples:*`,
            `${ctx.prefix}ytmp3 https://youtu.be/dQw4w9WgXcQ`,
            `${ctx.prefix}ytmp3 Burna Boy Last Last`,
          ].join('\n')
        }, { quoted: msg })
      }

      const isUrl = query.startsWith('http')
      const url   = isUrl ? query : `ytsearch1:${query}`

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `🎵 Downloading audio... please wait`
      }, { quoted: msg })

      try {
        // Get info first for caption
        let title = query
        let duration = ''
        try {
          const info = await getInfo(url)
          title    = info.title || query
          duration = info.duration ? `⏱️ ${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}` : ''
        } catch {}

        const buf = await dlToBuffer(url, {
          extractAudio:  true,
          audioFormat:   'mp3',
          audioQuality:  '128K',
          format:        'bestaudio/best',
        }, 'mp3')

        checkSize(buf, MAX_AUDIO_MB)

        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          audio:    buf,
          mimetype: 'audio/mpeg',
          ptt:      false,
          caption:  `🎵 *${title}*\n${duration}`.trim(),
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Download failed: ${err.message}`
        })
      }
    }
  },

  // ── YouTube MP4 ────────────────────────────────────────
  {
    command:  'ytmp4',
    aliases:  ['video', 'ymp4', 'ytv', 'youtubevideo'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const query = ctx.query?.trim()
      if (!query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a YouTube URL or search term.`,
            `📌 *Usage:* ${ctx.prefix}ytmp4 <url or video name>`,
            ``,
            `*Examples:*`,
            `${ctx.prefix}ytmp4 https://youtu.be/dQw4w9WgXcQ`,
            `${ctx.prefix}ytmp4 Davido Unavailable`,
          ].join('\n')
        }, { quoted: msg })
      }

      const isUrl = query.startsWith('http')
      const url   = isUrl ? query : `ytsearch1:${query}`

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `🎬 Downloading video... please wait`
      }, { quoted: msg })

      try {
        let title = query
        let duration = ''
        try {
          const info = await getInfo(url)
          title    = info.title || query
          duration = info.duration ? `⏱️ ${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}` : ''
        } catch {}

        const buf = await dlToBuffer(url, {
          format: 'best[height<=720][ext=mp4]/best[height<=720]/bestvideo[ext=mp4]+bestaudio/best',
          mergeOutputFormat: 'mp4',
        }, 'mp4')

        checkSize(buf, MAX_VIDEO_MB)

        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          video:    buf,
          mimetype: 'video/mp4',
          caption:  `🎬 *${title}*\n${duration}`.trim(),
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Download failed: ${err.message}`
        })
      }
    }
  },

  // ── TikTok ─────────────────────────────────────────────
  {
    command:  'tt',
    aliases:  ['tiktok', 'ttdl', 'tiktokdl'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url || !url.startsWith('http')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a TikTok video URL.`,
            `📌 *Usage:* ${ctx.prefix}tt <tiktok url>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}tt https://vm.tiktok.com/xxxxx`,
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `🎵 Downloading TikTok video (no watermark)...`
      }, { quoted: msg })

      try {
        let title = 'TikTok Video'
        try {
          const info = await getInfo(url)
          title = info.title || title
        } catch {}

        const buf = await dlToBuffer(url, {
          format: 'bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best',
        }, 'mp4')

        checkSize(buf, MAX_VIDEO_MB)

        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          video:    buf,
          mimetype: 'video/mp4',
          caption:  `🎵 *${title}*\n_Downloaded via Firekid XMD_`,
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ TikTok download failed: ${err.message}`
        })
      }
    }
  },

  // ── Instagram ──────────────────────────────────────────
  {
    command:  'ig',
    aliases:  ['instagram', 'igdl', 'insta', 'reels'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url || !url.startsWith('http')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide an Instagram post/reel URL.`,
            `📌 *Usage:* ${ctx.prefix}ig <instagram url>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}ig https://www.instagram.com/reel/xxxxx`,
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `📸 Downloading Instagram media...`
      }, { quoted: msg })

      try {
        // Try yt-dlp first — it handles reels/posts/stories
        let buf, isVideo = true

        try {
          buf = await dlToBuffer(url, {
            format: 'bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best',
          }, 'mp4')
        } catch {
          // Fallback: might be an image post
          buf = await dlToBuffer(url, {
            format: 'best',
          }, 'jpg')
          isVideo = false
        }

        checkSize(buf, MAX_VIDEO_MB)

        await sock.sendMessage(ctx.from, { delete: placeholder.key })

        if (isVideo) {
          await sock.sendMessage(ctx.from, {
            video:    buf,
            mimetype: 'video/mp4',
            caption:  `📸 *Instagram Reel*\n_Downloaded via Firekid XMD_`,
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, {
            image:   buf,
            caption: `📸 *Instagram Post*\n_Downloaded via Firekid XMD_`,
          }, { quoted: msg })
        }

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Instagram download failed: ${err.message}\n\n_Make sure the post is public_`
        })
      }
    }
  },

  // ── Facebook ───────────────────────────────────────────
  {
    command:  'fb',
    aliases:  ['facebook', 'fbdl', 'fbvid'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url || !url.startsWith('http')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a Facebook video URL.`,
            `📌 *Usage:* ${ctx.prefix}fb <facebook video url>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}fb https://www.facebook.com/watch?v=xxxxx`,
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `📘 Downloading Facebook video...`
      }, { quoted: msg })

      try {
        let title = 'Facebook Video'
        try {
          const info = await getInfo(url)
          title = info.title || title
        } catch {}

        const buf = await dlToBuffer(url, {
          format: 'best[ext=mp4]/best',
        }, 'mp4')

        checkSize(buf, MAX_VIDEO_MB)

        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          video:    buf,
          mimetype: 'video/mp4',
          caption:  `📘 *${title}*\n_Downloaded via Firekid XMD_`,
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Facebook download failed: ${err.message}\n\n_Make sure the video is public_`
        })
      }
    }
  },

  // ── Twitter / X ────────────────────────────────────────
  {
    command:  'twitter',
    aliases:  ['xdl', 'twdl', 'xvideo', 'twitterdl'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url || !url.startsWith('http')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a Twitter/X post URL.`,
            `📌 *Usage:* ${ctx.prefix}twitter <twitter/x url>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}twitter https://x.com/user/status/xxxxx`,
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `🐦 Downloading Twitter/X media...`
      }, { quoted: msg })

      try {
        const buf = await dlToBuffer(url, {
          format: 'best[ext=mp4]/best',
        }, 'mp4')

        checkSize(buf, MAX_VIDEO_MB)

        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          video:    buf,
          mimetype: 'video/mp4',
          caption:  `🐦 *Twitter/X Video*\n_Downloaded via Firekid XMD_`,
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Twitter/X download failed: ${err.message}\n\n_Only public posts are supported_`
        })
      }
    }
  },

  // ── Spotify ────────────────────────────────────────────
  {
    command:  'spotify',
    aliases:  ['spdl', 'spotifydl', 'spmusic'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const query = ctx.query?.trim()
      if (!query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a Spotify track URL or song name.`,
            `📌 *Usage:* ${ctx.prefix}spotify <spotify url or song name>`,
            ``,
            `*Examples:*`,
            `${ctx.prefix}spotify https://open.spotify.com/track/xxxxx`,
            `${ctx.prefix}spotify Burna Boy Alone`,
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `🎧 Processing Spotify request...`
      }, { quoted: msg })

      try {
        let searchQuery = query

        // If it's a Spotify URL, get the track title first via oEmbed (no auth)
        if (query.includes('spotify.com/track')) {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `🎧 Fetching Spotify track info...`
          })
          const title = await spotifyTitle(query)
          if (!title) throw new Error('Could not get track info from Spotify.')
          searchQuery = title
        }

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `🎵 Searching and downloading: *${searchQuery}*...`
        })

        const buf = await dlToBuffer(`ytsearch1:${searchQuery} audio`, {
          extractAudio: true,
          audioFormat:  'mp3',
          audioQuality: '128K',
          format:       'bestaudio/best',
        }, 'mp3')

        checkSize(buf, MAX_AUDIO_MB)

        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          audio:    buf,
          mimetype: 'audio/mpeg',
          ptt:      false,
          caption:  `🎧 *${searchQuery}*\n_Downloaded via Firekid XMD_`,
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Spotify download failed: ${err.message}`
        })
      }
    }
  },

  // ── Pinterest ──────────────────────────────────────────
  {
    command:  'pin',
    aliases:  ['pinterest', 'pindl', 'pindownload'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url || !url.startsWith('http')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a Pinterest pin URL.`,
            `📌 *Usage:* ${ctx.prefix}pin <pinterest url>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}pin https://www.pinterest.com/pin/xxxxx`,
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `📌 Downloading Pinterest media...`
      }, { quoted: msg })

      try {
        const media = await scrapePinterest(url)
        const res   = await fetch(media.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        if (!res.ok) throw new Error(`Failed to fetch media: ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())

        await sock.sendMessage(ctx.from, { delete: placeholder.key })

        if (media.type === 'video') {
          checkSize(buf, MAX_VIDEO_MB)
          await sock.sendMessage(ctx.from, {
            video:    buf,
            mimetype: 'video/mp4',
            caption:  `📌 *Pinterest Video*\n_Downloaded via Firekid XMD_`,
          }, { quoted: msg })
        } else {
          checkSize(buf, MAX_VIDEO_MB)
          await sock.sendMessage(ctx.from, {
            image:   buf,
            caption: `📌 *Pinterest Image*\n_Downloaded via Firekid XMD_`,
          }, { quoted: msg })
        }

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Pinterest download failed: ${err.message}`
        })
      }
    }
  },

  // ── Google Drive ───────────────────────────────────────
  {
    command:  'gdrive',
    aliases:  ['gdl', 'gdrivedl', 'gddownload'],
    category: 'downloader',
    handler:  async (sock, msg, ctx) => {
      const url = ctx.query?.trim()
      if (!url || !url.includes('drive.google.com')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a public Google Drive file link.`,
            `📌 *Usage:* ${ctx.prefix}gdrive <drive link>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}gdrive https://drive.google.com/file/d/xxxxx/view`,
            ``,
            `_The file must be shared as "Anyone with the link"_`
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `☁️ Fetching Google Drive file...`
      }, { quoted: msg })

      try {
        const directUrl = gdriveDirectUrl(url)

        const res = await fetch(directUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow',
        })

        if (!res.ok) throw new Error(`Drive returned ${res.status}. Make sure the file is publicly shared.`)

        const contentType = res.headers.get('content-type') || 'application/octet-stream'

        // Detect virus-warning page
        const isHtml = contentType.includes('text/html')
        if (isHtml) {
          // Large file — Google shows a confirmation page, extract confirm token
          const html = await res.text()
          const confirmMatch = html.match(/confirm=([A-Za-z0-9_-]+)/)
          if (!confirmMatch) throw new Error('File may be too large or restricted by Google Drive.')

          const confirm = confirmMatch[1]
          const fileId  = directUrl.match(/id=([^&]+)/)?.[1]
          const newUrl  = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=${confirm}`

          const res2    = await fetch(newUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' })
          if (!res2.ok) throw new Error(`Failed to download: ${res2.status}`)

          const buf2 = Buffer.from(await res2.arrayBuffer())
          checkSize(buf2, MAX_VIDEO_MB)

          const mime2 = res2.headers.get('content-type') || 'application/octet-stream'
          const cd2   = res2.headers.get('content-disposition') || ''
          const fname = cd2.match(/filename[^;=\n]*=([^;\n]*)/)?.[1]?.replace(/['"]/g, '').trim() || 'gdrive_file'

          await sock.sendMessage(ctx.from, { delete: placeholder.key })
          return sock.sendMessage(ctx.from, {
            document: buf2,
            fileName: fname,
            mimetype: mime2.split(';')[0].trim(),
            caption:  `☁️ *${fname}*\n📦 Size: ${(buf2.length / MB).toFixed(2)}MB`,
          }, { quoted: msg })
        }

        const buf  = Buffer.from(await res.arrayBuffer())
        checkSize(buf, MAX_VIDEO_MB)

        const cd    = res.headers.get('content-disposition') || ''
        const fname = cd.match(/filename[^;=\n]*=([^;\n]*)/)?.[1]?.replace(/['"]/g, '').trim() || 'gdrive_file'
        const mime  = contentType.split(';')[0].trim()

        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          document: buf,
          fileName: fname,
          mimetype: mime,
          caption:  `☁️ *${fname}*\n📦 Size: ${(buf.length / MB).toFixed(2)}MB`,
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Google Drive download failed: ${err.message}`
        })
      }
    }
  },

]
