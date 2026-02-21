const COOLDOWN = 24 * 60 * 60 * 1000
const FC = '🔥'

const timeLeft = (future) => {
  const d = Math.max(0, future - Date.now())
  const h = Math.floor(d / 3600000)
  const m = Math.floor((d % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default [
  {
    command: 'daily',
    aliases: ['claim', 'reward'],
    handler: async (sock, msg, ctx, { api }) => {
      const res    = await api.getEco(ctx.sender)
      const eco    = res.eco || {}
      const last   = eco.last_daily || 0
      const next   = last + COOLDOWN
      const now    = Date.now()
      if (last && now < next) {
        return sock.sendMessage(ctx.from, {
          text: `⏳ *Already claimed!*\n\nCome back in *${timeLeft(next)}*.\n💰 Balance: *${eco.balance ?? 0} ${FC}*`
        }, { quoted: msg })
      }
      const base   = Math.floor(Math.random() * 401) + 100
      const bonus  = ctx.isPremium ? Math.floor(base * 0.5) : 0
      const reward = base + bonus
      const newBal = (eco.balance ?? 0) + reward
      await Promise.all([
        api.setEco(ctx.sender, 'balance', newBal),
        api.setEco(ctx.sender, 'last_daily', now)
      ])
      await sock.sendMessage(ctx.from, {
        text: [
          `💰 *Daily Claimed!*`,
          ``,
          `+${base} ${FC}`,
          bonus ? `+${bonus} ${FC} _(premium bonus)_` : '',
          ``,
          `🏦 *Balance:* ${newBal} ${FC}`,
          `_Come back in 24 hours!_`
        ].filter(Boolean).join('\n')
      }, { quoted: msg })
    }
  },
  {
    command: 'balance',
    aliases: ['bal', 'wallet', 'coins'],
    handler: async (sock, msg, ctx, { api }) => {
      const target  = ctx.mentionedJids[0] || ctx.sender
      const isSelf  = target === ctx.sender
      const res     = await api.getEco(target)
      const eco     = res.eco || {}
      const bal     = eco.balance ?? 0
      const last    = eco.last_daily || 0
      const canClaim = !last || Date.now() >= last + COOLDOWN
      const claimLine = isSelf ? (canClaim ? `✅ Daily *ready!*` : `⏳ Next daily in *${timeLeft(last + COOLDOWN)}*`) : ''
      await sock.sendMessage(ctx.from, {
        text: [
          `💰 *${isSelf ? 'Your' : `@${target.split('@')[0]}'s`} Wallet*`,
          `${'─'.repeat(26)}`,
          `💎 Balance: *${bal} ${FC}*`,
          claimLine
        ].filter(Boolean).join('\n'),
        mentions: isSelf ? [] : [target]
      }, { quoted: msg })
    }
  }
]
