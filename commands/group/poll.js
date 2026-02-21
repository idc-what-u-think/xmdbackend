export default {
  command: 'poll',
  aliases: ['vote'],
  groupOnly: true,
  handler: async (sock, msg, ctx, { api }) => {
    if (!ctx.query) return sock.sendMessage(ctx.from, {
      text: `📊 *Poll Usage*\n\n${ctx.prefix}poll Question | Option1 | Option2\n\nExample:\n${ctx.prefix}poll Best meal? | Rice | Yam | Bread\n\n_Separate with | pipes. Max 12 options._`
    }, { quoted: msg })
    const parts = ctx.query.split('|').map(s => s.trim()).filter(Boolean)
    if (parts.length < 2) return sock.sendMessage(ctx.from, { text: '❌ Provide a question and at least one option separated by |' }, { quoted: msg })
    const question = parts[0]
    const options  = parts.slice(1)
    if (question.length > 255) return sock.sendMessage(ctx.from, { text: '❌ Question must be 255 characters or less.' }, { quoted: msg })
    if (options.length > 12) return sock.sendMessage(ctx.from, { text: '❌ Maximum 12 options.' }, { quoted: msg })
    if (options.some(o => o.length > 100)) return sock.sendMessage(ctx.from, { text: '❌ Each option must be 100 characters or less.' }, { quoted: msg })
    await sock.sendMessage(ctx.from, {
      poll: { name: question, values: options, selectableCount: 1 }
    })
  }
}
