import { addBlockMemory, delBlockMemory } from '../../src/lib/handler.js'

// ── Helper: resolve a raw JID (possibly @lid) to a phone-based JID ────────────
// Checks group participants first (Baileys v7 sets p.pn when id is a LID).
// Falls back to stripping digits from the JID itself (works for phone JIDs,
// last-resort for unresolved LIDs).
const resolveToPhoneJid = (targetJid, groupMeta) => {
  if (!targetJid) return null

  if (targetJid.endsWith('@lid') && groupMeta?.participants) {
    const match = groupMeta.participants.find(
      p => p.id === targetJid || p.id.split('@')[0] === targetJid.split('@')[0]
    )
    if (match?.pn) {
      const phone = match.pn.replace(/\D/g, '')
      if (phone.length > 4) return phone + '@s.whatsapp.net'
    }
  }

  const phone = targetJid.split('@')[0].split(':')[0].replace(/\D/g, '')
  return phone.length > 4 ? phone + '@s.whatsapp.net' : null
}

export default [
  // ── block (WA contact block + bot-level ignore) ───────────────────────────
  {
    command: 'block',
    aliases: ['botblock'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}block @user`
      }, { quoted: msg })

      // Resolve to real phone-based JID, handling @lid correctly
      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
      if (!normalised) return sock.sendMessage(ctx.from, {
        text: `❌ Could not resolve that user's phone number. Try again or use their contact JID.`
      }, { quoted: msg })

      // Self-block guard using resolved phone
      const senderPhone = ctx.senderNumber + '@s.whatsapp.net'
      if (normalised === senderPhone) return sock.sendMessage(ctx.from, {
        text: '❌ Cannot block yourself.'
      }, { quoted: msg })

      const res = await api.sessionGet('block_list')
      const blockList = res?.value ? JSON.parse(res.value) : []

      if (blockList.includes(normalised)) return sock.sendMessage(ctx.from, {
        text: `⚠️ +${normalised.split('@')[0]} is already blocked.`
      }, { quoted: msg })

      blockList.push(normalised)

      // 1. Update bot-level ignore list in memory immediately
      addBlockMemory(normalised)
      addBlockMemory(targetJid)

      // 2. Persist bot ignore list to KV
      api.sessionSet('block_list', JSON.stringify(blockList)).catch(() => {})

      // 3. Actually block the contact on WhatsApp
      try {
        await sock.updateBlockStatus(normalised, 'block')
      } catch (e) {
        console.error('[Block] WA block failed:', e.message)
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `🚫 *User Blocked*`, ``,
          `📵 +${normalised.split('@')[0]} has been blocked on WhatsApp`,
          `and can no longer use the bot.`, ``,
          `_Blocked users: ${blockList.length}_`, ``,
          `_Use ${ctx.prefix}unblock to restore access_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── unblock (WA unblock + remove from bot ignore list) ────────────────────
  {
    command: 'unblock',
    aliases: ['botunblock'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unblock @user`
      }, { quoted: msg })

      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
      if (!normalised) return sock.sendMessage(ctx.from, {
        text: `❌ Could not resolve that user's phone number.`
      }, { quoted: msg })

      const res = await api.sessionGet('block_list')
      let blockList = res?.value ? JSON.parse(res.value) : []

      if (!blockList.includes(normalised)) return sock.sendMessage(ctx.from, {
        text: `❌ +${normalised.split('@')[0]} is not in the block list.`
      }, { quoted: msg })

      blockList = blockList.filter(j => j !== normalised)

      // 1. Update memory immediately
      delBlockMemory(normalised)
      delBlockMemory(targetJid)

      // 2. Persist to KV
      api.sessionSet('block_list', JSON.stringify(blockList)).catch(() => {})

      // 3. Unblock on WhatsApp
      try {
        await sock.updateBlockStatus(normalised, 'unblock')
      } catch (e) {
        console.error('[Unblock] WA unblock failed:', e.message)
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `✅ *User Unblocked*`, ``,
          `+${normalised.split('@')[0]} has been unblocked on WhatsApp`,
          `and can use the bot again.`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── listblock ─────────────────────────────────────────────────────────────
  {
    command: 'listblock',
    aliases: ['blocklist', 'blocked'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.sessionGet('block_list')
      const blockList = res?.value ? JSON.parse(res.value) : []

      if (!blockList.length) return sock.sendMessage(ctx.from, {
        text: `🚫 *Block List — Empty*\n\nNo users are blocked.`
      }, { quoted: msg })

      const lines = blockList.map((jid, i) => `${i + 1}. +${jid.split('@')[0]}`)
      await sock.sendMessage(ctx.from, {
        text: [
          `🚫 *Blocked Users (${blockList.length})*`, `${'─'.repeat(26)}`, ``,
          ...lines, ``,
          `_Unblock with ${ctx.prefix}unblock @user_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── stopuser (bot-level ignore only — no WA contact block) ────────────────
  {
    command: 'stopuser',
    aliases: ['ignoreuser', 'botignore'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}stopuser @user\n\n_Stops the user from using the bot even in public mode.\nDoes NOT block them on WhatsApp. Use ${ctx.prefix}block for a full WA block._`
      }, { quoted: msg })

      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
      if (!normalised) return sock.sendMessage(ctx.from, {
        text: `❌ Could not resolve that user's phone number.`
      }, { quoted: msg })

      const senderPhone = ctx.senderNumber + '@s.whatsapp.net'
      if (normalised === senderPhone) return sock.sendMessage(ctx.from, {
        text: '❌ Cannot stop yourself.'
      }, { quoted: msg })

      const res = await api.sessionGet('stop_list')
      const stopList = res?.value ? JSON.parse(res.value) : []

      if (stopList.includes(normalised)) return sock.sendMessage(ctx.from, {
        text: `⚠️ +${normalised.split('@')[0]} is already stopped.`
      }, { quoted: msg })

      stopList.push(normalised)

      // Update bot ignore memory immediately (reuses the same block memory set)
      addBlockMemory(normalised)
      addBlockMemory(targetJid)

      // Persist to KV under separate stop_list key
      api.sessionSet('stop_list', JSON.stringify(stopList)).catch(() => {})

      await sock.sendMessage(ctx.from, {
        text: [
          `🛑 *User Stopped*`, ``,
          `+${normalised.split('@')[0]} can no longer use the bot`,
          `even while bot is in public mode.`, ``,
          `_This does NOT block them on WhatsApp._`,
          `_Stopped users: ${stopList.length}_`, ``,
          `_Use ${ctx.prefix}allowuser to restore access_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── allowuser (reverse of stopuser) ───────────────────────────────────────
  {
    command: 'allowuser',
    aliases: ['unstopuser', 'botallow'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}allowuser @user`
      }, { quoted: msg })

      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
      if (!normalised) return sock.sendMessage(ctx.from, {
        text: `❌ Could not resolve that user's phone number.`
      }, { quoted: msg })

      const res = await api.sessionGet('stop_list')
      let stopList = res?.value ? JSON.parse(res.value) : []

      if (!stopList.includes(normalised)) return sock.sendMessage(ctx.from, {
        text: `❌ +${normalised.split('@')[0]} is not in the stop list.`
      }, { quoted: msg })

      stopList = stopList.filter(j => j !== normalised)

      delBlockMemory(normalised)
      delBlockMemory(targetJid)

      api.sessionSet('stop_list', JSON.stringify(stopList)).catch(() => {})

      await sock.sendMessage(ctx.from, {
        text: [
          `✅ *User Allowed*`, ``,
          `+${normalised.split('@')[0]} can now use the bot again.`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── liststop ──────────────────────────────────────────────────────────────
  {
    command: 'liststop',
    aliases: ['stoplist', 'stopped'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.sessionGet('stop_list')
      const stopList = res?.value ? JSON.parse(res.value) : []

      if (!stopList.length) return sock.sendMessage(ctx.from, {
        text: `🛑 *Stop List — Empty*\n\nNo users are stopped.`
      }, { quoted: msg })

      const lines = stopList.map((jid, i) => `${i + 1}. +${jid.split('@')[0]}`)
      await sock.sendMessage(ctx.from, {
        text: [
          `🛑 *Stopped Users (${stopList.length})*`, `${'─'.repeat(26)}`, ``,
          ...lines, ``,
          `_Allow with ${ctx.prefix}allowuser @user_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── premium ───────────────────────────────────────────────────────────────
  {
    command: 'premium',
    aliases: ['addpremium', 'vip'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}premium @user`
      }, { quoted: msg })

      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
        || targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'

      const res = await api.setPlan(normalised, 'premium')
      if (!res?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to grant premium. Error: ${res?.error || 'unknown'}`
      }, { quoted: msg })

      try { await sock.sendMessage(normalised, { text: `⭐ You have been granted *Premium* access to the bot!\n\nEnjoy all premium features.` }) } catch {}

      await sock.sendMessage(ctx.from, {
        text: `⭐ +${normalised.split('@')[0]} has been granted Premium access.`
      }, { quoted: msg })
    }
  },

  // ── delpremium ────────────────────────────────────────────────────────────
  {
    command: 'delpremium',
    aliases: ['removepremium', 'delvip'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}delpremium @user`
      }, { quoted: msg })

      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
        || targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'

      const res = await api.setPlan(normalised, 'free')
      if (!res?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to remove premium. Error: ${res?.error || 'unknown'}`
      }, { quoted: msg })

      await sock.sendMessage(ctx.from, {
        text: `✅ +${normalised.split('@')[0]} has been removed from Premium.`
      }, { quoted: msg })
    }
  },

  // ── ban ───────────────────────────────────────────────────────────────────
  {
    command: 'ban',
    aliases: ['globalban', 'botban'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}ban @user [reason]`
      }, { quoted: msg })

      const reason = ctx.args.filter(a => !a.startsWith('@')).join(' ').trim() || 'No reason given'
      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
        || targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'

      const planRes = await api.setPlan(normalised, 'banned')
      if (!planRes?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to ban user. Error: ${planRes?.error || 'unknown'}`
      }, { quoted: msg })

      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []
      if (!banList.find(b => b.jid === normalised)) {
        banList.push({ jid: normalised, reason, bannedAt: Date.now(), bannedBy: ctx.sender })
        await api.sessionSet('ban_list', JSON.stringify(banList))
      }

      try { await sock.sendMessage(normalised, { text: `🚨 *You have been BANNED from the bot.*\n\nReason: _${reason}_\n\nContact the owner if you believe this is a mistake.` }) } catch {}

      await sock.sendMessage(ctx.from, {
        text: [
          `🚨 *User Banned*`, ``,
          `👤 +${normalised.split('@')[0]}`,
          `📝 Reason: _${reason}_`, ``,
          `They have been notified.`,
          `_Total bans: ${banList.length}_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── unban ─────────────────────────────────────────────────────────────────
  {
    command: 'unban',
    aliases: ['globalunban'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unban @user`
      }, { quoted: msg })

      const normalised = resolveToPhoneJid(targetJid, ctx.groupMeta)
        || targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'

      const planRes = await api.setPlan(normalised, 'free')
      if (!planRes?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to unban user. Error: ${planRes?.error || 'unknown'}`
      }, { quoted: msg })

      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []
      const updated = banList.filter(b => b.jid !== normalised)
      await api.sessionSet('ban_list', JSON.stringify(updated))

      try { await sock.sendMessage(normalised, { text: `✅ Your ban has been lifted. You can use the bot again!` }) } catch {}

      await sock.sendMessage(ctx.from, {
        text: `✅ +${normalised.split('@')[0]} has been unbanned.`
      }, { quoted: msg })
    }
  },

  // ── banlist ───────────────────────────────────────────────────────────────
  {
    command: 'banlist',
    aliases: ['listban', 'bans'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []

      if (!banList.length) return sock.sendMessage(ctx.from, {
        text: `🚨 *Ban List — Empty*\n\nNo users are currently banned.`
      }, { quoted: msg })

      const lines = banList.map((b, i) => {
        const num = (b.jid || '').split('@')[0]
        const date = b.bannedAt ? new Date(b.bannedAt).toLocaleDateString('en-GB') : 'Unknown'
        return `${i + 1}. +${num}\n    📝 ${b.reason || 'No reason'}\n    📅 ${date}`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `🚨 *Banned Users (${banList.length})*`, `${'─'.repeat(28)}`, ``,
          ...lines, ``,
          `_Unban with ${ctx.prefix}unban @user_`
        ].join('\n')
      }, { quoted: msg })
    }
  },
]
