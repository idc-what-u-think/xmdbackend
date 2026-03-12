import { downloadMediaMessage, prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys'

export default {
  command: 'joymethod',
  aliases: ['joytest'],
  groupOnly: true,
  adminOnly: true,
  handler: async (sock, msg, ctx, { api }) => {
    const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

    // 1. Identify Content Type (Reply or Direct)
    const quoted = ctx.quoted
    if (!quoted && !ctx.query) return reply("❌ **Usage:** Reply to media or type text.")

    const isImage = ctx.quotedType === 'imageMessage'
    const isVideo = ctx.quotedType === 'videoMessage'
    const isAudio = ctx.quotedType === 'audioMessage'
    const text = ctx.query

    if (!isImage && !isVideo && !isAudio && !text) {
      return reply("❌ **Usage:** Reply to media or type text.\nExamples:\n.joymethod (reply to image)\n.joymethod Hello Group")
    }

    await sock.sendMessage(ctx.from, { react: { text: '⏳', key: msg.key } })

    try {
      let messagePayload = {}

      // 2. Prepare MEDIA (Image/Video/Audio)
      if (isImage || isVideo || isAudio) {
        
        // A. Download Buffer
        const mediaBuffer = await downloadMediaMessage(
          ctx.quoted,
          'buffer',
          {},
          { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} }) } }
        )

        // B. Construct Options Object
        let mediaOptions = {}
        if (isImage) mediaOptions = { image: mediaBuffer, caption: text }
        else if (isVideo) mediaOptions = { video: mediaBuffer, caption: text }
        else if (isAudio) mediaOptions = { audio: mediaBuffer, mimetype: 'audio/mp4', ptt: false }

        // C. Upload & Prepare
        const preparedMedia = await prepareWAMessageMedia(
          mediaOptions, 
          { upload: sock.waUploadToServer }
        )

        // D. Construct the Inner Message
        let finalMediaMsg = {}
        if (isImage) finalMediaMsg = { imageMessage: preparedMedia.imageMessage }
        else if (isVideo) finalMediaMsg = { videoMessage: preparedMedia.videoMessage }
        else if (isAudio) finalMediaMsg = { audioMessage: preparedMedia.audioMessage }

        messagePayload = {
          groupStatusMessageV2: {
            message: finalMediaMsg
          }
        }
      } 
      // 3. Prepare TEXT
      else {
        const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')
        messagePayload = {
          groupStatusMessageV2: {
            message: {
              extendedTextMessage: {
                text: text,
                backgroundArgb: 0xFF000000 + parseInt(randomHex, 16),
                font: 2
              }
            }
          }
        }
      }

      // 4. Generate & Relay
      const outMsg = generateWAMessageFromContent(
        ctx.from, 
        messagePayload, 
        { userJid: sock.user.id }
      )

      await sock.relayMessage(ctx.from, outMsg.message, { messageId: outMsg.key.id })
      await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })

    } catch (e) {
      console.error("[JOYMETHOD ERROR]", e)
      reply(`🌺 Error: ${e.message}`)
    }
  }
}
