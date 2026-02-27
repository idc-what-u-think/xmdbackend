// commands/tools/sendstatus.js
// .sendstatus — reply to any message (text/image/video) to repost it as your WA status
//
// ROOT CAUSE OF OLD BUG:
//   font/backgroundColor/statusJidList/broadcast were placed in the MESSAGE BODY (2nd arg).
//   Baileys requires them in the OPTIONS (3rd arg).
//   Also: statusJidList MUST be a real populated array — empty [] = nothing posts.
//
// FIX:
//   All status options moved to 3rd arg.
//   statusJidList built from sock.contacts (Baileys' internal contact store).

import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const toBuffer = async (msg, type) => {
  const stream = await downloadContentFromMessage(msg, type)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

// Build the statusJidList from Baileys' internal contact store.
// sock.contacts is populated from history sync automatically.
// Falls back to owner JID only if contacts haven't synced yet.
const getStatusJidList = (sock) => {
  const contacts = sock.contacts || {}
  const jids = Object.keys(contacts).filter(j => j.endsWith('@s.whatsapp.net'))
  if (jids.length > 0) return jids
  // Fallback — at minimum send to ourselves so the status actually posts
  const ownerJid = (process.env.OWNER_NUMBER || '2348064610975') + '@s.whatsapp.net'
  return [ownerJid]
}

const STATUS_OPTIONS = (sock) => ({
  broadcast:     true,
  statusJidList: getStatusJidList(sock),
})

export default [
  {
    command: 'sendstatus',
    aliases: ['poststatus', 'setstatus', 'mystatus'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const quotedMsg  = ctx.quoted?.message
      const quotedType = ctx.quotedType

      // ── Case 1: Reply to a message → post its content as status ────────────
      if (quotedMsg) {
        const ph = await sock.sendMessage(ctx.from, { text: '📢 Posting to your status...' }, { quoted: msg })

        try {
          // ── Text ──────────────────────────────────────────────────────────
          if (quotedType === 'conversation' || quotedType === 'extendedTextMessage') {
            const text = ctx.quotedBody?.trim()
            if (!text) throw new Error('No text found in quoted message')

            await sock.sendMessage(
              'status@broadcast',
              { text },
              { ...STATUS_OPTIONS(sock), backgroundColor: '#1DA462', font: 2 }
            )

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n📝 _"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"_\n\n_Visible to your WA contacts_`
            })
            return
          }

          // ── Image ──────────────────────────────────────────────────────────
          if (quotedType === 'imageMessage') {
            const imageMsg = quotedMsg.imageMessage
            const buf      = await toBuffer(imageMsg, 'image')
            const caption  = imageMsg.caption || ctx.query?.trim() || ''

            await sock.sendMessage(
              'status@broadcast',
              { image: buf, caption },
              STATUS_OPTIONS(sock)
            )

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n🖼️ Image status is now live.\n_Visible to your WA contacts_`
            })
            return
          }

          // ── Video ──────────────────────────────────────────────────────────
          if (quotedType === 'videoMessage') {
            const videoMsg = quotedMsg.videoMessage
            const secs     = videoMsg.seconds || 0
            if (secs > 30) throw new Error(`Video is ${secs}s — WhatsApp status limit is 30 seconds`)

            const buf     = await toBuffer(videoMsg, 'video')
            const caption = videoMsg.caption || ctx.query?.trim() || ''

            await sock.sendMessage(
              'status@broadcast',
              { video: buf, caption },
              STATUS_OPTIONS(sock)
            )

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n🎥 Video status is now live.\n_Visible to your WA contacts_`
            })
            return
          }

          // ── Audio ──────────────────────────────────────────────────────────
          if (quotedType === 'audioMessage') {
            const audioMsg = quotedMsg.audioMessage
            const buf      = await toBuffer(audioMsg, 'audio')

            await sock.sendMessage(
              'status@broadcast',
              { audio: buf, mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus', ptt: false },
              STATUS_OPTIONS(sock)
            )

            await sock.sendMessage(ctx.from, {
              edit: ph.key,
              text: `✅ *Status Posted!*\n\n🔊 Audio status is now live.\n_Visible to your WA contacts_`
            })
            return
          }

          // ── Sticker → post as image ────────────────────────────────────────
          if (quotedType === 'stickerMessage') {
            const stickerMsg = quotedMsg.stickerMessage
            const buf        = await toBuffer(stickerMsg, 'sticker')

            await sock.sendMessage(
              'status@broadcast',
              { image: buf },
              STATUS_OPTIONS(sock)
            )

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
          await sock.sendMessage(
            'status@broadcast',
            { text },
            { ...STATUS_OPTIONS(sock), backgroundColor: '#1DA462', font: 2 }
          )
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
