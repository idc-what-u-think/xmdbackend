// src/lib/ctx.js  (backend — xmdbackend)
// Extracts everything useful from a raw Baileys message.

import { getContentType, jidNormalizedUser } from '@whiskeysockets/baileys'

// ── JID helpers ─────────────────────────────────────────────────────────────
const numOf = (jid = '') => jid.split('@')[0].split(':')[0].replace(/\D/g, '')

export const toStorageJid = (phone = '') =>
  phone.replace(/\D/g, '') + '@s.whatsapp.net'

const jidMatch = (a = '', b = '') => {
  if (!a || !b) return false
  if (a === b)  return true
  const na = numOf(a), nb = numOf(b)
  return na.length > 4 && na === nb
}

const isParticipantAdmin = (parts = [], jid = '') =>
  parts.some(p => jidMatch(p.id, jid) && ['admin', 'superadmin'].includes(p.admin))

// ── @lid → real phone resolution ────────────────────────────────────────────
const lidPhoneCache = new Map()

async function resolvePhone(sock, jid) {
  if (!jid) return ''

  // Already phone-number JID — just extract digits
  if (!jid.endsWith('@lid')) return numOf(jid)

  // Check in-process cache first
  if (lidPhoneCache.has(jid)) return lidPhoneCache.get(jid)

  // Ask Baileys' internal LID mapping store
  try {
    const pn = await sock?.signalRepository?.lidMapping?.getPNForLID?.(jid)
    if (pn) {
      const phone = numOf(pn)
      if (phone.length > 4) {
        lidPhoneCache.set(jid, phone)
        return phone
      }
    }
  } catch { /* mapping may not be populated yet */ }

  return numOf(jid)
}

// ── Main context builder ─────────────────────────────────────────────────────
export const buildCtx = async (sock, msg, groupCache, planCache) => {
  const key     = msg.key
  const from    = key.remoteJid || ''
  const isGroup = from.endsWith('@g.us')
  const fromMe  = key.fromMe || false

  const rawSender = isGroup ? (key.participant || '') : from
  const sender    = jidNormalizedUser(rawSender) || rawSender

  // ── Resolve real phone (handles @lid) ───────────────────────────────────
  const senderNumber     = await resolvePhone(sock, sender)
  const senderStorageJid = toStorageJid(senderNumber) || sender

  const botRaw    = sock.user?.id || ''
  const botId     = jidNormalizedUser(botRaw) || botRaw
  const botNumber = numOf(botId)

  const OWNER_NUMBER = (process.env.OWNER_NUMBER || '').replace(/\D/g, '')
  const PREFIX       = process.env.PREFIX || '.'

  // ── Message content ────────────────────────────────────────────────────
  const content = msg.message || {}
  const type    = getContentType(content) || ''

  const text =
    content?.conversation                                          ||
    content?.extendedTextMessage?.text                            ||
    content?.imageMessage?.caption                                ||
    content?.videoMessage?.caption                                ||
    content?.documentMessage?.caption                             ||
    content?.buttonsResponseMessage?.selectedButtonId             ||
    content?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    content?.templateButtonReplyMessage?.selectedId               ||
    ''

  // ── Command parsing ────────────────────────────────────────────────────
  const isCmd  = text.startsWith(PREFIX)
  const body   = text
  const [rawCmd = '', ...argArr] = text.slice(PREFIX.length).trim().split(/\s+/)
  const command = rawCmd.toLowerCase()
  const args    = argArr
  const query   = args.join(' ')

  // ── Quoted message ─────────────────────────────────────────────────────
  const ctxInfo    = content?.extendedTextMessage?.contextInfo || {}
  const quotedMsg  = ctxInfo.quotedMessage || null
  const quoted     = quotedMsg
    ? { key: { remoteJid: from, id: ctxInfo.stanzaId, participant: ctxInfo.participant }, message: quotedMsg }
    : null
  const quotedType   = quoted ? (getContentType(quoted.message) || null) : null
  const quotedSender = ctxInfo.participant || ''
  const quotedBody   =
    quotedMsg?.conversation              ||
    quotedMsg?.extendedTextMessage?.text ||
    quotedMsg?.imageMessage?.caption     ||
    quotedMsg?.videoMessage?.caption     ||
    ''

  const mentionedJids = ctxInfo.mentionedJid || []

  // ── Group metadata ─────────────────────────────────────────────────────
  let groupMeta  = null
  let isAdmin    = false
  let isBotAdmin = false

  if (isGroup) {
    groupMeta = groupCache.get(from) || null
    if (!groupMeta) {
      try {
        groupMeta = await sock.groupMetadata(from)
        groupCache.set(from, groupMeta)
      } catch (e) {
        console.error('[ctx] groupMetadata failed:', e.message)
      }
    }

    if (groupMeta?.participants) {
      const parts = groupMeta.participants

      isAdmin    = isParticipantAdmin(parts, sender)
      isBotAdmin = isParticipantAdmin(parts, botId)

      // Secondary check by resolved phone digits — catches @lid groups
      if (!isAdmin && senderNumber) {
        isAdmin = parts.some(p =>
          numOf(p.id) === senderNumber && ['admin', 'superadmin'].includes(p.admin)
        )
      }
      if (!isBotAdmin && botNumber) {
        isBotAdmin = parts.some(p =>
          numOf(p.id) === botNumber && ['admin', 'superadmin'].includes(p.admin)
        )
      }
    }
  }

  // ── Permissions ────────────────────────────────────────────────────────
  // isOwner uses RESOLVED senderNumber (real phone digits, not raw @lid)
  // This fixes the @lid bug where isOwner was always false for @lid senders
  const isOwner   = !!OWNER_NUMBER && senderNumber === OWNER_NUMBER
  const plan      = planCache.get(sender) || planCache.get(senderStorageJid) || 'free'
  const isPremium = ['premium', 'sudo'].includes(plan) || isOwner
  const isSudo    = plan === 'sudo' || isOwner
  const isBanned  = plan === 'banned'

  return {
    from, sender, senderNumber, senderStorageJid,
    botId, botNumber,
    pushName:    msg.pushName || '',
    prefix:      PREFIX,
    botName:     process.env.BOT_NAME || 'Firekid XMD',
    ownerNumber: OWNER_NUMBER,

    type, text, body, command, args, query,
    isCmd, isGroup, fromMe,

    quoted, quotedType, quotedBody, quotedSender,
    mentionedJids,

    groupMeta, isAdmin, isBotAdmin,
    isOwner, isSudo, isPremium, isBanned, plan,
  }
}
