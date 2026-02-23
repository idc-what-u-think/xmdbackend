const FC = '🔥'
const nowSec = () => Math.floor(Date.now() / 1000)
const fmtSecs = (s) => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60; if (h>0) return `${h}h ${m}m`; if (m>0) return `${m}m ${sec}s`; return `${sec}s` }
const JOBS = ['delivered packages 📦','fixed computers 💻','drove a taxi 🚗','sold hotdogs 🌭','wrote code 🖥️','painted a house 🎨','washed cars 🚙','walked dogs 🐕','cooked food 🍳','tutored students 📚']
const CRIMES_WIN = ['robbed a bank 🏦','hacked an ATM 💻','picked pockets 👝','sold bootleg DVDs 📀']
const CRIMES_LOSE = ['got caught shoplifting 🛒','slipped running from cops 🚓','got caught hacking 💻','dropped the bag 🎒']

export default [
  {
    command: 'work', aliases: ['job', 'earn'], category: 'economy',
    description: 'Work to earn FireCoins', usage: '.work', example: '.work',
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco = res?.eco || {}
      const cfgRes = await api.getSetting('work_config')
      const cfg = cfgRes?.value || {}
      const cd = ctx.isPremium ? (cfg.premiumCooldown || 1800) : (cfg.freeCooldown || 3600)
      const diff = nowSec() - (eco.last_work || 0)
      if (diff < cd) return sock.sendMessage(ctx.from, { text: `⏳ Still tired! Work again in *${fmtSecs(cd - diff)}*` }, { quoted: msg })
      const earned = Math.floor(Math.random() * ((cfg.max || 400) - (cfg.min || 100) + 1)) + (cfg.min || 100)
      const newBal = (eco.balance ?? 0) + earned
      const job = JOBS[Math.floor(Math.random() * JOBS.length)]
      await Promise.all([api.setEco(ctx.senderStorageJid || ctx.sender, 'balance', newBal), api.setEco(ctx.senderStorageJid || ctx.sender, 'last_work', nowSec())])
      await sock.sendMessage(ctx.from, { text: `💼 You ${job} and earned *+${earned} ${FC}*!\n💰 Balance: *${newBal} ${FC}*` }, { quoted: msg })
    }
  },
  {
    command: 'crime', aliases: ['rob', 'steal'], category: 'economy',
    description: 'Commit a crime for big rewards or losses', usage: '.crime', example: '.crime',
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco = res?.eco || {}
      const cfgRes = await api.getSetting('crime_config')
      const cfg = cfgRes?.value || {}
      const cd = ctx.isPremium ? (cfg.premiumCooldown || 3600) : (cfg.freeCooldown || 7200)
      const diff = nowSec() - (eco.last_crime || 0)
      if (diff < cd) return sock.sendMessage(ctx.from, { text: `⏳ Cops are still watching! Lay low for *${fmtSecs(cd - diff)}*` }, { quoted: msg })
      const win = Math.random() < (cfg.winChance || 0.6)
      const reward = win ? (cfg.win || 600) : (cfg.loss || 200)
      const newBal = win ? (eco.balance ?? 0) + reward : Math.max(0, (eco.balance ?? 0) - reward)
      const act = win ? CRIMES_WIN[Math.floor(Math.random() * CRIMES_WIN.length)] : CRIMES_LOSE[Math.floor(Math.random() * CRIMES_LOSE.length)]
      await Promise.all([api.setEco(ctx.senderStorageJid || ctx.sender, 'balance', newBal), api.setEco(ctx.senderStorageJid || ctx.sender, 'last_crime', nowSec())])
      await sock.sendMessage(ctx.from, { text: win ? `😈 You ${act} and got *+${reward} ${FC}*!\n💰 Balance: *${newBal} ${FC}*` : `🚨 You ${act} and lost *-${reward} ${FC}*!\n💰 Balance: *${newBal} ${FC}*` }, { quoted: msg })
    }
  },
]
