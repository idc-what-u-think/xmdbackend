// commands/tools/sendstatus.js
// .sendstatus — reply to any message (text/image/video) to repost it as your WA status
// Uses sock.sendMessage('status@broadcast', ...) — supported in Baileys 6.7+
// Optional: .sendstatus <text>  — posts a text status directly

import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const toBuffer = async (msg, type) => {
  const stream = await downloadContentFromMessage(msg, type)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default [
  {
    command: 'sendstatus',
    aliases: ['poststatus', 'setstatus', 'status', 'mystatus'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const quotedMsg  = ctx.quoted?.message
      const quotedType = ctx.quotedType

      // ── Case 1: Reply to a message → post its content as status ────────────
      if (quotedMsg) {
        const ph = await sock.sendMessage(ctx.from, { text: '📢 Posting to your status...' }, { quoted: msg })

        try {
          // Text message
          if (quotedType === 'conversation' || quotedType === 'extendedTextMessage') {
            const text = ctx.quotedBody?.trim()
            if (!text) throw new Error('No text found in quoted message')

            await sock.sendMessage('status@broadcast', {
              text,
              font: 1,
              backgroundColor: '#1DA462',
            })

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n📝 _"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"_\n\n_Visible to your WA contacts_`
            })
            return
          }

          // Image message
          if (quotedType === 'imageMessage') {
            const imageMsg = quotedMsg.imageMessage
            const buf = await toBuffer(imageMsg, 'image')
            const caption = imageMsg.caption || ctx.query?.trim() || ''

            await sock.sendMessage('status@broadcast', {
              image: buf,
              caption,
            })

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n🖼️ Image status is now live.\n_Visible to your WA contacts_`
            })
            return
          }

          // Video message
          if (quotedType === 'videoMessage') {
            const videoMsg = quotedMsg.videoMessage
            // WhatsApp status videos must be ≤ 30 seconds
            const secs = videoMsg.seconds || 0
            if (secs > 30) throw new Error(`Video is ${secs}s — WhatsApp status limit is 30 seconds`)

            const buf = await toBuffer(videoMsg, 'video')
            const caption = videoMsg.caption || ctx.query?.trim() || ''

            await sock.sendMessage('status@broadcast', {
              video: buf,
              caption,
            })

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n🎥 Video status is now live.\n_Visible to your WA contacts_`
            })
            return
          }

          // Audio / voice note
          if (quotedType === 'audioMessage') {
            const audioMsg = quotedMsg.audioMessage
            const buf = await toBuffer(audioMsg, 'audio')

            await sock.sendMessage('status@broadcast', {
              audio: buf,
              mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
              ptt: audioMsg.ptt || false,
            })

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n🔊 Audio status is now live.\n_Visible to your WA contacts_`
            })
            return
          }

          // Sticker → convert to image for status
          if (quotedType === 'stickerMessage') {
            const stickerMsg = quotedMsg.stickerMessage
            const buf = await toBuffer(stickerMsg, 'sticker')

            await sock.sendMessage('status@broadcast', {
              image: buf,
            })

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n🖼️ Sticker posted as image status.\n_Visible to your WA contacts_`
            })
            return
          }

          throw new Error(`Unsupported media type: ${quotedType}`)

        } catch (err) {
          await sock.sendMessage(ctx.from, {
            edit: ph.key,
            text: `❌ Failed to post status: ${err.message}`
          })
        }
        return
      }

      // ── Case 2: Direct text status ──────────────────────────────────────────
      const text = ctx.query?.trim()
      if (text) {
        try {
          await sock.sendMessage('status@broadcast', {
            text,
            font: 1,
            backgroundColor: '#1DA462',
          })
          await sock.sendMessage(ctx.from, {
            text: `✅ *Status Posted!*\n\n📝 _"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"_\n\n_Visible to your WA contacts_`
          }, { quoted: msg })
        } catch (err) {
          await sock.sendMessage(ctx.from, {
            text: `❌ Failed to post status: ${err.message}`
          }, { quoted: msg })
        }
        return
      }

      // ── No input ────────────────────────────────────────────────────────────
      await sock.sendMessage(ctx.from, {
        text: [
          `📢 *Send Status*`,
          `${'─'.repeat(28)}`, ``,
          `*Usage:*`,
          `• ${ctx.prefix}sendstatus <text> — post a text status`,
          `• Reply to a message + ${ctx.prefix}sendstatus — repost it as status`, ``,
          `*Supports:* Text, Images, Videos (≤30s), Audio, Stickers`, ``,
          `_Status is visible to your WhatsApp contacts_`
        ].join('\n')
      }, { quoted: msg })
    }
  },
]
