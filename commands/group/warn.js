// commands/group/warn.js
// Commands: .warn | .resetwarn | .warnlist
//
// Warn data is stored in the Cloudflare Worker via api.js.
// Endpoints used:
//   POST /bot/warn         → addWarn (already in api.js)
//   GET  /bot/warns        → getWarns for a user in a group
//   DELETE /bot/warn       → resetWarn for a user in a group

// ── Worker helper (mirrors api.js pattern) ────────────────
const workerCall = async (path, opts = {}) => {
  try {
    const base   = process.env.WORKER_URL
    const secret = process.env.BOT_SECRET

    const r = await fetch(`${base}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': secret,
        ...opts.headers,
      },
    })

    return await r.json()
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// Max warnings before auto-kick
const MAX_WARNS = 3

export default [

  // ── .warn ─────────────────────────────────────────────
  {
    command:  'warn',
    aliases:  ['strike'],
    category: 'group',
    description: `Warn a member. At ${MAX_WARNS} warnings they are automatically kicked.`,
    usage:    '.warn @user [reason]',
    example:  '.warn @2348012345678 spamming links',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can warn members.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag a user or reply to their message.\n\n📌 *Usage:* ${ctx.prefix}warn @user [reason]`
        }, { quoted: msg })
      }

      // Can't warn the bot itself
      if (targetJid === ctx.botId || targetJid.split('@')[0] === ctx.botNumber) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Cannot warn the bot 😄'
        }, { quoted: msg })
      }

      // Can't warn bot owner
      if (targetJid.split('@')[0] === (process.env.OWNER_NUMBER || '')) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Cannot warn the bot owner.'
        }, { quoted: msg })
      }

      // Can't warn an admin
      const parts = ctx.groupMeta?.participants || []
      const targetIsAdmin = parts.some(p =>
        p.id === targetJid && ['admin', 'superadmin'].includes(p.admin)
      )

      if (targetIsAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Cannot warn a group admin.'
        }, { quoted: msg })
      }

      // Get reason — everything after the @mention
      const reason = ctx.args
        .filter(a => !a.startsWith('@'))
        .join(' ')
        .trim() || 'No reason given'

      try {
        // Add the warn via worker
        const addRes = await workerCall('/bot/warn', {
          method: 'POST',
          body: JSON.stringify({
            jid:      targetJid,
            groupId:  ctx.from,
            reason,
            warnedBy: ctx.sender,
          }),
        })

        // The response should include the new warn count
        const warnCount = addRes?.count ?? addRes?.data?.count ?? null
        const num       = targetJid.split('@')[0]

        if (warnCount === null) {
          // Worker responded but no count — still send warning message
          await sock.sendMessage(ctx.from, {
            text: [
              `⚠️ *Warning Issued*`,
              ``,
              `👤 User: @${num}`,
              `📝 Reason: ${reason}`,
              `👮 Warned by: @${ctx.senderNumber}`,
            ].join('\n'),
            mentions: [targetJid, ctx.sender]
          }, { quoted: msg })
          return
        }

        const remaining = MAX_WARNS - warnCount

        if (warnCount >= MAX_WARNS) {
          // Auto-kick on max warnings
          await sock.sendMessage(ctx.from, {
            text: [
              `🚨 *Final Warning — Kicked!*`,
              ``,
              `👤 User: @${num}`,
              `📝 Reason: ${reason}`,
              `⚠️ Warnings: ${warnCount}/${MAX_WARNS}`,
              ``,
              `@${num} has been automatically kicked for reaching the warning limit.`
            ].join('\n'),
            mentions: [targetJid, ctx.sender]
          }, { quoted: msg })

          // Kick the user
          if (ctx.isBotAdmin) {
            try {
              await sock.groupParticipantsUpdate(ctx.from, [targetJid], 'remove')
            } catch {
              // Kick failed — notify but don't crash
              await sock.sendMessage(ctx.from, {
                text: `⚠️ Could not auto-kick @${num} — I may not have permission.`,
                mentions: [targetJid]
              })
            }
          }
        } else {
          await sock.sendMessage(ctx.from, {
            text: [
              `⚠️ *Warning Issued*`,
              ``,
              `👤 User: @${num}`,
              `📝 Reason: ${reason}`,
              `👮 Warned by: @${ctx.senderNumber}`,
              `⚠️ Warnings: *${warnCount}/${MAX_WARNS}*`,
              ``,
              remaining === 1
                ? `🚨 _One more warning and @${num} will be kicked!_`
                : `_${remaining} more warning(s) until kick._`
            ].join('\n'),
            mentions: [targetJid, ctx.sender]
          }, { quoted: msg })
        }
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to warn: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .resetwarn ────────────────────────────────────────
  {
    command:  'resetwarn',
    aliases:  ['clearwarn', 'unwarn'],
    category: 'group',
    description: 'Reset all warnings for a user in this group',
    usage:    '.resetwarn @user',
    example:  '.resetwarn @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can reset warnings.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag a user or reply to their message.\n\n📌 *Usage:* ${ctx.prefix}resetwarn @user`
        }, { quoted: msg })
      }

      try {
        await workerCall('/bot/warn', {
          method: 'DELETE',
          body: JSON.stringify({
            jid:     targetJid,
            groupId: ctx.from,
          }),
        })

        const num = targetJid.split('@')[0]

        await sock.sendMessage(ctx.from, {
          text: `✅ Warnings cleared for @${num}.`,
          mentions: [targetJid]
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to reset warnings: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .warnlist ─────────────────────────────────────────
  {
    command:  'warnlist',
    aliases:  ['warns', 'warnslist'],
    category: 'group',
    description: 'Show all members with active warnings in this group',
    usage:    '.warnlist',
    example:  '.warnlist',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can view the warn list.'
        }, { quoted: msg })
      }

      try {
        const res = await workerCall(
          `/bot/warns?groupId=${encodeURIComponent(ctx.from)}`
        )

        const warnData = res?.data || res?.warns || []

        if (!Array.isArray(warnData) || !warnData.length) {
          return sock.sendMessage(ctx.from, {
            text: '✅ No active warnings in this group.'
          }, { quoted: msg })
        }

        const groupName = ctx.groupMeta?.subject || 'This Group'

        // Sort by warn count descending
        const sorted = [...warnData].sort((a, b) => (b.count || 0) - (a.count || 0))

        const lines = sorted.map((w, i) => {
          const num    = (w.jid || '').split('@')[0]
          const count  = w.count || 0
          const bar    = '⚠️'.repeat(count)
          const reason = w.reason ? ` — _${w.reason}_` : ''
          return `${i + 1}. +${num} ${bar} (${count}/${MAX_WARNS})${reason}`
        })

        const text = [
          `📋 *${groupName} — Warn List*`,
          `${'─'.repeat(28)}`,
          ``,
          ...lines,
          ``,
          `${'─'.repeat(28)}`,
          `⚠️ Total with warnings: *${warnData.length}*`,
          `_Max ${MAX_WARNS} warnings before auto-kick_`
        ].join('\n')

        await sock.sendMessage(ctx.from, { text }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to fetch warn list: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
