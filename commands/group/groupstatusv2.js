import { downloadMediaMessage, prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys'

export default {
  command: 'groupstatusv2',
  aliases: ['gstatusv2', 'gcstatusv2'],
  groupOnly: true,
  adminOnly: true,
  handler: async (sock, msg, ctx, { api }) => {
    const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

    if (!ctx.quoted) return reply(`❌ Reply to an image, video, audio, or text to post as group status.\n📌 *Usage:* ${ctx.prefix}groupstatusv2 (reply to media)`)

    const qType = ctx.quotedType

    await sock.sendMessage(ctx.from, { react: { text: '⏳', key: msg.key } })

    try {
      let messagePayload = {}

      if (qType === 'imageMessage' || qType === 'videoMessage' || qType === 'audioMessage') {
        // Download quoted media to buffer
        const mediaBuffer = await downloadMediaMessage(
          ctx.quoted,
          'buffer',
          {},
          { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} }) } }
        )

        // Build media options
        let mediaOptions = {}
        if (qType === 'imageMessage')      mediaOptions = { image: mediaBuffer, caption: ctx.query }
        else if (qType === 'videoMessage') mediaOptions = { video: mediaBuffer, caption: ctx.query }
        else if (qType === 'audioMessage') mediaOptions = { audio: mediaBuffer, mimetype: 'audio/mp4', ptt: false }

        // Upload to WA servers
        const preparedMedia = await prepareWAMessageMedia(mediaOptions, { upload: sock.waUploadToServer })

        // Build inner message
        let finalMediaMsg = {}
        if (qType === 'imageMessage')      finalMediaMsg = { imageMessage: preparedMedia.imageMessage }
        else if (qType === 'videoMessage') finalMediaMsg = { videoMessage: preparedMedia.videoMessage }
        else if (qType === 'audioMessage') finalMediaMsg = { audioMessage: preparedMedia.audioMessage }

        messagePayload = { groupStatusMessageV2: { message: finalMediaMsg } }

      } else if (qType === 'conversation' || qType === 'extendedTextMessage') {
        const textContent = ctx.quotedBody
        if (!textContent) return reply('❌ Quoted message has no text content.')

        const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')
        messagePayload = {
          groupStatusMessageV2: {
            message: {
              extendedTextMessage: {
                text: textContent,
                backgroundArgb: 0xFF000000 + parseInt(randomHex, 16),
                font: Math.floor(Math.random() * 5)
              }
            }
          }
        }

      } else {
        return reply('❌ Unsupported media type. Reply to an image, video, audio, or text.')
      }

      // Generate and relay
      const outMsg = generateWAMessageFromContent(ctx.from, messagePayload, { userJid: sock.user.id })
      await sock.relayMessage(ctx.from, outMsg.message, { messageId: outMsg.key.id })
      await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })

    } catch (e) {
      console.error('[groupstatusv2]', e.message)
      await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
      reply(`❌ Failed to post group status: ${e.message}`)
    }
  }
}
