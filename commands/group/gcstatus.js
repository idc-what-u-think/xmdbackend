import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default {
  command: 'groupstatus',
  aliases: ['gstatus'],
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
      let fallbackPayload = {} // For groups without linked channels

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
        
        fallbackPayload = {
          image: mediaBuffer,
          caption: `📢 *GROUP ANNOUNCEMENT*\n\n${ctx.query || ''}`,
          mentions: ctx.groupMeta?.participants?.map(p => p.id) || []
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
        
        fallbackPayload = {
          video: mediaBuffer,
          caption: `📢 *GROUP ANNOUNCEMENT*\n\n${ctx.query || ''}`,
          mentions: ctx.groupMeta?.participants?.map(p => p.id) || []
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
        
        fallbackPayload = {
          audio: mediaBuffer,
          ptt: false,
          mimetype: 'audio/mp4'
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
        
        fallbackPayload = {
          text: `📢 *GROUP ANNOUNCEMENT*\n\n${textContent}`,
          mentions: ctx.groupMeta?.participants?.map(p => p.id) || []
        }
      }
      else {
        return reply('❌ Unsupported type. Reply to image/video/audio/text.')
      }

      // Try group status first, fallback to regular announcement
      try {
        await sock.sendMessage(ctx.from, statusPayload)
        await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })
      } catch (statusError) {
        // If group status fails (no linked channel), send as regular announcement
        console.log('[gcstatus] Group status failed, using fallback:', statusError.message)
        await sock.sendMessage(ctx.from, fallbackPayload)
        await sock.sendMessage(ctx.from, { react: { text: '📢', key: msg.key } })
      }

    } catch (e) {
      console.error('[gcstatus]', e)
      await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
      reply(`❌ Failed: ${e.message}`)
    }
  }
}
