import { setModeMemory, addSudoMemory, delSudoMemory } from '../../src/lib/handler.js'
import { lidPhoneCache } from '../../src/lib/ctx.js'

// ── Resolve a real phone number from a possibly-@lid JID ─────────────────────
// When owner does .sudo @user inside a LID group, ctx.mentionedJids[0] is
// something like "99123456@lid". We must store the real phone number in the
// DB (e.g. "2348xxx@s.whatsapp.net"), not the LID digits.
//
// Resolution order:
//   1. If already @s.whatsapp.net — digits are correct, use them directly
//   2. groupMeta.participants[x].pn — Baileys v7 sets this for LID participants
//   3. lidPhoneCache — populated by contacts.upsert / onWhatsApp() at startup
//   4. Fallback — LID digits (wrong for LID groups, but prevents a hard crash)
const resolveToPhone = (jid, groupMeta) => {
  if (!jid) return null
  if (!jid.endsWith('@lid')) {
    // Already a phone-format JID — just strip domain
    return jid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'
  }
  // Try group participant list first
  if (groupMeta?.participants) {
    const p = groupMeta.participants.find(pt => pt.id === jid)
    if (p?.pn) return p.pn.replace(/\D/g, '') + '@s.whatsapp.net'
  }
  // Try in-process LID cache
  if (lidPhoneCache.has(jid)) return lidPhoneCache.get(jid) + '@s.whatsapp.net'
  // Last resort — use raw LID digits (will be wrong for Nigerian numbers etc.)
  return jid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'
}

export default [
  {
    command: 'mode-public',
    aliases: ['public', 'publicmode'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      // Update memory FIRST — takes effect instantly for all incoming messages
      setModeMemory('public')
      // Persist to KV in background (survives restarts)
      api.sessionSet('bot:mode', 'public').catch(() => {})
      await sock.sendMessage(ctx.from, {
        text: [
          `🌍 *Bot Mode: PUBLIC*`, ``,
          `✅ Everyone can now use the bot.`,
          `All commands are accessible to all users.`, ``,
          `_Use ${ctx.prefix}mode-private to restrict access_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'mode-private',
    aliases: ['private', 'privatemode'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      // Update memory FIRST — takes effect instantly
      setModeMemory('private')
      // Persist to KV in background
      api.sessionSet('bot:mode', 'private').catch(() => {})
      await sock.sendMessage(ctx.from, {
        text: [
          `🔒 *Bot Mode: PRIVATE*`, ``,
          `✅ Bot is now restricted to owner only.`,
          `Other users will be ignored immediately.`, ``,
          `_Sudo users can still use the bot in private mode._`,
          `_Use ${ctx.prefix}mode-public to open access_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── sudo ─────────────────────────────────────────────────────────────────
  {
    command: 'sudo',
    aliases: ['addsudo', 'addmod'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user to grant sudo.\n📌 *Usage:* ${ctx.prefix}sudo @user`
      }, { quoted: msg })

      if (targetJid === ctx.sender || targetJid === ctx.senderStorageJid)
        return sock.sendMessage(ctx.from, { text: '❌ You are already the owner — no need to add yourself as sudo.' }, { quoted: msg })

      // Resolve real phone JID — critical when targetJid is @lid
      const normalised = resolveToPhone(targetJid, ctx.groupMeta)
      if (!normalised) return sock.sendMessage(ctx.from, {
        text: '❌ Could not resolve this user\'s phone number. Try running the command in a DM or non-LID group.'
      }, { quoted: msg })

      const res = await api.setPlan(normalised, 'sudo')
      if (!res?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to grant sudo. Worker error: ${res?.error || 'unknown'}`
      }, { quoted: msg })

      const listRes = await api.sessionGet('sudo_list')
      const sudoList = listRes?.value ? JSON.parse(listRes.value) : []
      if (!sudoList.includes(normalised)) {
        sudoList.push(normalised)
        await api.sessionSet('sudo_list', JSON.stringify(sudoList))
      }

      // ── Keep in-memory sudo list in sync so private mode gate works instantly ──
      addSudoMemory(normalised)

      // Show the real phone number so owner can confirm it resolved correctly
      const displayNum = normalised.replace('@s.whatsapp.net', '')
      await sock.sendMessage(ctx.from, {
        text: [
          `✅ *Sudo Access Granted*`, ``,
          `👤 @${targetJid.split('@')[0]} is now a sudo user.`,
          `📱 Stored as: +${displayNum}`, ``,
          `They can now use restricted commands even in private mode.`,
          `_Sudo users: ${sudoList.length}_`
        ].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  // ── delsudo ───────────────────────────────────────────────────────────────
  {
    command: 'delsudo',
    aliases: ['removesudo', 'unmod', 'rmsudo'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user to remove sudo.\n📌 *Usage:* ${ctx.prefix}delsudo @user`
      }, { quoted: msg })

      // Resolve real phone JID — same fix as sudo
      const normalised = resolveToPhone(targetJid, ctx.groupMeta)
      if (!normalised) return sock.sendMessage(ctx.from, {
        text: '❌ Could not resolve this user\'s phone number.'
      }, { quoted: msg })

      const res = await api.setPlan(normalised, 'free')
      if (!res?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to remove sudo. Worker error: ${res?.error || 'unknown'}`
      }, { quoted: msg })

      const listRes = await api.sessionGet('sudo_list')
      const sudoList = listRes?.value ? JSON.parse(listRes.value) : []
      const updated = sudoList.filter(j => j !== normalised)
      await api.sessionSet('sudo_list', JSON.stringify(updated))

      // ── Keep in-memory sudo list in sync ──
      delSudoMemory(normalised)

      await sock.sendMessage(ctx.from, {
        text: [
          `✅ *Sudo Access Removed*`, ``,
          `👤 @${targetJid.split('@')[0]} is no longer a sudo user.`,
          `_Sudo users remaining: ${updated.length}_`
        ].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  // ── listsudo ──────────────────────────────────────────────────────────────
  {
    command: 'listsudo',
    aliases: ['sudolist', 'mods', 'listmods'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.sessionGet('sudo_list')
      const sudoList = res?.value ? JSON.parse(res.value) : []

      if (!sudoList.length) return sock.sendMessage(ctx.from, {
        text: [`👥 *Sudo Users — Empty*`, ``, `No sudo users yet.`, `Add one with ${ctx.prefix}sudo @user`].join('\n')
      }, { quoted: msg })

      // sudoList entries are always @s.whatsapp.net now (fixed phone numbers)
      const lines = sudoList.map((jid, i) => {
        const num = jid.replace('@s.whatsapp.net', '')
        return `${i + 1}. +${num}`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `👥 *Sudo Users (${sudoList.length})*`, `${'─'.repeat(26)}`, ``,
          `👑 Owner: +${ctx.ownerNumber} *(permanent)*`, ``,
          ...lines, ``,
          `_Remove with ${ctx.prefix}delsudo @user_`
        ].join('\n'),
        mentions: sudoList
      }, { quoted: msg })
    }
  },
]
