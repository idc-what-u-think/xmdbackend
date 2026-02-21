import { downloadMediaMessage } from '@whiskeysockets/baileys'
import sharp from 'sharp'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

const execAsync = promisify(exec)

const tmp = (ext) => join(tmpdir(), `fkd_${randomBytes(6).toString('hex')}.${ext}`)

const getFFmpeg = async () => {
  try {
    const { path } = await import('@ffmpeg-installer/ffmpeg')
    return path
  } catch {
    return 'ffmpeg'
  }
}

const imageToWebp = async (buffer) => {
  return await sharp(buffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80 })
    .toBuffer()
}

const videoToWebp = async (buffer, inputExt = 'mp4') => {
  const ffmpeg = await getFFmpeg()
  const inPath = tmp(inputExt)
  const outPath = tmp('webp')
  await writeFile(inPath, buffer)
  try {
    await execAsync(
      `"${ffmpeg}" -y -i "${inPath}" -vf "fps=15,scale=512:512:flags=lanczos,format=rgba" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset default -an -vsync 0 -t 6 "${outPath}"`
    )
    return await readFile(outPath)
  } finally {
    await unlink(inPath).catch(() => {})
    await unlink(outPath).catch(() => {})
  }
}

const getMediaBuffer = async (sock, targetMsg) => {
  const msgContent = targetMsg.message || {}
  const msgType = Object.keys(msgContent).find(t =>
    ['imageMessage', 'videoMessage', 'stickerMessage', 'gifMessage'].includes(t)
  )
  if (!msgType) return null
  const buffer = await downloadMediaMessage(
    targetMsg, 'buffer', {},
    { logger: console, reuploadRequest: sock.updateMediaMessage }
  )
  return { buffer, msgType }
}

export default [
  {
    command: 'sticker',
    aliases: ['s', 'stiker', 'stic'],
    category: 'sticker',
    handler: async (sock, msg, ctx, { api }) => {
      const hasQuotedMedia = ctx.quoted && ['imageMessage', 'videoMessage', 'stickerMessage'].some(t => ctx.quotedType === t)
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
            `  • Videos/GIFs (max 6 seconds)`
          ].join('\n')
        }, { quoted: msg })
      }

      const processing = await sock.sendMessage(ctx.from, { text: '⏳ Creating sticker...' }, { quoted: msg })

      try {
        const targetMsg = hasQuotedMedia ? ctx.quoted : msg
        const media = await getMediaBuffer(sock, targetMsg)
        if (!media) throw new Error('Could not download media')

        const packRes = await api.sessionGet('sticker:pack')
        const authorRes = await api.sessionGet('sticker:author')
        const packName = packRes?.value || 'Firekid Dex v1'
        const packAuthor = authorRes?.value || 'Firekid Dex'

        let stickerBuffer
        const isVideo = ['videoMessage', 'gifMessage'].includes(media.msgType)
        stickerBuffer = isVideo ? await videoToWebp(media.buffer, 'mp4') : await imageToWebp(media.buffer)

        await sock.sendMessage(ctx.from, { sticker: stickerBuffer, mimetype: 'image/webp' }, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: processing.key })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: processing.key, text: `❌ Failed to create sticker: ${err.message}` })
      }
    }
  },

  {
    command: 'take',
    aliases: ['steal', 'storesticker', 'rename'],
    category: 'sticker',
    handler: async (sock, msg, ctx, { api }) => {
      const isQuotedSticker = ctx.quoted && ctx.quotedType === 'stickerMessage'
      const isStickerMsg = Object.keys(msg.message || {})[0] === 'stickerMessage'

      if (!isQuotedSticker && !isStickerMsg) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to a sticker with ${ctx.prefix}take [pack] | [author]`
        }, { quoted: msg })
      }

      const parts = (ctx.query || '').split('|').map(s => s.trim())
      const packRes = await api.sessionGet('sticker:pack')
      const authorRes = await api.sessionGet('sticker:author')
      const pack = parts[0] || packRes?.value || 'Firekid Dex v1'
      const author = parts[1] || authorRes?.value || 'Firekid Dex'

      try {
        const targetMsg = isQuotedSticker ? ctx.quoted : msg
        const result = await getMediaBuffer(sock, targetMsg)
        if (!result?.buffer) throw new Error('Could not download sticker')

        const stickerBuffer = await sharp(result.buffer).webp({ quality: 90 }).toBuffer()
        await sock.sendMessage(ctx.from, { sticker: stickerBuffer, mimetype: 'image/webp' }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'tgsticker',
    aliases: ['toimage', 'stickertoimg', 'stickerimg'],
    category: 'sticker',
    handler: async (sock, msg, ctx, { api }) => {
      const isQuotedSticker = ctx.quoted && ctx.quotedType === 'stickerMessage'
      if (!isQuotedSticker) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to a sticker with ${ctx.prefix}tgsticker`
        }, { quoted: msg })
      }

      const processing = await sock.sendMessage(ctx.from, { text: '⏳ Converting sticker to image...' }, { quoted: msg })

      try {
        const result = await getMediaBuffer(sock, ctx.quoted)
        if (!result?.buffer) throw new Error('Could not download sticker')

        const meta = await sharp(result.buffer).metadata()
        const isAnimated = meta.pages && meta.pages > 1

        if (isAnimated) {
          const ffmpeg = await getFFmpeg()
          const inPath = tmp('webp')
          const outPath = tmp('gif')
          await writeFile(inPath, result.buffer)
          await execAsync(`"${ffmpeg}" -y -i "${inPath}" "${outPath}"`)
          const gif = await readFile(outPath)
          await sock.sendMessage(ctx.from, { video: gif, gifPlayback: true, caption: '🖼️ Converted from sticker' }, { quoted: msg })
          await unlink(inPath).catch(() => {})
          await unlink(outPath).catch(() => {})
        } else {
          const png = await sharp(result.buffer).png().toBuffer()
          await sock.sendMessage(ctx.from, { image: png, caption: '🖼️ Converted from sticker' }, { quoted: msg })
        }

        await sock.sendMessage(ctx.from, { delete: processing.key })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: processing.key, text: `❌ Failed: ${err.message}` })
      }
    }
  }
]
