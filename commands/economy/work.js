const FC = '🔥'
const WORK_CD  = 60 * 60 * 1000
const CRIME_CD = 2 * 60 * 60 * 1000
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const timeLeft = (f) => { const d = Math.max(0, f - Date.now()); const h = Math.floor(d / 3600000); const m = Math.floor((d % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${m}m` }

const JOBS = [
  { job: 'Software Developer',   action: 'Fixed a nasty bug',           min: 80,  max: 250 },
  { job: 'Content Creator',      action: 'Made a viral post',           min: 60,  max: 300 },
  { job: 'Delivery Driver',      action: 'Completed 12 deliveries',     min: 50,  max: 150 },
  { job: 'Street Vendor',        action: 'Sold out your stock',         min: 40,  max: 180 },
  { job: 'Graphic Designer',     action: 'Finished a client logo',      min: 70,  max: 220 },
  { job: 'Music Producer',       action: 'Sold a beat online',          min: 90,  max: 280 },
  { job: 'Barber',               action: 'Cut 8 heads today',           min: 45,  max: 130 },
  { job: 'Chef',                 action: 'Cooked for a big event',      min: 65,  max: 210 },
  { job: 'Photographer',         action: 'Shot a wedding event',        min: 100, max: 350 },
]

const CRIMES = [
  { crime: 'Phone Scam',          caught: 'Victim traced the call',           min: 150, max: 500, fine: 100 },
  { crime: 'Fuel Hoarding',       caught: 'NNPC officials raided your store', min: 200, max: 600, fine: 150 },
  { crime: 'Fake Products',       caught: 'Customer reported you to NAFDAC',  min: 120, max: 400, fine: 90  },
  { crime: 'Market Overpricing',  caught: 'Consumer protection showed up',    min: 100, max: 350, fine: 80  },
  { crime: 'Counterfeit Cash',    caught: 'Bank teller spotted the fakes',    min: 300, max: 800, fine: 200 },
  { crime: 'Touting',             caught: 'Area boys turned on you',          min: 60,  max: 200, fine: 50  },
]

export default [
  {
    command: 'work',
    aliases: ['hustle', 'grind'],
    handler: async (sock, msg, ctx, { api }) => {
      const res  = await api.getEco(ctx.sender)
      const eco  = res.eco || {}
      const last = eco.last_work || 0
      const next = last + WORK_CD
      if (last && Date.now() < next) {
        return sock.sendMessage(ctx.from, { text: `⏳ *Still working...*\n\nRest first. Come back in *${timeLeft(next)}*.` }, { quoted: msg })
      }
      const s      = pick(JOBS)
      const earned = Math.floor(Math.random() * (s.max - s.min + 1)) + s.min
      const bonus  = ctx.isPremium ? Math.floor(earned * 0.25) : 0
      const total  = earned + bonus
      const newBal = (eco.balance ?? 0) + total
      await Promise.all([api.setEco(ctx.sender, 'balance', newBal), api.setEco(ctx.sender, 'last_work', Date.now())])
      await sock.sendMessage(ctx.from, {
        text: [`💼 *Work Complete*`, ``, `👷 *Job:* ${s.job}`, `✅ *Task:* ${s.action}`, ``, `+${earned} ${FC}${bonus ? ` +${bonus} ${FC} _(premium)_` : ''}`, ``, `🏦 *Balance:* ${newBal} ${FC}`, `_Next shift in 1 hour_`].join('\n')
      }, { quoted: msg })
    }
  },
  {
    command: 'crime',
    aliases: ['hustle2'],
    handler: async (sock, msg, ctx, { api }) => {
      const res  = await api.getEco(ctx.sender)
      const eco  = res.eco || {}
      const last = eco.last_crime || 0
      const next = last + CRIME_CD
      if (last && Date.now() < next) {
        return sock.sendMessage(ctx.from, { text: `⏳ *Laying low...*\n\nHeat is still on. Come back in *${timeLeft(next)}*.` }, { quoted: msg })
      }
      const s      = pick(CRIMES)
      const caught = Math.random() < 0.35
      const now    = Date.now()
      await api.setEco(ctx.sender, 'last_crime', now)
      if (caught) {
        const fine   = s.fine + Math.floor(Math.random() * 50)
        const newBal = Math.max(0, (eco.balance ?? 0) - fine)
        await api.setEco(ctx.sender, 'balance', newBal)
        await sock.sendMessage(ctx.from, { text: [`🚨 *Caught!*`, ``, `🦹 *Crime:* ${s.crime}`, `👮 ${s.caught}`, ``, `-${fine} ${FC} _(fine)_`, `🏦 *Balance:* ${newBal} ${FC}`, `_Lay low for 2 hours_`].join('\n') }, { quoted: msg })
      } else {
        const earned = Math.floor(Math.random() * (s.max - s.min + 1)) + s.min
        const newBal = (eco.balance ?? 0) + earned
        await api.setEco(ctx.sender, 'balance', newBal)
        await sock.sendMessage(ctx.from, { text: [`🦹 *Crime Successful!*`, ``, `🎭 *Crime:* ${s.crime}`, `✅ Got away clean!`, ``, `+${earned} ${FC}`, `🏦 *Balance:* ${newBal} ${FC}`, `_Wait 2 hours before next job_`].join('\n') }, { quoted: msg })
      }
    }
  }
]
