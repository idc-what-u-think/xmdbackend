const FC = '🔥'
const nowSec = () => Math.floor(Date.now() / 1000)
const fmtSecs = (s) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

const JOBS = [
  'delivered packages 📦', 'fixed computers 💻', 'drove a taxi 🚗',
  'sold hotdogs 🌭', 'wrote code 🖥️', 'painted a house 🎨',
  'washed cars 🚙', 'walked dogs 🐕', 'cooked food 🍳', 'tutored students 📚'
]
const CRIMES_WIN  = ['robbed a bank 🏦', 'hacked an ATM 💻', 'picked pockets 👝', 'sold bootleg DVDs 📀']
const CRIMES_LOSE = ['got caught shoplifting 🛒', 'slipped running from cops 🚓', 'got caught hacking 💻', 'dropped the bag 🎒']

export default [
  {
    command: 'work',
    aliases: ['job', 'earn'],
    category: 'economy',
    handler: async (sock, msg, ctx, { api }) => {
      const res    = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco    = res?.eco || {}
      const cfgRes = await api.getSetting('work_config')
      const cfg    = cfgRes?.value || {}

      const cd   = ctx.isPremium ? (cfg.premiumCooldown || 1800) : (cfg.freeCooldown || 3600)
      const diff = nowSec() - (eco.last_work || 0)

      if (diff < cd) {
        return sock.sendMessage(ctx.from, {
          text: `⏳ Still tired! Work again in *${fmtSecs(cd - diff)}*`
        }, { quoted: msg })
      }

      const base   = Math.floor(Math.random() * ((cfg.max || 400) - (cfg.min || 100) + 1)) + (cfg.min || 100)
      const bonus  = ctx.isPremium ? Math.floor(base * 0.25) : 0
      const earned = base + bonus
      const newBal = (eco.balance ?? 0) + earned
      const job    = JOBS[Math.floor(Math.random() * JOBS.length)]

      // ── Atomic write: balance + cooldown in one request ──────────────────
      const saved = await api.setEcoBatch(ctx.senderStorageJid || ctx.sender, {
        balance:   newBal,
        last_work: nowSec(),
      }).catch(() => null)

      if (!saved?.ok) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Server error saving your coins. Please try again.`
        }, { quoted: msg })
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `💼 You ${job} and earned *+${earned} ${FC}*!`,
          ctx.isPremium ? `_(includes +${bonus} premium bonus)_` : '',
          `💰 Balance: *${newBal} ${FC}*`,
          `⏳ Next work in *${fmtSecs(cd)}*`
        ].filter(Boolean).join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'crime',
    aliases: ['rob', 'steal'],
    category: 'economy',
    handler: async (sock, msg, ctx, { api }) => {
      const res    = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco    = res?.eco || {}
      const cfgRes = await api.getSetting('crime_config')
      const cfg    = cfgRes?.value || {}

      const cd   = ctx.isPremium ? (cfg.premiumCooldown || 3600) : (cfg.freeCooldown || 7200)
      const diff = nowSec() - (eco.last_crime || 0)

      if (diff < cd) {
        return sock.sendMessage(ctx.from, {
          text: `⏳ Cops are still watching! Lay low for *${fmtSecs(cd - diff)}*`
        }, { quoted: msg })
      }

      const win    = Math.random() < (cfg.winChance || 0.6)
      const reward = win ? (cfg.win || 600) : (cfg.loss || 200)
      const newBal = win
        ? (eco.balance ?? 0) + reward
        : Math.max(0, (eco.balance ?? 0) - reward)
      const act = win
        ? CRIMES_WIN[Math.floor(Math.random() * CRIMES_WIN.length)]
        : CRIMES_LOSE[Math.floor(Math.random() * CRIMES_LOSE.length)]

      // ── Atomic write: balance + cooldown in one request ──────────────────
      const saved = await api.setEcoBatch(ctx.senderStorageJid || ctx.sender, {
        balance:    newBal,
        last_crime: nowSec(),
      }).catch(() => null)

      if (!saved?.ok) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Server error saving your coins. Please try again.`
        }, { quoted: msg })
      }

      await sock.sendMessage(ctx.from, {
        text: win
          ? `😈 You ${act} and got *+${reward} ${FC}*!\n💰 Balance: *${newBal} ${FC}*`
          : `🚨 You ${act} and lost *-${reward} ${FC}*!\n💰 Balance: *${newBal} ${FC}*`
      }, { quoted: msg })
    }
  },
]
