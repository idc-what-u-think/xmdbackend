// commands/economy/daily.js
// Commands: .daily | .balance

// ── Worker helper ─────────────────────────────────────────
const w = async (path, opts = {}) => {
  try {
    const r = await fetch(`${process.env.WORKER_URL}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': process.env.BOT_SECRET,
        ...opts.headers,
      },
    })
    return await r.json()
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

const getEco  = (jid) => w(`/bot/eco?jid=${encodeURIComponent(jid)}`)
const setEco  = (jid, field, value) => w('/bot/eco', {
  method: 'POST',
  body:   JSON.stringify({ jid, field, value }),
})

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000   // 24 hours
const CURRENCY       = 'FireCoins 🔥'
const FC             = '🔥'

// Format time left from now to a future timestamp
const formatTimeLeft = (futureMs) => {
  const diff  = Math.max(0, futureMs - Date.now())
  const hrs   = Math.floor(diff / 3_600_000)
  const mins  = Math.floor((diff % 3_600_000) / 60_000)
  const secs  = Math.floor((diff % 60_000) / 1_000)
  if (hrs > 0)  return `${hrs}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

export default [

  // ── .daily ────────────────────────────────────────────
  {
    command:  'daily',
    aliases:  ['claim', 'reward'],
    category: 'economy',
    description: 'Claim your daily FireCoins reward',
    usage:    '.daily',
    example:  '.daily',

    handler: async (sock, msg, args, ctx) => {
      try {
        const res  = await getEco(ctx.sender)
        const eco  = res?.data || {}

        const lastDaily  = eco.last_daily || 0
        const nextClaim  = lastDaily + DAILY_COOLDOWN
        const now        = Date.now()

        if (lastDaily && now < nextClaim) {
          const timeLeft = formatTimeLeft(nextClaim)
          return sock.sendMessage(ctx.from, {
            text: [
              `⏳ *Daily Already Claimed*`,
              ``,
              `Come back in *${timeLeft}* for your next reward.`,
              `💰 Balance: *${eco.balance ?? 0} ${FC}*`
            ].join('\n')
          }, { quoted: msg })
        }

        // Random daily reward — premium users get a bonus
        const base   = Math.floor(Math.random() * 401) + 100   // 100–500
        const bonus  = ctx.isPremium ? Math.floor(base * 0.5) : 0
        const reward = base + bonus

        // Update balance and timestamp
        const newBalance = (eco.balance ?? 0) + reward
        await setEco(ctx.sender, 'balance',    newBalance)
        await setEco(ctx.sender, 'last_daily', now)

        // Streak tracking
        const streak    = (eco.streak ?? 0)
        const lastDay   = Math.floor(lastDaily / DAILY_COOLDOWN)
        const today     = Math.floor(now       / DAILY_COOLDOWN)
        const newStreak = lastDaily && today - lastDay === 1 ? streak + 1 : 1
        await setEco(ctx.sender, 'streak', newStreak)

        const streakBonus = newStreak >= 7 ? `🔥 *${newStreak}-day streak bonus!*\n` : ''

        await sock.sendMessage(ctx.from, {
          text: [
            `💰 *Daily Reward Claimed!*`,
            ``,
            `${streakBonus}+${base} ${CURRENCY}`,
            ctx.isPremium ? `+${bonus} ${FC} _(premium bonus)_` : '',
            ``,
            `🏦 *New Balance:* ${newBalance} ${FC}`,
            `🔥 *Streak:* ${newStreak} day(s)`,
            ``,
            `_Come back in 24 hours for more!_`
          ].filter(Boolean).join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .balance ──────────────────────────────────────────
  {
    command:  'balance',
    aliases:  ['bal', 'wallet', 'coins'],
    category: 'economy',
    description: 'Check your FireCoin balance or another user\'s balance',
    usage:    '.balance [@user]',
    example:  '.balance',

    handler: async (sock, msg, args, ctx) => {
      try {
        // Allow checking another user's balance by mention
        const targetJid  = ctx.mentionedJids[0] || ctx.sender
        const targetNum  = targetJid.split('@')[0]
        const isSelf     = targetJid === ctx.sender

        const res  = await getEco(targetJid)
        const eco  = res?.data || {}

        const balance    = eco.balance    ?? 0
        const streak     = eco.streak     ?? 0
        const lastDaily  = eco.last_daily ?? 0
        const now        = Date.now()
        const nextClaim  = lastDaily + DAILY_COOLDOWN
        const canClaim   = !lastDaily || now >= nextClaim

        const claimStatus = isSelf
          ? (canClaim ? `✅ Daily is *ready to claim!*` : `⏳ Next daily in *${formatTimeLeft(nextClaim)}*`)
          : ''

        await sock.sendMessage(ctx.from, {
          text: [
            `💰 *${isSelf ? 'Your' : `@${targetNum}'s`} Wallet*`,
            `${'─'.repeat(26)}`,
            ``,
            `💎 Balance:  *${balance} ${FC}*`,
            `🔥 Streak:   *${streak} day(s)*`,
            claimStatus,
          ].filter(Boolean).join('\n'),
          mentions: isSelf ? [] : [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
