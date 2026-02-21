// commands/group/mute.js
// Commands: .mute | .unmute

export default [

  // ── .mute ─────────────────────────────────────────────
  {
    command:  'mute',
    aliases:  ['close'],
    category: 'group',
    description: 'Mute the group — only admins can send messages',
    usage:    '.mute',
    example:  '.mute',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can mute the group.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to mute the group.'
        }, { quoted: msg })
      }

      // Check if already muted
      if (ctx.groupMeta?.announce === true) {
        return sock.sendMessage(ctx.from, {
          text: '⚠️ The group is already muted.'
        }, { quoted: msg })
      }

      try {
        await sock.groupSettingUpdate(ctx.from, 'announcement')

        await sock.sendMessage(ctx.from, {
          text: `🔇 *Group Muted*\n\nOnly admins can send messages now.\nUse ${ctx.prefix}unmute to re-open the group.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to mute: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .unmute ───────────────────────────────────────────
  {
    command:  'unmute',
    aliases:  ['open'],
    category: 'group',
    description: 'Unmute the group — everyone can send messages',
    usage:    '.unmute',
    example:  '.unmute',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can unmute the group.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to unmute the group.'
        }, { quoted: msg })
      }

      // Check if already unmuted
      if (!ctx.groupMeta?.announce) {
        return sock.sendMessage(ctx.from, {
          text: '⚠️ The group is already open — everyone can send.'
        }, { quoted: msg })
      }

      try {
        await sock.groupSettingUpdate(ctx.from, 'not_announcement')

        await sock.sendMessage(ctx.from, {
          text: `🔊 *Group Unmuted*\n\nEveryone can send messages now.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to unmute: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
