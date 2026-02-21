export default [
  {
    command: 'nightmode',
    aliases: ['quiethours'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim()
      const res   = await api.getGroupSettings(ctx.from)
      const s     = res.settings || {}
      if (!input) {
        return sock.sendMessage(ctx.from, { text: `🌙 *Night Mode*\n\nCurrent: *${(s.nightmode || 'off').toUpperCase()}*\n\nAuto-mutes at 12am, unmutes at 6am.\n\nUsage: \`${ctx.prefix}nightmode on/off\`` }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, nightmode: input })
      await sock.sendMessage(ctx.from, { text: input === 'on' ? `🌙 *Night Mode ON* — Group mutes at 12am, unmutes at 6am.` : `🌙 *Night Mode OFF*` }, { quoted: msg })
    }
  },
  {
    command: 'slowmode',
    aliases: ['messagedelay', 'cooldown'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.getGroupSettings(ctx.from)
      const s   = res.settings || {}
      const input = ctx.query?.toLowerCase().trim()
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: [`🐢 *Slow Mode*`, ``, `Current: *${s.slowmode > 0 ? `${s.slowmode}s` : 'OFF'}*`, ``, `Usage: \`${ctx.prefix}slowmode <seconds>\` or \`${ctx.prefix}slowmode off\``].join('\n')
        }, { quoted: msg })
      }
      if (input === 'off' || input === '0') {
        await api.setGroupSettings(ctx.from, { ...s, slowmode: 0 })
        return sock.sendMessage(ctx.from, { text: '🐢 *Slow Mode OFF*' }, { quoted: msg })
      }
      const secs = parseInt(input, 10)
      if (isNaN(secs) || secs < 5) return sock.sendMessage(ctx.from, { text: '❌ Minimum is 5 seconds.' }, { quoted: msg })
      if (secs > 3600) return sock.sendMessage(ctx.from, { text: '❌ Maximum is 3600 seconds (1 hour).' }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, slowmode: secs })
      await sock.sendMessage(ctx.from, { text: `🐢 *Slow Mode ON* — ${secs}s between messages.` }, { quoted: msg })
    }
  },
  {
    command: 'newbiemode',
    aliases: ['joinlock'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim()
      const res   = await api.getGroupSettings(ctx.from)
      const s     = res.settings || {}
      if (!input) {
        return sock.sendMessage(ctx.from, { text: `🆕 *Newbie Mode*\n\nCurrent: *${(s.newbiemode || 'off').toUpperCase()}*\n\nNew members cannot message for 24 hours after joining.\n\nUsage: \`${ctx.prefix}newbiemode on/off\`` }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, newbiemode: input })
      await sock.sendMessage(ctx.from, { text: input === 'on' ? `🆕 *Newbie Mode ON* — New members cannot message for 24 hours.` : `🆕 *Newbie Mode OFF*` }, { quoted: msg })
    }
  },
  {
    command: 'lockdown',
    aliases: ['emergency'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.getGroupSettings(ctx.from)
      const s   = res.settings || {}
      const inLock = s.lockdown === 'on'
      if (inLock) {
        await sock.groupSettingUpdate(ctx.from, 'not_announcement')
        await api.setGroupSettings(ctx.from, { ...s, lockdown: 'off' })
        await sock.sendMessage(ctx.from, { text: `🔓 *Lockdown Lifted*\n\nGroup is open. All members can send.`, mentions: [ctx.sender] }, { quoted: msg })
      } else {
        await sock.groupSettingUpdate(ctx.from, 'announcement')
        await api.setGroupSettings(ctx.from, { ...s, lockdown: 'on' })
        await sock.sendMessage(ctx.from, { text: `🔒 *GROUP LOCKDOWN*\n\n⚠️ Only admins can send.\n\nUse \`${ctx.prefix}lockdown\` again to lift it.`, mentions: [ctx.sender] }, { quoted: msg })
      }
    }
  },
  {
    command: 'safezone',
    aliases: ['exempt', 'whitelist'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const sub = ctx.args[0]?.toLowerCase()
      const res = await api.getGroupSettings(ctx.from)
      const s   = res.settings || {}
      let safe  = Array.isArray(s.safezone) ? s.safezone : []

      if (sub === 'list') {
        if (!safe.length) return sock.sendMessage(ctx.from, { text: `🛡️ Safe zone is empty.\nAdd: \`${ctx.prefix}safezone @user\`` }, { quoted: msg })
        return sock.sendMessage(ctx.from, { text: `🛡️ *Safe Zone (${safe.length})*\n\n${safe.map(j => `@${j.split('@')[0]}`).join('\n')}`, mentions: safe }, { quoted: msg })
      }

      const target = ctx.mentionedJids[0] || ctx.quotedSender
      if (!target) return sock.sendMessage(ctx.from, {
        text: [`🛡️ *Safe Zone* — exempt members from anti protections`, ``, `Add:    \`${ctx.prefix}safezone @user\``, `Remove: \`${ctx.prefix}safezone remove @user\``, `List:   \`${ctx.prefix}safezone list\``].join('\n')
      }, { quoted: msg })

      if (sub === 'remove') {
        if (!safe.includes(target)) return sock.sendMessage(ctx.from, { text: `❌ @${target.split('@')[0]} is not in safe zone.`, mentions: [target] }, { quoted: msg })
        await api.setGroupSettings(ctx.from, { ...s, safezone: safe.filter(j => j !== target) })
        return sock.sendMessage(ctx.from, { text: `✅ @${target.split('@')[0]} removed from safe zone.`, mentions: [target] }, { quoted: msg })
      }

      if (safe.includes(target)) return sock.sendMessage(ctx.from, { text: `⚠️ @${target.split('@')[0]} already in safe zone.`, mentions: [target] }, { quoted: msg })
      if (safe.length >= 20) return sock.sendMessage(ctx.from, { text: '❌ Max 20 members in safe zone.' }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, safezone: [...safe, target] })
      await sock.sendMessage(ctx.from, { text: `🛡️ @${target.split('@')[0]} added to safe zone.`, mentions: [target] }, { quoted: msg })
    }
  }
]
