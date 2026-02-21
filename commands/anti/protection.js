// commands/anti/protection.js
// Commands: .nightmode | .slowmode | .newbiemode | .lockdown | .safezone

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

const getGS = (gid) => w(`/bot/gsettings?gid=${encodeURIComponent(gid)}`)
const setGS = (gid, key, value) => w('/bot/gsettings', {
  method: 'POST',
  body:   JSON.stringify({ gid, key, value }),
})

export default [

  // ── .nightmode ────────────────────────────────────────
  {
    command:  'nightmode',
    aliases:  ['quiethours', 'nightmute'],
    category: 'anti',
    description: 'Auto-mute the group between midnight and 6am, auto-unmute at 6am',
    usage:    '.nightmode on/off',
    example:  '.nightmode on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure night mode.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to mute/unmute the group.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.nightmode || res?.nightmode || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `🌙 *Night Mode*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `When ON:`,
            `• Group mutes automatically at *12:00 AM*`,
            `• Group unmutes automatically at *6:00 AM*`,
            `• Admins can still send messages during quiet hours`,
            ``,
            `_The bot's cron in index.js handles the actual muting._`,
            ``,
            `Usage: \`${ctx.prefix}nightmode on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'nightmode', input)
        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `🌙 *Night Mode Enabled*\n\nGroup will auto-mute at midnight and auto-unmute at 6am.`
            : `🌙 *Night Mode Disabled*\n\nAutomatic quiet hours are off.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .slowmode ─────────────────────────────────────────
  {
    command:  'slowmode',
    aliases:  ['messagedelay', 'cooldown'],
    category: 'anti',
    description: 'Force a delay between messages per member (in seconds)',
    usage:    '.slowmode <seconds>  or  .slowmode off',
    example:  '.slowmode 30',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure slow mode.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to enforce slow mode.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.slowmode || res?.slowmode || 0

        return sock.sendMessage(ctx.from, {
          text: [
            `🐢 *Slow Mode*`,
            ``,
            current > 0
              ? `Current: *${current} seconds* between messages`
              : `Current: *OFF*`,
            ``,
            `Members must wait X seconds between sending messages.`,
            `Admins are exempt from the delay.`,
            ``,
            `Usage:`,
            `\`${ctx.prefix}slowmode 30\`   — 30 second delay`,
            `\`${ctx.prefix}slowmode 60\`   — 1 minute delay`,
            `\`${ctx.prefix}slowmode off\`  — disable`
          ].join('\n')
        }, { quoted: msg })
      }

      if (input === 'off' || input === '0') {
        try {
          await setGS(ctx.from, 'slowmode', 0)
          return sock.sendMessage(ctx.from, {
            text: `🐢 *Slow Mode Disabled*\n\nMembers can message at normal speed.`
          }, { quoted: msg })
        } catch (err) {
          return sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
        }
      }

      const seconds = parseInt(input, 10)

      if (isNaN(seconds) || seconds < 5) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Minimum slow mode is 5 seconds. Use `off` to disable.'
        }, { quoted: msg })
      }

      if (seconds > 3600) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Maximum slow mode is 3600 seconds (1 hour).'
        }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'slowmode', seconds)

        const display = seconds >= 60
          ? `${Math.floor(seconds / 60)}m ${seconds % 60 > 0 ? `${seconds % 60}s` : ''}`.trim()
          : `${seconds}s`

        await sock.sendMessage(ctx.from, {
          text: `🐢 *Slow Mode Enabled*\n\nMembers must wait *${display}* between messages.\n_Admins are exempt._`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .newbiemode ───────────────────────────────────────
  {
    command:  'newbiemode',
    aliases:  ['joinlock', 'newmemberlock'],
    category: 'anti',
    description: 'Prevent newly joined members from sending messages for 24 hours',
    usage:    '.newbiemode on/off',
    example:  '.newbiemode on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure newbie mode.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to delete messages from new members.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.newbiemode || res?.newbiemode || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `🆕 *Newbie Mode*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `When ON:`,
            `• Members who just joined cannot send messages for 24 hours`,
            `• Their messages are silently deleted`,
            `• After 24 hours they are automatically allowed to send`,
            ``,
            `Great for preventing bot spam raids.`,
            ``,
            `Usage: \`${ctx.prefix}newbiemode on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'newbiemode', input)
        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `🆕 *Newbie Mode Enabled*\n\nNew members cannot send messages for 24 hours after joining.`
            : `🆕 *Newbie Mode Disabled*\n\nNew members can now send messages immediately.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .lockdown ─────────────────────────────────────────
  {
    command:  'lockdown',
    aliases:  ['emergency', 'lock'],
    category: 'anti',
    description: 'Emergency full lockdown — only admins can send. Use again to lift lockdown.',
    usage:    '.lockdown',
    example:  '.lockdown',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can trigger lockdown.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to enforce lockdown.'
        }, { quoted: msg })
      }

      try {
        const res        = await getGS(ctx.from)
        const inLockdown = res?.data?.lockdown === 'on' || res?.lockdown === 'on'

        if (inLockdown) {
          // Lift lockdown
          await sock.groupSettingUpdate(ctx.from, 'not_announcement')
          await setGS(ctx.from, 'lockdown', 'off')

          await sock.sendMessage(ctx.from, {
            text: [
              `🔓 *Lockdown Lifted*`,
              ``,
              `The group is now open. All members can send messages.`,
              ``,
              `_Lockdown lifted by @${ctx.senderNumber}_`
            ].join('\n'),
            mentions: [ctx.sender]
          }, { quoted: msg })

        } else {
          // Trigger lockdown
          await sock.groupSettingUpdate(ctx.from, 'announcement')
          await setGS(ctx.from, 'lockdown', 'on')

          await sock.sendMessage(ctx.from, {
            text: [
              `🔒 *GROUP LOCKDOWN ACTIVATED*`,
              ``,
              `⚠️ Only admins can send messages now.`,
              ``,
              `Reason: Emergency lockdown triggered by @${ctx.senderNumber}`,
              ``,
              `_Admins: Use \`${ctx.prefix}lockdown\` again to lift it._`
            ].join('\n'),
            mentions: [ctx.sender]
          }, { quoted: msg })
        }

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .safezone ─────────────────────────────────────────
  {
    command:  'safezone',
    aliases:  ['exempt', 'whitelist'],
    category: 'anti',
    description: 'Exempt a member from all anti-protections (admins and owner always exempt)',
    usage:    '.safezone @user  or  .safezone remove @user  or  .safezone list',
    example:  '.safezone @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can manage the safe zone.'
        }, { quoted: msg })
      }

      const subCmd = ctx.args[0]?.toLowerCase()

      // .safezone list
      if (subCmd === 'list') {
        try {
          const res   = await getGS(ctx.from)
          const safe  = res?.data?.safezone || res?.safezone || []
          const list  = Array.isArray(safe) ? safe : []

          if (!list.length) {
            return sock.sendMessage(ctx.from, {
              text: `🛡️ *Safe Zone — Empty*\n\nNo members are exempted from anti protections.\nUse \`${ctx.prefix}safezone @user\` to add one.`
            }, { quoted: msg })
          }

          const lines    = list.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`)
          const mentions = list

          return sock.sendMessage(ctx.from, {
            text: [
              `🛡️ *Safe Zone Members (${list.length})*`,
              ``,
              ...lines,
              ``,
              `_These members are exempt from all anti protections._`
            ].join('\n'),
            mentions
          }, { quoted: msg })
        } catch (err) {
          return sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
        }
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🛡️ *Safe Zone*`,
            ``,
            `Exempt a member from all anti protections.`,
            ``,
            `Add:    \`${ctx.prefix}safezone @user\``,
            `Remove: \`${ctx.prefix}safezone remove @user\``,
            `List:   \`${ctx.prefix}safezone list\``
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        const res  = await getGS(ctx.from)
        const safe = Array.isArray(res?.data?.safezone || res?.safezone)
          ? (res?.data?.safezone || res?.safezone)
          : []

        const num = targetJid.split('@')[0]

        // Remove mode
        if (subCmd === 'remove') {
          if (!safe.includes(targetJid)) {
            return sock.sendMessage(ctx.from, {
              text: `❌ @${num} is not in the safe zone.`,
              mentions: [targetJid]
            }, { quoted: msg })
          }

          const updated = safe.filter(j => j !== targetJid)
          await setGS(ctx.from, 'safezone', updated)

          return sock.sendMessage(ctx.from, {
            text: `✅ @${num} removed from safe zone. Anti protections apply to them again.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        // Add mode
        if (safe.includes(targetJid)) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ @${num} is already in the safe zone.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        if (safe.length >= 20) {
          return sock.sendMessage(ctx.from, {
            text: '❌ Safe zone is full (max 20 members). Remove someone first.'
          }, { quoted: msg })
        }

        const updated = [...safe, targetJid]
        await setGS(ctx.from, 'safezone', updated)

        await sock.sendMessage(ctx.from, {
          text: `🛡️ @${num} added to safe zone.\n\nThey are now exempt from all anti protections in this group.`,
          mentions: [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  }

]
