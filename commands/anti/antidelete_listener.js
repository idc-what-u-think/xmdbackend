// commands/anti/antidelete_listener.js
// Imports shared state from antidelete.js (same category folder → rewritten by patchSource)

import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { state, msgCache, MAX_CACHE } from './antidelete.js'

const OWNER_JID = () =>
  (process.env.OWNER_NUMBER || '2348064610975') + '@s.whatsapp.net'

// Decide whether we should forward a deletion from this JID
const shouldForward = (jid) => {
  if (state.specific.has(jid)) return true
  const isGroup = jid.endsWith('@g.us')
  if (isGroup && state.g) return true
  if (!isGroup && state.p) return true
  return false
}

// Try to download and send cached media to selfJid
const trySendMedia = async (sock, selfJid, cached, headerText) => {
  const { msg: originalMsg } = cached
  const content = originalMsg?.message || {}

  const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
  let found = null
  for (const t of mediaTypes) {
    if (content[t]) { found = { key: t, msg: content[t] }; break }
  }

  if (!found) {
    // Text only
    const text =
      content.conversation ||
      content.extendedTextMessage?.text ||
      content.imageMessage?.caption ||
      content.videoMessage?.caption ||
      '[No text content]'
    return sock.sendMessage(selfJid, {
      text: `${headerText}\n\n💬 *Message:* ${text}`
    })
  }

  // Media — map key to baileys media type
  const typeMap = {
    imageMessage:    'image',
    videoMessage:    'video',
    audioMessage:    'audio',
    documentMessage: 'document',
    stickerMessage:  'sticker',
  }
  const mediaType = typeMap[found.key] || 'image'
  const mediaMsg  = found.msg

  try {
    const stream = await downloadContentFromMessage(mediaMsg, mediaType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

    if (!buffer.length) throw new Error('empty')

    const sendOpts = {}
    if (mediaType === 'image')    sendOpts.image    = buffer
    if (mediaType === 'video')    sendOpts.video    = buffer
    if (mediaType === 'audio')    sendOpts.audio    = buffer
    if (mediaType === 'document') sendOpts.document = buffer
    if (mediaType === 'sticker')  sendOpts.sticker  = buffer

    if (mediaType !== 'sticker' && mediaType !== 'audio') {
      sendOpts.caption = headerText + (mediaMsg.caption ? `\n\n💬 *Caption:* ${mediaMsg.caption}` : '')
    }
    if (mediaType === 'audio')    sendOpts.mimetype = mediaMsg.mimetype || 'audio/ogg; codecs=opus'
    if (mediaType === 'document') {
      sendOpts.fileName = mediaMsg.fileName || 'file'
      sendOpts.caption  = headerText
    }

    await sock.sendMessage(selfJid, sendOpts)
  } catch {
    // CDN expired — just send notification
    const typeLabel = {
      imageMessage:    '🖼️ Image',
      videoMessage:    '🎥 Video',
      audioMessage:    '🎙️ Voice/Audio',
      documentMessage: '📁 Document',
      stickerMessage:  '🎭 Sticker',
    }[found.key] || '📎 Media'

    await sock.sendMessage(selfJid, {
      text: `${headerText}\n\n${typeLabel} _(media expired — can't retrieve)_`
    })
  }
}

const onMessage = async (sock, msg, ctx) => {
  // ── 1. Detect a delete (revoke) event ──────────────────────────────────────
  const proto = msg.message?.protocolMessage
  if (proto?.type === 0 && proto?.key) {
    const deletedKey = proto.key
    const deletedId  = deletedKey.id

    // Only forward if antidelete is active for this chat
    if (!shouldForward(ctx.from)) return

    const cached = msgCache.get(deletedId)
    if (!cached) return // we never saw this message (bot wasn't online / too old)

    const selfJid = OWNER_JID()
    if (ctx.from === selfJid) return // don't forward self-chat deletions

    const isGroup   = ctx.from.endsWith('@g.us')
    const chatLabel = isGroup
      ? `👥 Group: *${ctx.groupMeta?.subject || ctx.from}*`
      : `👤 DM: *+${cached.senderNumber}* (${cached.pushName || ''})`

    const whoDeleted = deletedKey.fromMe
      ? '_(you deleted it)_'
      : ctx.isGroup
        ? `@${(ctx.sender || '').split('@')[0]}`
        : `+${cached.senderNumber}`

    const header = [
      `🗑️ *Deleted Message Caught*`,
      `${'─'.repeat(28)}`,
      ``,
      chatLabel,
      `🧑 *Deleted by:* ${whoDeleted}`,
      `🕐 *Time:* ${new Date(cached.timestamp).toLocaleString()}`,
    ].join('\n')

    await trySendMedia(sock, selfJid, cached, header)
    return
  }

  // ── 2. Cache every non-revoke message we see ───────────────────────────────
  // Skip if antidelete is completely off (no point caching)
  if (!state.p && !state.g && state.specific.size === 0) return
  // Skip protocol, poll, reaction etc.
  if (proto) return
  if (!msg.message) return

  const msgId = msg.key?.id
  if (!msgId) return

  msgCache.set(msgId, {
    msg:          msg,
    from:         ctx.from,
    sender:       ctx.sender,
    senderNumber: ctx.senderNumber,
    pushName:     ctx.pushName,
    timestamp:    Date.now(),
  })

  // Trim cache to prevent unbounded growth
  if (msgCache.size > MAX_CACHE) {
    const oldest = msgCache.keys().next().value
    msgCache.delete(oldest)
  }
}

export default { onMessage }
