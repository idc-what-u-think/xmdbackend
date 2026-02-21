// commands/sticker/sticker.js
// Commands: .sticker | .take | .tgsticker
//
// Dependencies needed in package.json:
//   sharp        — image resize/convert to webp
//   fluent-ffmpeg — video/gif to animated webp
//   @ffmpeg-installer/ffmpeg — ffmpeg binary
//
// Install: npm install sharp fluent-ffmpeg @ffmpeg-installer/ffmpeg

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import sharp from 'sharp'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

const execAsync = promisify(exec)

const BOT_NAME    = process.env.BOT_NAME    || 'FireKid Dex'
const BOT_VERSION = process.env.BOT_VERSION || 'v1'

// ── Helpers ───────────────────────────────────────────────

// Generate a temp file path
const tmp = (ext) => join(tmpdir(), `fkd_${randomBytes(6).toString('hex')}.${ext}`)

// Get ffmpeg binary path — tries @ffmpeg-installer first, falls back to system ffmpeg
const getFFmpeg = async () => {
  try {
    const { path } = await import('@ffmpeg-installer/ffmpeg')
    return path
  } catch {
    return 'ffmpeg' // use system ffmpeg
  }
}

// Convert image buffer → 512x512 WebP sticker buffer using sharp
const imageToWebp = async (buffer) => {
  return await sharp(buffer)
    .resize(512, 512, {
      fit:        'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 80 })
    .toBuffer()
}

// Convert video/gif buffer → animated WebP sticker buffer using ffmpeg
const videoToWebp = async (buffer, inputExt = 'mp4') => {
  const ffmpeg  = await getFFmpeg()
  const inPath  = tmp(inputExt)
  const outPath = tmp('webp')

  await writeFile(inPath, buffer)

  try {
    await execAsync(
      `"${ffmpeg}" -y -i "${inPath}" -vf "fps=15,scale=512:512:flags=lanczos,format=rgba" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset default -an -vsync 0 -t 6 "${outPath}"`
    )
    const result = await readFile(outPath)
    return result
  } finally {
    await unlink(inPath).catch(() => {})
    await unlink(outPath).catch(() => {})
  }
}

// Detect message type and download media
const getMediaBuffer = async (sock, targetMsg) => {
  const msgContent = targetMsg.message || {}
  const types      = Object.keys(msgContent)
  const msgType    = types.find(t => [
    'imageMessage', 'videoMessage', 'stickerMessage', 'gifMessage'
  ].includes(t))

  if (!msgType) return null

  const buffer = await downloadMediaMessage(
    targetMsg,
    'buffer',
    {},
    { logger: console, reuploadRequest: sock.updateMediaMessage }
  )

  return { buffer, msgType }
}

// ── Commands ──────────────────────────────────────────────

export default [

  // ── .sticker ──────────────────────────────────────────
  {
    command:  'sticker',
    aliases:  ['s', 'stiker', 'stic'],
    category: 'sticker',
    description: 'Convert an image or video/gif into a WhatsApp sticker',
    usage:    '.sticker (reply to/send image or video)',
    example:  'Send or reply to an image with .sticker',

    handler: async (sock, msg, ctx) => {
      // Check if there's media to process
      const hasQuotedMedia = ctx.quoted && [
        'imageMessage', 'videoMessage', 'stickerMessage'
      ].some(t => ctx.quotedType === t)

      const msgType = Object.keys(msg.message || {})[0]
      const hasDirectMedia = ['imageMessage', 'videoMessage'].includes(msgType)

      if (!hasQuotedMedia && !hasDirectMedia) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🖼️ *Sticker Maker*`,
            ``,
            `Send or reply to a media with ${ctx.prefix}sticker`,
            ``,
            `*Supported:*`,
            `  • Images (jpg, png, webp)`,
            `  • Videos/GIFs (max 6 seconds)`,
            ``,
            `*Example:* Send an image + caption \`.sticker\``
          ].join('\n')
        }, { quoted: msg })
      }

      const processing = await sock.sendMessage(ctx.from, {
        text: '⏳ Creating sticker...'
      }, { quoted: msg })

      try {
        const targetMsg = hasQuotedMedia ? ctx.quoted : msg
        const media     = await getMediaBuffer(sock, targetMsg)

        if (!media) throw new Error('Could not download media')

        let stickerBuffer
        const isVideo = ['videoMessage', 'gifMessage'].includes(media.msgType)

        if (isVideo) {
          stickerBuffer = await videoToWebp(media.buffer, 'mp4')
        } else {
          stickerBuffer = await imageToWebp(media.buffer)
        }

        await sock.sendMessage(ctx.from, {
          sticker: stickerBuffer,
          mimetype: 'image/webp'
        }, { quoted: msg })

        // Delete the "creating sticker" message
        await sock.sendMessage(ctx.from, {
          delete: processing.key
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: `❌ Failed to create sticker: ${err.message}`
        })
      }
    }
  },

  // ── .take ─────────────────────────────────────────────
  {
    command:  'take',
    aliases:  ['steal', 'storesticker', 'rename'],
    category: 'sticker',
    description: 'Steal/rename a sticker — add your own pack name and author',
    usage:    '.take [pack name] | [author] (reply to a sticker)',
    example:  '.take FireKid Pack | FireKid Dex',

    handler: async (sock, msg, ctx) => {
      const isQuotedSticker = ctx.quoted && ctx.quotedType === 'stickerMessage'
      const isStickerMsg    = Object.keys(msg.message || {})[0] === 'stickerMessage'

      if (!isQuotedSticker && !isStickerMsg) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to a sticker with ${ctx.prefix}take [pack] | [author]`
        }, { quoted: msg })
      }

      // Parse pack name and author from query
      const parts  = (ctx.query || '').split('|').map(s => s.trim())
      const pack   = parts[0] || BOT_NAME
      const author = parts[1] || BOT_VERSION

      try {
        const targetMsg = isQuotedSticker ? ctx.quoted : msg
        const { buffer } = await getMediaBuffer(sock, targetMsg) || {}

        if (!buffer) throw new Error('Could not download sticker')

        // Re-encode with new metadata
        const stickerBuffer = await sharp(buffer)
          .webp({ quality: 90 })
          .toBuffer()

        await sock.sendMessage(ctx.from, {
          sticker: stickerBuffer,
          mimetype: 'image/webp'
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .tgsticker ────────────────────────────────────────
  {
    command:  'tgsticker',
    aliases:  ['toimage', 'stickertoimg', 'stickerimg'],
    category: 'sticker',
    description: 'Convert a WhatsApp sticker back into an image',
    usage:    '.tgsticker (reply to a sticker)',
    example:  'Reply to any sticker with .tgsticker',

    handler: async (sock, msg, ctx) => {
      const isQuotedSticker = ctx.quoted && ctx.quotedType === 'stickerMessage'

      if (!isQuotedSticker) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to a sticker with ${ctx.prefix}tgsticker`
        }, { quoted: msg })
      }

      const processing = await sock.sendMessage(ctx.from, {
        text: '⏳ Converting sticker to image...'
      }, { quoted: msg })

      try {
        const { buffer } = await getMediaBuffer(sock, ctx.quoted) || {}
        if (!buffer) throw new Error('Could not download sticker')

        // Check if animated
        const meta      = await sharp(buffer).metadata()
        const isAnimated = meta.pages && meta.pages > 1

        if (isAnimated) {
          // Animated → send as gif
          const ffmpeg  = await getFFmpeg()
          const inPath  = tmp('webp')
          const outPath = tmp('gif')

          await writeFile(inPath, buffer)
          await execAsync(`"${ffmpeg}" -y -i "${inPath}" "${outPath}"`)
          const gif = await readFile(outPath)

          await sock.sendMessage(ctx.from, {
            video:       gif,
            gifPlayback: true,
            caption:     '🖼️ Converted from sticker'
          }, { quoted: msg })

          await unlink(inPath).catch(() => {})
          await unlink(outPath).catch(() => {})

        } else {
          // Static → send as image
          const png = await sharp(buffer).png().toBuffer()

          await sock.sendMessage(ctx.from, {
            image:   png,
            caption: '🖼️ Converted from sticker'
          }, { quoted: msg })
        }

        await sock.sendMessage(ctx.from, {
          delete: processing.key
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: `❌ Failed: ${err.message}`
        })
      }
    }
  }

]
