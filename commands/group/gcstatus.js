import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default {
  command: 'gcstatus',
  aliases: ['gcpost', 'gstat'],
  groupOnly: true,
  adminOnly: true,
  handler: async (sock, msg, ctx, { api }) => {
    const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

    if (!ctx.quoted) {
      return reply(`❌ Reply to media or text to post as group status\n📌 *Usage:* ${ctx.prefix}gcstatus`)
    }

    await sock.sendMessage(ctx.from, { react: { text: '⏳', key: msg.key } })

    try {
      const qType = ctx.quotedType
      let statusPayload = {}

      // Handle Images
      if (qType === 'imageMessage') {
        const mediaBuffer = await downloadMediaMessage(
          ctx.quoted,
          'buffer',
          {},
          { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} }) } }
        )
        
        statusPayload = {
          groupStatusMessage: {
            image: mediaBuffer,
            caption: ctx.query || ''
          }
        }
      }
      // Handle Videos
      else if (qType === 'videoMessage') {
        const mediaBuffer = await downloadMediaMessage(
          ctx.quoted,
          'buffer',
          {},
          { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} }) } }
        )
        
        statusPayload = {
          groupStatusMessage: {
            video: mediaBuffer,
            caption: ctx.query || ''
          }
        }
      }
      // Handle Audio
      else if (qType === 'audioMessage') {
        const mediaBuffer = await downloadMediaMessage(
          ctx.quoted,
          'buffer',
          {},
          { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} }) } }
        )
        
        statusPayload = {
          groupStatusMessage: {
            audio: mediaBuffer,
            ptt: false
          }
        }
      }
      // Handle Text
      else if (qType === 'conversation' || qType === 'extendedTextMessage') {
        const textContent = ctx.quotedBody
        if (!textContent) return reply('❌ Quoted message has no text content.')
        
        // Random background colors (hex colors)
        const bgColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#33FFF5', '#F5FF33', '#9933FF']
        const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)]
        
        statusPayload = {
          groupStatusMessage: {
            text: textContent,
            backgroundColor: randomBg,
            font: Math.floor(Math.random() * 5)
          }
        }
      }
      else {
        return reply('❌ Unsupported type. Reply to image/video/audio/text.')
      }

      // Send directly (Joy's approach)
      await sock.sendMessage(ctx.from, statusPayload)
      await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })

    } catch (e) {
      console.error('[gcstatus]', e)
      await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
      reply(`❌ Failed: ${e.message}`)
    }
  }
}
