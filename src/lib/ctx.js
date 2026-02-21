// src/lib/ctx.js
// Extracts everything useful from a raw Baileys message
// and returns a clean ctx object that every command handler receives.

import { getContentType, jidNormalizedUser } from '@whiskeysockets/baileys'

export const buildCtx = async (sock, msg, groupCache, planCache) => {
  const key     = msg.key
  const from    = key.remoteJid || ''
  const isGroup = from.endsWith('@g.us')
  const fromMe  = key.fromMe || false

  // Normalize sender — handles @s.whatsapp.net and @lid (Baileys v7+)
  const rawSender = isGroup ? (key.participant || '') : from
  const sender    = jidNormalizedUser(rawSender) || rawSender
  const senderNumber = sender.split('@')[0]

  const botId     = jidNormalizedUser(sock.user?.id || '') || ''
  const botNumber = botId.split('@')[0]

  const OWNER  = (process.env.OWNER_NUMBER || '') + '@s.whatsapp.net'
  const PREFIX = process.env.PREFIX || '.'

  // ── Message content ────────────────────────────────────
  const content = msg.message || {}
  const type    = getContentType(content) || ''

  // Extract text from any message type that can carry text
  const text =
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    content?.documentMessage?.caption ||
    content?.buttonsResponseMessage?.selectedButtonId ||
    content?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    content?.templateButtonReplyMessage?.selectedId ||
    ''

  // ── Command parsing ────────────────────────────────────
  const isCmd  = text.startsWith(PREFIX)
  const body   = text
  const [rawCmd = '', ...argArr] = text.slice(PREFIX.length).trim().split(/\s+/)
  const command = rawCmd.toLowerCase()
  const args    = argArr
  const query   = args.join(' ')

  // ── Quoted message ─────────────────────────────────────
  const ctxInfo    = content?.extendedTextMessage?.contextInfo || {}
  const quotedMsg  = ctxInfo.quotedMessage || null
  const quoted     = quotedMsg
    ? { key: { remoteJid: from, id: ctxInfo.stanzaId, participant: ctxInfo.participant }, message: quotedMsg }
    : null
  const quotedType   = quoted ? (getContentType(quoted.message) || null) : null
  const quotedSender = ctxInfo.participant || ''
  const quotedBody   =
    quotedMsg?.conversation ||
    quotedMsg?.extendedTextMessage?.text ||
    quotedMsg?.imageMessage?.caption ||
    quotedMsg?.videoMessage?.caption ||
    ''

  const mentionedJids = ctxInfo.mentionedJid || []

  // ── Group metadata ─────────────────────────────────────
  let groupMeta  = null
  let isAdmin    = false
  let isBotAdmin = false

  if (isGroup) {
    groupMeta = groupCache.get(from) || null
    if (!groupMeta) {
      try {
        groupMeta = await sock.groupMetadata(from)
        groupCache.set(from, groupMeta)
      } catch {}
    }

    const parts = groupMeta?.participants || []
    isAdmin    = parts.some(p => p.id === sender && ['admin', 'superadmin'].includes(p.admin))
    isBotAdmin = parts.some(p => p.id === botId  && ['admin', 'superadmin'].includes(p.admin))
  }

  // ── Permissions ────────────────────────────────────────
  const isOwner   = sender === OWNER
  const plan      = planCache.get(sender) || 'free'
  const isPremium = ['premium', 'sudo'].includes(plan) || isOwner
  const isSudo    = plan === 'sudo' || isOwner
  const isBanned  = plan === 'banned'

  return {
    // Identity
    from, sender, senderNumber, botId, botNumber,
    pushName: msg.pushName || '',
    prefix: PREFIX,
    botName: process.env.BOT_NAME || 'Firekid XMD',

    // Message
    type, text, body, command, args, query,
    isCmd, isGroup, fromMe,

    // Quoted
    quoted, quotedType, quotedBody, quotedSender,
    mentionedJids,

    // Group
    groupMeta, isAdmin, isBotAdmin,

    // Permissions
    isOwner, isSudo, isPremium, isBanned, plan,
  }
}
