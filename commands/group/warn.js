const MAX_WARNS = 3

export default [
  {
    command: 'warn',
    aliases: ['warning'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender
      if (!target) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to a user.\n📌 *Usage:* ${ctx.prefix}warn @user [reason]` }, { quoted: msg })
      const parts = ctx.groupMeta?.participants || []
      const isAdm = parts.some(p => p.id === target && ['admin','superadmin'].includes(p.admin))
      if (isAdm) return sock.sendMessage(ctx.from, { text: '❌ Cannot warn an admin.' }, { quoted: msg })
      const reason = ctx.args.filter(a => !a.startsWith('@')).join(' ') || 'No reason given'
      const res = await api.addWarn(target, ctx.from, reason, ctx.sender)
      const count = res.count || 1
      const num = target.split('@')[0]
      if (count >= MAX_WARNS) {
        await sock.sendMessage(ctx.from, {
          text: `⚠️ @${num} has been warned ${count}/${MAX_WARNS} times.\n\n📌 *Reason:* ${reason}\n\n🚨 Max warns reached — removing from group.`,
          mentions: [target]
        }, { quoted: msg })
        await sock.groupParticipantsUpdate(ctx.from, [target], 'remove').catch(() => {})
      } else {
        await sock.sendMessage(ctx.from, {
          text: `⚠️ @${num} has been warned.\n\n📌 *Reason:* ${reason}\n📊 *Warns:* ${count}/${MAX_WARNS}`,
          mentions: [target]
        }, { quoted: msg })
      }
    }
  },
  {
    command: 'resetwarn',
    aliases: ['clearwarn', 'unwarn'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender
      if (!target) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to a user.\n📌 *Usage:* ${ctx.prefix}resetwarn @user` }, { quoted: msg })
      await api.resetWarns(target, ctx.from)
      await sock.sendMessage(ctx.from, {
        text: `✅ Warns cleared for @${target.split('@')[0]}.`,
        mentions: [target]
      }, { quoted: msg })
    }
  },
  {
    command: 'warnlist',
    aliases: ['warns', 'checkwarn'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender || null
      const res = await api.getWarns(target, ctx.from)
      const list = res.warns || []
      if (!list.length) {
        return sock.sendMessage(ctx.from, {
          text: target ? `✅ @${target.split('@')[0]} has no warns.` : '✅ No warns in this group.',
          mentions: target ? [target] : []
        }, { quoted: msg })
      }
      const sorted = [...list].sort((a, b) => b.count - a.count)
      const lines = sorted.map((w, i) => `${i + 1}. +${w.jid.split('@')[0]} — *${w.count}/${MAX_WARNS}* warns`)
      await sock.sendMessage(ctx.from, {
        text: `⚠️ *Warn List*\n${'─'.repeat(26)}\n\n${lines.join('\n')}`
      }, { quoted: msg })
    }
  }
]
