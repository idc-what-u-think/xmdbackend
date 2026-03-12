import { downloadMediaMessage, prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys'

export default {
  command: 'joymethod',
  aliases: ['joytest'],
  groupOnly: true,
  adminOnly: true,
  handler: async (sock, msg, ctx, { api }) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[JOYMETHOD] Command triggered')
    console.log('[JOYMETHOD] Group:', ctx.from)
    console.log('[JOYMETHOD] Sender:', ctx.sender)
    console.log('[JOYMETHOD] Has quoted:', !!ctx.quoted)
    console.log('[JOYMETHOD] Quoted type:', ctx.quotedType)
    console.log('[JOYMETHOD] Query:', ctx.query)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

    // 1. Identify Content Type (Reply or Direct)
    const quoted = ctx.quoted
    if (!quoted && !ctx.query) {
      console.log('[JOYMETHOD] ❌ No quoted message and no query')
      return reply("❌ **Usage:** Test Joy.")
    }

    const isImage = ctx.quotedType === 'imageMessage'
    const isVideo = ctx.quotedType === 'videoMessage'
    const isAudio = ctx.quotedType === 'audioMessage'
    const text = ctx.query

    console.log('[JOYMETHOD] Content type check:', { isImage, isVideo, isAudio, hasText: !!text })

    if (!isImage && !isVideo && !isAudio && !text) {
      console.log('[JOYMETHOD] ❌ No valid content type')
      return reply("❌ **Usage:** Reply to media or type text.\nExamples:\n.joymethod (reply to image)\n.joymethod Hello Group")
    }

    await sock.sendMessage(ctx.from, { react: { text: '⏳', key: msg.key } })
    console.log('[JOYMETHOD] ⏳ Reacted with loading')

    try {
      let messagePayload = {}

      // 2. Prepare MEDIA (Image/Video/Audio)
      if (isImage || isVideo || isAudio) {
        console.log('[JOYMETHOD] 📥 Downloading media...')
        
        // A. Download Buffer
        const mediaBuffer = await downloadMediaMessage(
          ctx.quoted,
          'buffer',
          {},
          { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} }) } }
        )

        console.log('[JOYMETHOD] ✅ Media downloaded, size:', mediaBuffer.length, 'bytes')

        // B. Construct Options Object
        let mediaOptions = {}
        if (isImage) mediaOptions = { image: mediaBuffer, caption: text }
        else if (isVideo) mediaOptions = { video: mediaBuffer, caption: text }
        else if (isAudio) mediaOptions = { audio: mediaBuffer, mimetype: 'audio/mp4', ptt: false }

        console.log('[JOYMETHOD] 📤 Uploading to WA servers...')

        // C. Upload & Prepare
        const preparedMedia = await prepareWAMessageMedia(
          mediaOptions, 
          { upload: sock.waUploadToServer }
        )

        console.log('[JOYMETHOD] ✅ Media uploaded and prepared')
        console.log('[JOYMETHOD] Prepared media keys:', Object.keys(preparedMedia))

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

        console.log('[JOYMETHOD] 📦 Built groupStatusMessageV2 payload')
      } 
      // 3. Prepare TEXT
      else {
        console.log('[JOYMETHOD] 📝 Processing text message...')
        const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')
        console.log('[JOYMETHOD] Random color:', '#' + randomHex)
        
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

        console.log('[JOYMETHOD] 📦 Built text groupStatusMessageV2 payload')
      }

      console.log('[JOYMETHOD] 🔨 Generating WAMessage from content...')

      // 4. Generate & Relay
      const outMsg = generateWAMessageFromContent(
        ctx.from, 
        messagePayload, 
        { userJid: sock.user.id }
      )

      console.log('[JOYMETHOD] ✅ Message generated')
      console.log('[JOYMETHOD] Message key:', outMsg.key)
      console.log('[JOYMETHOD] Message type:', Object.keys(outMsg.message || {}))

      console.log('[JOYMETHOD] 🚀 Relaying message...')

      await sock.relayMessage(ctx.from, outMsg.message, { messageId: outMsg.key.id })

      console.log('[JOYMETHOD] ✅ Message relayed successfully')
      console.log('[JOYMETHOD] ✅ Reacting with checkmark')

      await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })

      console.log('[JOYMETHOD] ━━━━━━ SUCCESS ━━━━━━')

    } catch (e) {
      console.error('[JOYMETHOD] ❌ ERROR:', e)
      console.error('[JOYMETHOD] Error stack:', e.stack)
      console.error('[JOYMETHOD] Error message:', e.message)
      reply(`🌺 Error: ${e.message}`)
    }
  }
}
