// ── LID-safe participant matcher ─────────────────────────────────────────────
// In LID groups, mentioned JIDs and participant IDs are both @lid — direct
// equality works. But in mixed or transitioning groups, one side may be @lid
// while the other is @s.whatsapp.net.  This helper handles both cases by
// comparing normalized phone digits and also checking p.pn when available.
const pMatch = (p, jid) => {
  if (!p || !jid) return false
  if (p.id === jid) return true
  // p.pn is set by Baileys v7 for LID participants — it holds the real phone
  const pNum = (p.pn || p.id).split('@')[0].replace(/\D/g, '')
  const jNum = jid.split('@')[0].replace(/\D/g, '')
  return pNum.length > 4 && pNum === jNum
}

export default [
  {
    command: 'kick',
    aliases: ['remove'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender
      if (!target) return sock.sendMessage(ctx.from, { text: `❌ Tag or reply to a user.\n📌 *Usage:* ${ctx.prefix}kick @user` }, { quoted: msg })
      const parts = ctx.groupMeta?.participants || []
      const isAdm = parts.some(p => pMatch(p, target) && ['admin','superadmin'].includes(p.admin))
      if (isAdm) return sock.sendMessage(ctx.from, { text: '❌ Cannot kick an admin.' }, { quoted: msg })
      if (target === ctx.botId) return sock.sendMessage(ctx.from, { text: '❌ I cannot kick myself.' }, { quoted: msg })
      await sock.groupParticipantsUpdate(ctx.from, [target], 'remove')
      await sock.sendMessage(ctx.from, { text: `✅ @${target.split('@')[0]} has been removed.`, mentions: [target] }, { quoted: msg })
    }
  },
  {
    command: 'add',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const num = ctx.args[0]?.replace(/\D/g, '')
      if (!num) return sock.sendMessage(ctx.from, { text: `❌ Provide a number.\n📌 *Usage:* ${ctx.prefix}add <number>` }, { quoted: msg })
      const jid = num + '@s.whatsapp.net'
      const res = await sock.groupParticipantsUpdate(ctx.from, [jid], 'add')
      const code = res?.[0]?.status
      const map = { 200: `✅ Added +${num}.`, 403: `❌ +${num} blocked group adds.`, 408: `❌ +${num} not on WhatsApp.`, 409: `⚠️ +${num} is already in the group.` }
      await sock.sendMessage(ctx.from, { text: map[code] || `❓ Status: ${code}` }, { quoted: msg })
    }
  }
]
