export default [
  {
    command: 'mute',
    aliases: ['close', 'mutegroup'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.groupSettingUpdate(ctx.from, 'announcement')
      await sock.sendMessage(ctx.from, { text: '🔇 Group muted. Only admins can send messages.' }, { quoted: msg })
    }
  },
  {
    command: 'unmute',
    aliases: ['open', 'unmutegroup'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.groupSettingUpdate(ctx.from, 'not_announcement')
      await sock.sendMessage(ctx.from, { text: '🔊 Group unmuted. All members can send messages.' }, { quoted: msg })
    }
  },
  {
    command: 'lock',
    aliases: ['lockgroup'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.groupSettingUpdate(ctx.from, 'locked')
      await sock.sendMessage(ctx.from, { text: '🔒 Group locked. Only admins can edit group info.' }, { quoted: msg })
    }
  },
  {
    command: 'unlock',
    aliases: ['unlockgroup'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.groupSettingUpdate(ctx.from, 'unlocked')
      await sock.sendMessage(ctx.from, { text: '🔓 Group unlocked. All members can edit group info.' }, { quoted: msg })
    }
  }
]
