// ── LID-safe participant matcher ─────────────────────────────────────────────
const pMatch = (p, jid) => {
  if (!p || !jid) return false
  if (p.id === jid) return true
  const pNum = (p.pn || p.id).split('@')[0].replace(/\D/g, '')
  const jNum = jid.split('@')[0].replace(/\D/g, '')
  return pNum.length > 4 && pNum === jNum
}

export default [
  {
    command: 'promote',
    aliases: ['makeadmin'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender
      if (!target) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to a user.\n📌 *Usage:* ${ctx.prefix}promote @user` }, { quoted: msg })
      const parts = ctx.groupMeta?.participants || []
      const already = parts.some(p => pMatch(p, target) && ['admin','superadmin'].includes(p.admin))
      if (already) return sock.sendMessage(ctx.from, { text: `❌ @${target.split('@')[0]} is already an admin.`, mentions: [target] }, { quoted: msg })
      await sock.groupParticipantsUpdate(ctx.from, [target], 'promote')
      await sock.sendMessage(ctx.from, { text: `✅ @${target.split('@')[0]} promoted to admin.`, mentions: [target] }, { quoted: msg })
    }
  },
  {
    command: 'demote',
    aliases: ['removeadmin'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender
      if (!target) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to a user.\n📌 *Usage:* ${ctx.prefix}demote @user` }, { quoted: msg })
      const parts = ctx.groupMeta?.participants || []
      const isSuperAdmin = parts.some(p => pMatch(p, target) && p.admin === 'superadmin')
      if (isSuperAdmin) return sock.sendMessage(ctx.from, { text: '❌ Cannot demote the group creator.' }, { quoted: msg })
      const isAdm = parts.some(p => pMatch(p, target) && p.admin === 'admin')
      if (!isAdm) return sock.sendMessage(ctx.from, { text: `❌ @${target.split('@')[0]} is not an admin.`, mentions: [target] }, { quoted: msg })
      await sock.groupParticipantsUpdate(ctx.from, [target], 'demote')
      await sock.sendMessage(ctx.from, { text: `✅ @${target.split('@')[0]} demoted from admin.`, mentions: [target] }, { quoted: msg })
    }
  }
]
