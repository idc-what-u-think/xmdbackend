export default [
  {
    command: 'chatbot',
    aliases: ['autoreply', 'autoai'],
    handler: async (sock, msg, ctx, { api }) => {
      if (ctx.isGroup && !ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, { text: '❌ Only group admins can toggle chatbot.' }, { quoted: msg })
      }
      if (!ctx.isGroup && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, { text: '❌ Only the bot owner can toggle chatbot in DMs.' }, { quoted: msg })
      }
      const input = ctx.query?.toLowerCase().trim()
      if (!input) {
        const res = ctx.isGroup
          ? await api.getGroupSettings(ctx.from)
          : await api.sessionGet('chatbot:dm')
        const cur = ctx.isGroup ? (res.settings?.chatbot || 'off') : (res.value || 'off')
        return sock.sendMessage(ctx.from, {
          text: `🤖 *Chatbot*\n\nCurrent: *${cur.toUpperCase()}*\n\nWhen ON, the bot replies to every message with AI.\n\nUsage: \`${ctx.prefix}chatbot on/off\``
        }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      if (ctx.isGroup) {
        const r = await api.getGroupSettings(ctx.from)
        const s = { ...(r.settings || {}), chatbot: input }
        await api.setGroupSettings(ctx.from, s)
      } else {
        await api.sessionSet('chatbot:dm', input)
      }
      await sock.sendMessage(ctx.from, {
        text: input === 'on' ? `🤖 *Chatbot Enabled*\n\nI will now auto-reply using AI.` : `🤖 *Chatbot Disabled*`
      }, { quoted: msg })
    }
  },
  {
    command: 'autoreplygc',
    aliases: ['gcautoreply', 'groupchatbot'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim()
      if (!input) {
        const res = await api.getGroupSettings(ctx.from)
        const cur = res.settings?.autoreplygc || 'off'
        return sock.sendMessage(ctx.from, {
          text: `💬 *Group Auto-Reply*\n\nCurrent: *${cur.toUpperCase()}*\n\nUsage: \`${ctx.prefix}autoreplygc on/off\``
        }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      const r = await api.getGroupSettings(ctx.from)
      const s = { ...(r.settings || {}), autoreplygc: input }
      await api.setGroupSettings(ctx.from, s)
      await sock.sendMessage(ctx.from, {
        text: input === 'on' ? `💬 *Group Auto-Reply Enabled*` : `💬 *Group Auto-Reply Disabled*`
      }, { quoted: msg })
    }
  }
]
