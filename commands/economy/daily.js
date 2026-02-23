const DAILY_CD = 24 * 60 * 60 * 1000
const FC = '🔥'

const fmtTime = (ms) => {
  const diff = Math.max(0, ms - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default [
  {
    command: 'daily', aliases: ['claim', 'reward'], category: 'economy',
    description: 'Claim your daily FireCoins reward', usage: '.daily', example: '.daily',
    handler: async (sock, msg, ctx, { api }) => {
      // Use senderStorageJid so the eco row is always keyed by phone, never @lid
      const ecoJid = ctx.senderStorageJid || ctx.sender

      const res = await api.getEco(ecoJid).catch(() => null)
      if (!res) {
        return sock.sendMessage(ctx.from, { text: '❌ Could not reach the server. Try again in a moment.' }, { quoted: msg })
      }

      const eco = res.eco || {}
      const now = Date.now()
      const lastDaily = (eco.last_daily || 0) * 1000
      const nextClaim = lastDaily + DAILY_CD

      if (lastDaily && now < nextClaim) {
        return sock.sendMessage(ctx.from, {
          text: `⏳ *Daily Already Claimed*\n\nCome back in *${fmtTime(nextClaim)}*.\n💰 Balance: *${eco.balance ?? 0} ${FC}*`
        }, { quoted: msg })
      }

      const cfgRes = await api.getSetting('daily_config').catch(() => null)
      const cfg    = cfgRes?.value || {}
      const base   = Math.floor(Math.random() * ((cfg.max || 300) - (cfg.min || 100) + 1)) + (cfg.min || 100)
      const bonus  = ctx.isPremium ? Math.floor(base * (cfg.premiumMultiplier || 0.5)) : 0
      const reward     = base + bonus
      const newBalance = (eco.balance ?? 0) + reward

      const lastDay  = Math.floor((lastDaily || 0) / DAILY_CD)
      const today    = Math.floor(now / DAILY_CD)
      const newStreak = lastDaily && today - lastDay === 1 ? (eco.streak ?? 0) + 1 : 1

      // ── Single atomic write — one D1 row, no partial saves ──────────────────
      const saved = await api.setEcoBatch(ecoJid, {
        balance:    newBalance,
        last_daily: Math.floor(now / 1000),
        streak:     newStreak,
      }).catch(err => {
        console.error('[daily] setEcoBatch failed:', err.message)
        return null
      })

      if (!saved?.ok) {
        // D1 write failed — tell the user, don't show a fake balance
        return sock.sendMessage(ctx.from, {
          text: `❌ *Server error saving your coins.* Please try again in a minute.\n\n_Your reward was NOT lost — the server couldn't confirm the save._`
        }, { quoted: msg })
      }

      const streakLine = newStreak >= 7 ? `🔥 *${newStreak}-day streak!*` : ''
      await sock.sendMessage(ctx.from, {
        text: [
          `💰 *Daily Reward Claimed!*`, ``,
          streakLine,
          `+${base} ${FC} FireCoins`,
          ctx.isPremium ? `+${bonus} ${FC} _(premium bonus)_` : '',
          ``, `🏦 *New Balance:* ${newBalance} ${FC}`,
          `🔥 *Streak:* ${newStreak} day(s)`,
          ``, `_Come back in 24 hours!_`
        ].filter(Boolean).join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'balance', aliases: ['bal', 'wallet', 'coins'], category: 'economy',
    description: "Check your or another user's balance", usage: '.balance [@user]', example: '.balance',
    handler: async (sock, msg, ctx, { api }) => {
      const targetRaw = ctx.mentionedJids[0] || null
      // Normalise mentioned JID too — mentioned JIDs can also be @lid
      const target    = targetRaw
        ? (targetRaw.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net')
        : ctx.senderStorageJid || ctx.sender
      const isSelf    = !targetRaw

      const res = await api.getEco(target).catch(() => null)
      const eco = res?.eco || {}

      const lastDaily = (eco.last_daily || 0) * 1000
      const nextClaim = lastDaily + DAILY_CD
      const canClaim  = !lastDaily || Date.now() >= nextClaim

      await sock.sendMessage(ctx.from, {
        text: [
          `💰 *${isSelf ? 'Your' : `@${target.split('@')[0]}'s`} Wallet*`,
          `${'─'.repeat(26)}`, ``,
          `💎 Balance: *${eco.balance ?? 0} ${FC}*`,
          `🔥 Streak:  *${eco.streak ?? 0} day(s)*`,
          isSelf
            ? (canClaim ? `✅ Daily *ready to claim!*` : `⏳ Next daily in *${fmtTime(nextClaim)}*`)
            : '',
        ].filter(Boolean).join('\n'),
        mentions: isSelf ? [] : [targetRaw]
      }, { quoted: msg })
    }
  },
]
