import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const extractViewOnce = (quotedMsg) => {
  const wrappers = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']
  for (const wrapper of wrappers) {
    if (quotedMsg[wrapper]) {
      const inner = quotedMsg[wrapper].message
      if (inner?.imageMessage) return { msg: inner.imageMessage, type: 'image' }
      if (inner?.videoMessage) return { msg: inner.videoMessage, type: 'video' }
    }
  }
  if (quotedMsg.imageMessage?.viewOnce) return { msg: quotedMsg.imageMessage, type: 'image' }
  if (quotedMsg.videoMessage?.viewOnce)  return { msg: quotedMsg.videoMessage, type: 'video' }
  if (quotedMsg.imageMessage) return { msg: quotedMsg.imageMessage, type: 'image' }
  if (quotedMsg.videoMessage) return { msg: quotedMsg.videoMessage, type: 'video' }
  return null
}

const vvHandler = async (sock, msg, ctx, { api }) => {
  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (!quotedMsg) {
    return sock.sendMessage(ctx.from, {
      text: `❌ Reply to a view once message.\n\n_Supports view once photos and videos._`
    }, { quoted: msg })
  }
  const extracted = extractViewOnce(quotedMsg)
  if (!extracted) {
    return sock.sendMessage(ctx.from, {
      text: `❌ Not a view once message.\n\nSupported: view once photos and videos.`
    }, { quoted: msg })
  }
  const { msg: viewOnceMsg, type: mediaType } = extracted
  let buffer
  try {
    const stream = await downloadContentFromMessage(viewOnceMsg, mediaType)
    buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }
  } catch (err) {
    const isDecrypt = err.message?.includes('Bad MAC') || err.message?.includes('decrypt')
    return sock.sendMessage(ctx.from, {
      text: isDecrypt
        ? `❌ Cannot decrypt this message.\n\n_Possible reasons:_\n• Already viewed\n• Message expired\n• Encryption error\n\n_Ask sender to resend._`
        : `❌ Download failed: ${err.message}`
    }, { quoted: msg })
  }
  if (!buffer || buffer.length === 0) {
    return sock.sendMessage(ctx.from, {
      text: `❌ Downloaded empty file. Message may be expired or corrupted.`
    }, { quoted: msg })
  }
  if (mediaType === 'image') {
    await sock.sendMessage(ctx.from, {
      image: buffer,
      caption: viewOnceMsg.caption || '📸 View once revealed'
    }, { quoted: msg })
  } else {
    await sock.sendMessage(ctx.from, {
      video: buffer,
      caption: viewOnceMsg.caption || '🎥 View once revealed',
      mimetype: viewOnceMsg.mimetype || 'video/mp4'
    }, { quoted: msg })
  }
}

export default [
  {
    command: 'vv',
    aliases: ['viewonce', 'reveal', 'vo'],
    category: 'tools',
    handler: vvHandler
  },

  {
    command: 'vv2',
    aliases: ['revealvideo', 'vov'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      if (!quotedMsg) {
        await sock.sendMessage(ctx.from, { delete: msg.key })
        return
      }
      const extracted = extractViewOnce(quotedMsg)
      if (!extracted) {
        await sock.sendMessage(ctx.from, { delete: msg.key })
        return
      }
      const { msg: viewOnceMsg, type: mediaType } = extracted
      let buffer
      try {
        const stream = await downloadContentFromMessage(viewOnceMsg, mediaType)
        buffer = Buffer.from([])
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])
        }
      } catch {
        await sock.sendMessage(ctx.from, { delete: msg.key })
        return
      }
      if (!buffer || buffer.length === 0) {
        await sock.sendMessage(ctx.from, { delete: msg.key })
        return
      }

      // Send to owner self-chat (your own chat with yourself)
      const selfJid = (process.env.OWNER_NUMBER || ctx.ownerNumber) + '@s.whatsapp.net'
      const origin = ctx.isGroup
        ? (ctx.groupMeta?.subject || 'a group')
        : `+${ctx.senderNumber}`

      if (mediaType === 'image') {
        await sock.sendMessage(selfJid, {
          image:   buffer,
          caption: viewOnceMsg.caption || `📸 View once from ${origin}`
        })
      } else {
        await sock.sendMessage(selfJid, {
          video:    buffer,
          caption:  viewOnceMsg.caption || `🎥 View once from ${origin}`,
          mimetype: viewOnceMsg.mimetype || 'video/mp4'
        })
      }

      // Silently delete the .vv2 command from the chat
      await sock.sendMessage(ctx.from, { delete: msg.key })
    }
  },

  {
    command: 'tempmail',
    aliases: ['tmpmail', 'disposablemail', 'fakemail'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const sub = ctx.args[0]?.toLowerCase()
      if (sub === 'delete' || sub === 'clear' || sub === 'reset') {
        await api.sessionDelete(`tempmail:${ctx.sender}`)
        return sock.sendMessage(ctx.from, {
          text: `🗑️ Temp mail cleared. Use ${ctx.prefix}tempmail to generate a new one.`
        }, { quoted: msg })
      }
      const existing = await api.sessionGet(`tempmail:${ctx.sender}`)
      if (existing?.value && sub !== 'new' && sub !== 'refresh') {
        const data = JSON.parse(existing.value)
        return sock.sendMessage(ctx.from, {
          text: [
            `📧 *Your Temp Mail*`,
            `${'─'.repeat(28)}`,
            ``,
            `📬 ${data.email}`,
            ``,
            `_Generated: ${data.created}_`,
            ``,
            `• ${ctx.prefix}tempmail-inbox — check messages`,
            `• ${ctx.prefix}tempmail new — generate new address`,
            `• ${ctx.prefix}tempmail delete — clear address`
          ].join('\n')
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '📧 Generating temporary email...' }, { quoted: msg })
      try {
        const res = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1')
        if (!res.ok) throw new Error('1secmail failed')
        const [email] = await res.json()
        if (!email) throw new Error('No email returned')
        const [login, domain] = email.split('@')
        const data = { email, login, domain, created: new Date().toLocaleString() }
        await api.sessionSet(`tempmail:${ctx.sender}`, JSON.stringify(data))
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          text: [
            `📧 *Temp Mail Created!*`,
            `${'─'.repeat(28)}`,
            ``,
            `📬 ${email}`,
            ``,
            `_Copy and use this email anywhere. Expires when you generate a new one._`,
            ``,
            `• ${ctx.prefix}tempmail-inbox — check for messages`,
            `• ${ctx.prefix}tempmail new — generate new address`,
            `• ${ctx.prefix}tempmail delete — clear address`,
            ``,
            `_⚠️ Emails received here are not private. Shared infrastructure._`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Failed to generate email: ${err.message}`
        })
      }
    }
  },

  {
    command: 'tempmail-inbox',
    aliases: ['tmpinbox', 'mailinbox', 'checkemail'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const saved = await api.sessionGet(`tempmail:${ctx.sender}`)
      if (!saved?.value) {
        return sock.sendMessage(ctx.from, {
          text: `❌ No temp email found.\n\nGenerate one first with ${ctx.prefix}tempmail`
        }, { quoted: msg })
      }
      const { email, login, domain } = JSON.parse(saved.value)
      const placeholder = await sock.sendMessage(ctx.from, { text: `📬 Checking inbox for ${email}...` }, { quoted: msg })
      try {
        const res = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`)
        if (!res.ok) throw new Error('Failed to fetch inbox')
        const messages = await res.json()
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        if (!messages.length) {
          return sock.sendMessage(ctx.from, {
            text: [
              `📬 *Inbox Empty*`,
              `${'─'.repeat(28)}`,
              ``,
              `📧 ${email}`,
              ``,
              `No messages yet. Check again in a moment.`,
              ``,
              `_Use ${ctx.prefix}tempmail-inbox to refresh_`
            ].join('\n')
          }, { quoted: msg })
        }
        const msgLines = [
          `📬 *Inbox: ${email}*`,
          `${'─'.repeat(28)}`,
          `📩 ${messages.length} message${messages.length > 1 ? 's' : ''}`,
          ``
        ]
        messages.slice(0, 5).forEach((m, i) => {
          msgLines.push(`*${i + 1}. ${m.subject || '(No subject)'}*`)
          msgLines.push(`  From: ${m.from}`)
          msgLines.push(`  Date: ${m.date}`)
          msgLines.push(`  ID: ${m.id}`)
          msgLines.push(``)
        })
        if (messages.length > 5) msgLines.push(`_...and ${messages.length - 5} more messages_`)
        const firstId = messages[0]?.id
        if (firstId) {
          try {
            const msgRes = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${firstId}`)
            if (msgRes.ok) {
              const fullMsg = await msgRes.json()
              const bodyText = (fullMsg.textBody || fullMsg.htmlBody?.replace(/<[^>]+>/g, '') || '').trim()
              if (bodyText) {
                msgLines.push(`*Latest Message Preview:*`)
                msgLines.push(bodyText.slice(0, 400) + (bodyText.length > 400 ? '...' : ''))
              }
            }
          } catch { }
        }
        await sock.sendMessage(ctx.from, { text: msgLines.join('\n') }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Failed to check inbox: ${err.message}`
        })
      }
    }
  }
]
