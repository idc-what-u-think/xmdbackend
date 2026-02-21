// commands/owner/access.js
// Commands: .premium | .delpremium | .block | .unblock | .listblock | .ban | .unban | .banlist

// ── Worker helper ─────────────────────────────────────────
const w = async (path, opts = {}) => {
  try {
    const r = await fetch(`${process.env.WORKER_URL}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': process.env.BOT_SECRET,
        ...opts.headers,
      },
    })
    return await r.json()
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

const BOT_ID     = () => process.env.BOT_ID || 'default'
const setSetting = (key, value) => w('/bot/settings', {
  method: 'POST',
  body:   JSON.stringify({ botId: BOT_ID(), key, value }),
})
const getSetting = (key) => w(`/bot/settings?botId=${BOT_ID()}&key=${key}`)

export default [

  // ── .premium ──────────────────────────────────────────
  {
    command:  'premium',
    aliases:  ['addpremium', 'givepremium'],
    category: 'owner',
    description: 'Grant a user premium status',
    usage:    '.premium @user',
    example:  '.premium @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can manage premium users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}premium @user`
        }, { quoted: msg })
      }

      try {
        const res         = await getSetting('premium_list')
        const premiumList = Array.isArray(res?.value) ? res.value : []

        if (premiumList.includes(targetJid)) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ @${targetJid.split('@')[0]} already has premium.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        premiumList.push(targetJid)
        await setSetting('premium_list', premiumList)

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

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .delpremium ───────────────────────────────────────
  {
    command:  'delpremium',
    aliases:  ['removepremium', 'unpremium', 'rmpremium'],
    category: 'owner',
    description: 'Remove premium status from a user',
    usage:    '.delpremium @user',
    example:  '.delpremium @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can manage premium users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}delpremium @user`
        }, { quoted: msg })
      }

      try {
        const res         = await getSetting('premium_list')
        const premiumList = Array.isArray(res?.value) ? res.value : []

        if (!premiumList.includes(targetJid)) {
          return sock.sendMessage(ctx.from, {
            text: `❌ @${targetJid.split('@')[0]} does not have premium.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        const updated = premiumList.filter(j => j !== targetJid)
        await setSetting('premium_list', updated)

        await sock.sendMessage(ctx.from, {
          text: `✅ Premium removed from @${targetJid.split('@')[0]}.`,
          mentions: [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .block ────────────────────────────────────────────
  {
    command:  'block',
    aliases:  ['botblock'],
    category: 'owner',
    description: 'Block a user from using the bot (not WhatsApp block)',
    usage:    '.block @user',
    example:  '.block @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can block users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}block @user`
        }, { quoted: msg })
      }

      if (targetJid === ctx.sender) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Cannot block yourself.'
        }, { quoted: msg })
      }

      try {
        const res       = await getSetting('block_list')
        const blockList = Array.isArray(res?.value) ? res.value : []

        if (blockList.includes(targetJid)) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ @${targetJid.split('@')[0]} is already blocked.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        blockList.push(targetJid)
        await setSetting('block_list', blockList)

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

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .unblock ──────────────────────────────────────────
  {
    command:  'unblock',
    aliases:  ['botunblock'],
    category: 'owner',
    description: 'Restore bot access to a blocked user',
    usage:    '.unblock @user',
    example:  '.unblock @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can unblock users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unblock @user`
        }, { quoted: msg })
      }

      try {
        const res       = await getSetting('block_list')
        const blockList = Array.isArray(res?.value) ? res.value : []

        if (!blockList.includes(targetJid)) {
          return sock.sendMessage(ctx.from, {
            text: `❌ @${targetJid.split('@')[0]} is not blocked.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        const updated = blockList.filter(j => j !== targetJid)
        await setSetting('block_list', updated)

        await sock.sendMessage(ctx.from, {
          text: `✅ @${targetJid.split('@')[0]} can now use the bot again.`,
          mentions: [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .listblock ────────────────────────────────────────
  {
    command:  'listblock',
    aliases:  ['blocklist', 'blocked'],
    category: 'owner',
    description: 'List all users blocked from using the bot',
    usage:    '.listblock',
    example:  '.listblock',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can view the block list.'
        }, { quoted: msg })
      }

      try {
        const res       = await getSetting('block_list')
        const blockList = Array.isArray(res?.value) ? res.value : []

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

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .ban ──────────────────────────────────────────────
  {
    command:  'ban',
    aliases:  ['globalban', 'botban'],
    category: 'owner',
    description: 'Globally ban a user from the bot with a reason',
    usage:    '.ban @user [reason]',
    example:  '.ban @2348012345678 spamming',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can ban users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}ban @user [reason]`
        }, { quoted: msg })
      }

      // Extract reason (everything after the mention)
      const reason = ctx.args
        .filter(a => !a.startsWith('@'))
        .join(' ')
        .trim() || 'No reason given'

      try {
        const res     = await getSetting('ban_list')
        const banList = Array.isArray(res?.value) ? res.value : []

        const alreadyBanned = banList.find(b => b.jid === targetJid)
        if (alreadyBanned) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ @${targetJid.split('@')[0]} is already banned.\nReason: ${alreadyBanned.reason}`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        banList.push({
          jid:      targetJid,
          reason,
          bannedAt: Date.now(),
          bannedBy: ctx.sender
        })
        await setSetting('ban_list', banList)

        // Notify the banned user in DM
        try {
          await sock.sendMessage(targetJid, {
            text: [
              `🚨 *You have been BANNED from the bot*`,
              ``,
              `Reason: _${reason}_`,
              ``,
              `Contact the owner if you believe this is a mistake.`
            ].join('\n')
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

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .unban ────────────────────────────────────────────
  {
    command:  'unban',
    aliases:  ['globalunban'],
    category: 'owner',
    description: 'Remove a global ban from a user',
    usage:    '.unban @user',
    example:  '.unban @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can unban users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}unban @user`
        }, { quoted: msg })
      }

      try {
        const res     = await getSetting('ban_list')
        const banList = Array.isArray(res?.value) ? res.value : []

        const isBanned = banList.find(b => b.jid === targetJid)
        if (!isBanned) {
          return sock.sendMessage(ctx.from, {
            text: `❌ @${targetJid.split('@')[0]} is not banned.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        const updated = banList.filter(b => b.jid !== targetJid)
        await setSetting('ban_list', updated)

        // Notify unbanned user
        try {
          await sock.sendMessage(targetJid, {
            text: `✅ Your ban has been lifted. You can now use the bot again. Welcome back!`
          })
        } catch {}

        await sock.sendMessage(ctx.from, {
          text: `✅ @${targetJid.split('@')[0]} has been unbanned.\n_They have been notified._`,
          mentions: [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .banlist ──────────────────────────────────────────
  {
    command:  'banlist',
    aliases:  ['listban', 'bans'],
    category: 'owner',
    description: 'View all globally banned users',
    usage:    '.banlist',
    example:  '.banlist',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can view the ban list.'
        }, { quoted: msg })
      }

      try {
        const res     = await getSetting('ban_list')
        const banList = Array.isArray(res?.value) ? res.value : []

        if (!banList.length) {
          return sock.sendMessage(ctx.from, {
            text: `🚨 *Ban List — Empty*\n\nNo users are currently banned.`
          }, { quoted: msg })
        }

        const lines = banList.map((b, i) => {
          const num    = (b.jid || '').split('@')[0]
          const reason = b.reason || 'No reason'
          const date   = b.bannedAt ? new Date(b.bannedAt).toLocaleDateString('en-GB') : 'Unknown'
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

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
