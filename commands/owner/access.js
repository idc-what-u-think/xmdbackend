export default [
  {
    command: 'premium',
    aliases: ['addpremium', 'givepremium'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}premium @user`
        }, { quoted: msg })
      }

      const res = await api.sessionGet('premium_list')
      const premiumList = res?.value ? JSON.parse(res.value) : []

      if (premiumList.includes(targetJid)) {
        return sock.sendMessage(ctx.from, {
          text: `⚠️ @${targetJid.split('@')[0]} already has premium.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      premiumList.push(targetJid)
      await api.sessionSet('premium_list', JSON.stringify(premiumList))

      await sock.sendMessage(ctx.from, {
        text: [
          `💎 *Premium Granted!*`,
          ``,
          `✅ @${targetJid.split('@')[0]} now has premium access.`,
          ``,
          `*Premium perks:*`,
          `  • 2x daily rewards`,
          `  • 25% work bonus`,
          `  • Priority AI responses`,
          `  • Access to premium commands`,
          ``,
          `_Premium users: ${premiumList.length}_`
        ].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  {
    command: 'delpremium',
    aliases: ['removepremium', 'unpremium', 'rmpremium'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}delpremium @user`
        }, { quoted: msg })
      }

      const res = await api.sessionGet('premium_list')
      const premiumList = res?.value ? JSON.parse(res.value) : []

      if (!premiumList.includes(targetJid)) {
        return sock.sendMessage(ctx.from, {
          text: `❌ @${targetJid.split('@')[0]} does not have premium.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      const updated = premiumList.filter(j => j !== targetJid)
      await api.sessionSet('premium_list', JSON.stringify(updated))

      await sock.sendMessage(ctx.from, {
        text: `✅ Premium removed from @${targetJid.split('@')[0]}.`,
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  {
    command: 'block',
    aliases: ['botblock'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}block @user`
        }, { quoted: msg })
      }

      if (targetJid === ctx.sender) {
        return sock.sendMessage(ctx.from, { text: '❌ Cannot block yourself.' }, { quoted: msg })
      }

      const res = await api.sessionGet('block_list')
      const blockList = res?.value ? JSON.parse(res.value) : []

      if (blockList.includes(targetJid)) {
        return sock.sendMessage(ctx.from, {
          text: `⚠️ @${targetJid.split('@')[0]} is already blocked.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      blockList.push(targetJid)
      await api.sessionSet('block_list', JSON.stringify(blockList))

      await sock.sendMessage(ctx.from, {
        text: [
          `🚫 *User Blocked*`,
          ``,
          `@${targetJid.split('@')[0]} can no longer use the bot.`,
          `_Blocked users: ${blockList.length}_`,
          ``,
          `_Use ${ctx.prefix}unblock to restore access_`
        ].join('\n'),
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

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unblock @user`
        }, { quoted: msg })
      }

      const res = await api.sessionGet('block_list')
      const blockList = res?.value ? JSON.parse(res.value) : []

      if (!blockList.includes(targetJid)) {
        return sock.sendMessage(ctx.from, {
          text: `❌ @${targetJid.split('@')[0]} is not blocked.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      const updated = blockList.filter(j => j !== targetJid)
      await api.sessionSet('block_list', JSON.stringify(updated))

      await sock.sendMessage(ctx.from, {
        text: `✅ @${targetJid.split('@')[0]} can now use the bot again.`,
        mentions: [targetJid]
      }, { quoted: msg })
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

      if (!blockList.length) {
        return sock.sendMessage(ctx.from, {
          text: `🚫 *Block List — Empty*\n\nNo users are blocked.`
        }, { quoted: msg })
      }

      const lines = blockList.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`)

      await sock.sendMessage(ctx.from, {
        text: [
          `🚫 *Blocked Users (${blockList.length})*`,
          `${'─'.repeat(26)}`,
          ``,
          ...lines,
          ``,
          `_Unblock with ${ctx.prefix}unblock @user_`
        ].join('\n'),
        mentions: blockList
      }, { quoted: msg })
    }
  },

  {
    command: 'ban',
    aliases: ['globalban', 'botban'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}ban @user [reason]`
        }, { quoted: msg })
      }

      const reason = ctx.args.filter(a => !a.startsWith('@')).join(' ').trim() || 'No reason given'

      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []

      const alreadyBanned = banList.find(b => b.jid === targetJid)
      if (alreadyBanned) {
        return sock.sendMessage(ctx.from, {
          text: `⚠️ @${targetJid.split('@')[0]} is already banned.\nReason: ${alreadyBanned.reason}`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      banList.push({ jid: targetJid, reason, bannedAt: Date.now(), bannedBy: ctx.sender })
      await api.sessionSet('ban_list', JSON.stringify(banList))

      try {
        await sock.sendMessage(targetJid, {
          text: [`🚨 *You have been BANNED from the bot*`, ``, `Reason: _${reason}_`, ``, `Contact the owner if you believe this is a mistake.`].join('\n')
        })
      } catch {}

      await sock.sendMessage(ctx.from, {
        text: [
          `🚨 *User Banned*`,
          ``,
          `👤 @${targetJid.split('@')[0]}`,
          `📝 Reason: _${reason}_`,
          ``,
          `They have been notified and can no longer use the bot.`,
          `_Total bans: ${banList.length}_`
        ].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  {
    command: 'unban',
    aliases: ['globalunban'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unban @user`
        }, { quoted: msg })
      }

      const res = await api.sessionGet('ban_list')
      const banList = res?.value ? JSON.parse(res.value) : []

      if (!banList.find(b => b.jid === targetJid)) {
        return sock.sendMessage(ctx.from, {
          text: `❌ @${targetJid.split('@')[0]} is not banned.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      const updated = banList.filter(b => b.jid !== targetJid)
      await api.sessionSet('ban_list', JSON.stringify(updated))

      try {
        await sock.sendMessage(targetJid, { text: `✅ Your ban has been lifted. You can now use the bot again. Welcome back!` })
      } catch {}

      await sock.sendMessage(ctx.from, {
        text: `✅ @${targetJid.split('@')[0]} has been unbanned.\n_They have been notified._`,
        mentions: [targetJid]
      }, { quoted: msg })
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

      if (!banList.length) {
        return sock.sendMessage(ctx.from, {
          text: `🚨 *Ban List — Empty*\n\nNo users are currently banned.`
        }, { quoted: msg })
      }

      const lines = banList.map((b, i) => {
        const num = (b.jid || '').split('@')[0]
        const reason = b.reason || 'No reason'
        const date = b.bannedAt ? new Date(b.bannedAt).toLocaleDateString('en-GB') : 'Unknown'
        return `${i + 1}. @${num}\n    📝 ${reason}\n    📅 ${date}`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `🚨 *Banned Users (${banList.length})*`,
          `${'─'.repeat(28)}`,
          ``,
          ...lines,
          ``,
          `_Unban with ${ctx.prefix}unban @user_`
        ].join('\n'),
        mentions: banList.map(b => b.jid).filter(Boolean)
      }, { quoted: msg })
    }
  }
]
