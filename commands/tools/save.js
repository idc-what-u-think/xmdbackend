// commands/tools/save.js
// .save — reply to someone's status to download and send it in the current chat

import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const toBuffer = async (mediaMsg, type) => {
  const stream = await downloadContentFromMessage(mediaMsg, type)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default [
  {
    command: 'save',
    aliases: ['savestatus', 'dlstatus', 'getstatus'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const quotedMsg  = ctx.quoted?.message
      const quotedType = ctx.quotedType

      if (!quotedMsg) {
        return sock.sendMessage(ctx.from, {
          text: [
            `💾 *Save Status*`,
            `${'─'.repeat(28)}`,
            ``,
            `Reply to someone's status with *${ctx.prefix}save* to download it here.`,
            ``,
            `*Supports:* Photos, Videos, Audio, GIFs`,
          ].join('\n')
        }, { quoted: msg })
      }

      const wait = await sock.sendMessage(ctx.from, { text: '⬇️ Saving status...' }, { quoted: msg })

      try {
        // ── Image ──────────────────────────────────────────────────────────
        if (quotedType === 'imageMessage') {
          const imageMsg = quotedMsg.imageMessage
          const buf = await toBuffer(imageMsg, 'image')

          await sock.sendMessage(ctx.from, {
            image:   buf,
            caption: imageMsg.caption || '💾 Saved status',
          })
          await sock.sendMessage(ctx.from, { delete: wait.key })
          return
        }

        // ── Video / GIF ────────────────────────────────────────────────────
        if (quotedType === 'videoMessage') {
          const videoMsg = quotedMsg.videoMessage
          const buf = await toBuffer(videoMsg, 'video')

          await sock.sendMessage(ctx.from, {
            video:    buf,
            caption:  videoMsg.caption || '💾 Saved status',
            mimetype: videoMsg.mimetype || 'video/mp4',
            gifPlayback: videoMsg.gifPlayback || false,
          })
          await sock.sendMessage(ctx.from, { delete: wait.key })
          return
        }

        // ── Audio ──────────────────────────────────────────────────────────
        if (quotedType === 'audioMessage') {
          const audioMsg = quotedMsg.audioMessage
          const buf = await toBuffer(audioMsg, 'audio')

          await sock.sendMessage(ctx.from, {
            audio:    buf,
            mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
            ptt:      false,
          })
          await sock.sendMessage(ctx.from, { delete: wait.key })
          return
        }

        // ── Text status ────────────────────────────────────────────────────
        if (quotedType === 'conversation' || quotedType === 'extendedTextMessage') {
          const text = ctx.quotedBody?.trim()
          if (!text) throw new Error('No text found in status')

          await sock.sendMessage(ctx.from, {
            edit: wait.key,
            text: `💾 *Saved Status*\n\n${text}`
          })
          return
        }

        throw new Error(`Unsupported status type: ${quotedType}`)

      } catch (err) {
        const isDecrypt = err.message?.includes('Bad MAC') || err.message?.includes('decrypt')
        await sock.sendMessage(ctx.from, {
          edit: wait.key,
          text: isDecrypt
            ? `❌ Can't download this status.\n\n_It may have expired or been deleted by the sender._`
            : `❌ Failed to save status: ${err.message}`
        })
      }
    }
  }
]
