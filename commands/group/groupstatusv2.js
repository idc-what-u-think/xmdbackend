import { generateWAMessageContent, generateWAMessageFromContent, downloadContentFromMessage } from '@whiskeysockets/baileys'
import crypto from 'crypto'

// Purple color for text statuses
const PURPLE_COLOR = '#9C27B0'

export default {
  command: 'groupstatus',
  aliases: ['togstatus', 'swgc', 'gs'],
  groupOnly: true,
  adminOnly: true,
  handler: async (sock, msg, ctx, { api }) => {
    const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

    const caption = ctx.query || ''

    // CASE 1: No quoted message -> TEXT group status
    if (!ctx.quoted) {
      if (!caption) {
        return reply(
          '📝 *Group Status Usage*\n\n' +
          '• Reply to image/video/audio with:\n' +
          `  ${ctx.prefix}groupstatus [optional caption]\n` +
          '• Or send text status only:\n' +
          `  ${ctx.prefix}groupstatus Your text here\n\n` +
          'Text statuses use purple background by default.'
        )
      }

      await sock.sendMessage(ctx.from, { react: { text: '⏳', key: msg.key } })

      try {
        await groupStatus(sock, ctx.from, {
          text: caption,
          backgroundColor: PURPLE_COLOR,
        })
        await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })
        return reply('✅ Text group status posted!')
      } catch (e) {
        console.error('[groupstatus] text error:', e)
        await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
        return reply('❌ Failed to post text group status: ' + e.message)
      }
    }

    // CASE 2: Quoted media -> image/video/audio group status
    const qType = ctx.quotedType

    await sock.sendMessage(ctx.from, { react: { text: '⏳', key: msg.key } })

    // Download media buffer
    const downloadBuf = async () => {
      const qmsg = ctx.quoted.message
      if (qType === 'imageMessage')   return await downloadMedia(qmsg, 'image')
      if (qType === 'videoMessage')   return await downloadMedia(qmsg, 'video')
      if (qType === 'audioMessage')   return await downloadMedia(qmsg, 'audio')
      if (qType === 'stickerMessage') return await downloadMedia(qmsg, 'sticker')
      return null
    }

    // IMAGE / STICKER
    if (qType === 'imageMessage' || qType === 'stickerMessage') {
      let buf
      try {
        buf = await downloadBuf()
      } catch {
        await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
        return reply('❌ Failed to download image')
      }
      if (!buf) return reply('❌ Could not download image')

      try {
        await groupStatus(sock, ctx.from, {
          image: buf,
          caption: caption || '',
        })
        await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })
        return reply('✅ Image group status posted!')
      } catch (e) {
        console.error('[groupstatus] image error:', e)
        await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
        return reply('❌ Failed to post image group status: ' + e.message)
      }
    }

    // VIDEO
    if (qType === 'videoMessage') {
      let buf
      try {
        buf = await downloadBuf()
      } catch {
        await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
        return reply('❌ Failed to download video')
      }
      if (!buf) return reply('❌ Could not download video')

      try {
        await groupStatus(sock, ctx.from, {
          video: buf,
          caption: caption || '',
        })
        await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })
        return reply('✅ Video group status posted!')
      } catch (e) {
        console.error('[groupstatus] video error:', e)
        await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
        return reply('❌ Failed to post video group status: ' + e.message)
      }
    }

    // AUDIO
    if (qType === 'audioMessage') {
      let buf
      try {
        buf = await downloadBuf()
      } catch {
        await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
        return reply('❌ Failed to download audio')
      }
      if (!buf) return reply('❌ Could not download audio')

      try {
        await groupStatus(sock, ctx.from, {
          audio: buf,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
        })
        await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })
        return reply('✅ Audio group status posted!')
      } catch (e) {
        console.error('[groupstatus] audio error:', e)
        await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
        return reply('❌ Failed to post audio group status: ' + e.message)
      }
    }

    return reply('❌ Unsupported media type. Reply to an image, video, or audio.')
  }
}

// ---- Helpers ----

async function downloadMedia(msg, type) {
  const mediaMsg = msg[`${type}Message`] || msg
  const stream = await downloadContentFromMessage(mediaMsg, type)
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// THE CRITICAL FUNCTION WITH messageSecret!
async function groupStatus(sock, jid, content) {
  const { backgroundColor } = content
  delete content.backgroundColor

  // Step 1: Generate message content
  const inside = await generateWAMessageContent(content, {
    upload: sock.waUploadToServer,
    backgroundColor: backgroundColor || PURPLE_COLOR,
  })

  // Step 2: Generate random 32-byte secret (THIS IS THE KEY!)
  const secret = crypto.randomBytes(32)

  // Step 3: Wrap in groupStatusMessageV2 with messageSecret in BOTH places
  const msg = generateWAMessageFromContent(
    jid,
    {
      messageContextInfo: { messageSecret: secret },  // ← SECRET #1
      groupStatusMessageV2: {
        message: {
          ...inside,
          messageContextInfo: { messageSecret: secret },  // ← SECRET #2
        },
      },
    },
    {}
  )

  // Step 4: Relay the message
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
  return msg
}
