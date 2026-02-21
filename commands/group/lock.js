// commands/group/lock.js
// Commands: .lock | .unlock

export default [

  // ── .lock ─────────────────────────────────────────────
  {
    command:  'lock',
    aliases:  ['lockgc'],
    category: 'group',
    description: 'Lock group info — only admins can edit name, description, and icon',
    usage:    '.lock',
    example:  '.lock',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can lock the group.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to lock the group.'
        }, { quoted: msg })
      }

      // Check if already locked
      if (ctx.groupMeta?.restrict === true) {
        return sock.sendMessage(ctx.from, {
          text: '⚠️ Group info is already locked.'
        }, { quoted: msg })
      }

      try {
        await sock.groupSettingUpdate(ctx.from, 'locked')

        await sock.sendMessage(ctx.from, {
          text: `🔒 *Group Locked*\n\nOnly admins can edit the group name, description, and icon.\nUse ${ctx.prefix}unlock to allow everyone to edit.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to lock: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .unlock ───────────────────────────────────────────
  {
    command:  'unlock',
    aliases:  ['unlockgc'],
    category: 'group',
    description: 'Unlock group info — everyone can edit name, description, and icon',
    usage:    '.unlock',
    example:  '.unlock',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can unlock the group.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to unlock the group.'
        }, { quoted: msg })
      }

      // Check if already unlocked
      if (!ctx.groupMeta?.restrict) {
        return sock.sendMessage(ctx.from, {
          text: '⚠️ Group info is already unlocked — everyone can edit.'
        }, { quoted: msg })
      }

      try {
        await sock.groupSettingUpdate(ctx.from, 'unlocked')

        await sock.sendMessage(ctx.from, {
          text: `🔓 *Group Unlocked*\n\nEveryone can now edit the group name, description, and icon.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to unlock: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
