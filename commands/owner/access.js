export default [
  {
    command: 'block',
    aliases: ['botblock'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}block @user` }, { quoted: msg })
      if (targetJid === ctx.sender) return sock.sendMessage(ctx.from, { text: '❌ Cannot block yourself.' }, { quoted: msg })

      const res = await api.sessionGet('block_list')
      const blockList = res?.value ? JSON.parse(res.value) : []
      if (blockList.includes(targetJid)) return sock.sendMessage(ctx.from, { text: `⚠️ @${targetJid.split('@')[0]} is already blocked.`, mentions: [targetJid] }, { quoted: msg })

      blockList.push(targetJid)
      await api.sessionSet('block_list', JSON.stringify(blockList))
      await sock.sendMessage(ctx.from, {
        text: [`🚫 *User Blocked*`, ``, `@${targetJid.split('@')[0]} can no longer use the bot.`, `_Blocked users: ${blockList.length}_`, ``, `_Use ${ctx.prefix}unblock to restore access_`].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  {
    command: 'unblock',
    aliases: ['botunblock'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unblock @user` }, { quoted: msg })

      const res = await api.sessionGet('block_list')
      const blockList = res?.value ? JSON.parse(res.value) : []
      if (!blockList.includes(targetJid)) return sock.sendMessage(ctx.from, { text: `❌ @${targetJid.split('@')[0]} is not blocked.`, mentions: [targetJid] }, { quoted: msg })

      const updated = blockList.filter(j => j !== targetJid)
      await api.sessionSet('block_list', JSON.stringify(updated))
      await sock.sendMessage(ctx.from, { text: `✅ @${targetJid.split('@')[0]} can now use the bot again.`, mentions: [targetJid] }, { quoted: msg })
    }
  },

  {
    command: 'listblock',
    aliases: ['blocklist', 'blocked'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.sessionGet('block_list')
      const blockList = res?.value ? JSON.parse(res.value) : []
      if (!blockList.length) return sock.sendMessage(ctx.from, { text: `🚫 *Block List — Empty*\n\nNo users are blocked.` }, { quoted: msg })

      const lines = blockList.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`)
      await sock.sendMessage(ctx.from, {
        text: [`🚫 *Blocked Users (${blockList.length})*`, `${'─'.repeat(26)}`, ``, ...lines, ``, `_Unblock with ${ctx.prefix}unblock @user_`].join('\n'),
        mentions: blockList
      }, { quoted: msg })
    }
  },

  // ── ban — now writes plan: 'banned' to D1 ────────────────────────────────
  {
    command: 'ban',
    aliases: ['globalban', 'botban'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}ban @user [reason]` }, { quoted: msg })

      const reason = ctx.args.filter(a => !a.startsWith('@')).join(' ').trim() || 'No reason given'
      const normalised = targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'

      // Write banned plan to D1 — handler.js checks plan === 'banned'
      const planRes = await api.setPlan(normalised, 'banned')
      if (!planRes?.ok) {
        return sock.sendMessage(ctx.from, { text: `❌ Failed to ban user. Worker error: ${planRes?.error || 'unknown'}` }, { quoted: msg })
      }

      // Also keep display list for banlist command
      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []
      if (!banList.find(b => b.jid === normalised)) {
        banList.push({ jid: normalised, reason, bannedAt: Date.now(), bannedBy: ctx.sender })
        await api.sessionSet('ban_list', JSON.stringify(banList))
      }

      try { await sock.sendMessage(targetJid, { text: `🚨 *You have been BANNED from the bot.*\n\nReason: _${reason}_\n\nContact the owner if you believe this is a mistake.` }) } catch {}

      await sock.sendMessage(ctx.from, {
        text: [`🚨 *User Banned*`, ``, `👤 @${targetJid.split('@')[0]}`, `📝 Reason: _${reason}_`, ``, `They have been notified.`, `_Total bans: ${banList.length}_`].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  // ── unban — sets plan back to 'free' in D1 ───────────────────────────────
  {
    command: 'unban',
    aliases: ['globalunban'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unban @user` }, { quoted: msg })

      const normalised = targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'

      const planRes = await api.setPlan(normalised, 'free')
      if (!planRes?.ok) {
        return sock.sendMessage(ctx.from, { text: `❌ Failed to unban user. Worker error: ${planRes?.error || 'unknown'}` }, { quoted: msg })
      }

      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []
      const updated = banList.filter(b => b.jid !== normalised)
      await api.sessionSet('ban_list', JSON.stringify(updated))

      try { await sock.sendMessage(targetJid, { text: `✅ Your ban has been lifted. You can use the bot again!` }) } catch {}

      await sock.sendMessage(ctx.from, { text: `✅ @${targetJid.split('@')[0]} has been unbanned.`, mentions: [targetJid] }, { quoted: msg })
    }
  },

  {
    command: 'banlist',
    aliases: ['listban', 'bans'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []
      if (!banList.length) return sock.sendMessage(ctx.from, { text: `🚨 *Ban List — Empty*\n\nNo users are currently banned.` }, { quoted: msg })

      const lines = banList.map((b, i) => {
        const num = (b.jid || '').split('@')[0]
        const date = b.bannedAt ? new Date(b.bannedAt).toLocaleDateString('en-GB') : 'Unknown'
        return `${i + 1}. @${num}\n    📝 ${b.reason || 'No reason'}\n    📅 ${date}`
      })

      await sock.sendMessage(ctx.from, {
        text: [`🚨 *Banned Users (${banList.length})*`, `${'─'.repeat(28)}`, ``, ...lines, ``, `_Unban with ${ctx.prefix}unban @user_`].join('\n'),
        mentions: banList.map(b => b.jid).filter(Boolean)
      }, { quoted: msg })
    }
  }
]
