// commands/economy/work.js
// Commands: .work | .crime

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

const getEco = (jid) => w(`/bot/eco?jid=${encodeURIComponent(jid)}`)
const setEco = (jid, field, value) => w('/bot/eco', {
  method: 'POST',
  body:   JSON.stringify({ jid, field, value }),
})

const WORK_COOLDOWN  = 60 * 60 * 1000         // 1 hour
const CRIME_COOLDOWN = 2 * 60 * 60 * 1000     // 2 hours
const FC             = '🔥'

const formatTimeLeft = (futureMs) => {
  const diff = Math.max(0, futureMs - Date.now())
  const hrs  = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  const secs = Math.floor((diff % 60_000) / 1_000)
  if (hrs > 0)  return `${hrs}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

// Random item from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Work scenarios — keeps the game fun and varied
const WORK_SCENARIOS = [
  { job: 'Software Developer',  action: 'Fixed a nasty bug',          min: 80,  max: 250 },
  { job: 'Content Creator',     action: 'Made a viral TikTok',        min: 60,  max: 300 },
  { job: 'Delivery Driver',     action: 'Completed 12 deliveries',    min: 50,  max: 150 },
  { job: 'Street Vendor',       action: 'Sold out your stock',        min: 40,  max: 180 },
  { job: 'Graphic Designer',    action: 'Finished a client logo',     min: 70,  max: 220 },
  { job: 'Music Producer',      action: 'Sold a beat online',         min: 90,  max: 280 },
  { job: 'Football Coach',      action: 'Trained the youth team',     min: 50,  max: 160 },
  { job: 'Social Media Manager',action: 'Grew a page by 1k followers',min: 60,  max: 200 },
  { job: 'Barber',              action: 'Cut 8 heads today',          min: 45,  max: 130 },
  { job: 'Chef',                action: 'Cooked for a big event',     min: 65,  max: 210 },
  { job: 'Mechanic',            action: 'Fixed 3 cars today',         min: 70,  max: 230 },
  { job: 'Photographer',        action: 'Shot a wedding event',       min: 100, max: 350 },
]

// Crime scenarios
const CRIME_SCENARIOS = [
  { crime: 'Phone Scam',          caught: 'The victim traced the call',       min: 150, max: 500, fine: 100 },
  { crime: 'Market Overpricing',  caught: 'Consumer protection showed up',    min: 100, max: 350, fine: 80  },
  { crime: 'Fuel Hoarding',       caught: 'NNPC officials raided your store', min: 200, max: 600, fine: 150 },
  { crime: 'Fake Products',       caught: 'Customer reported you to NAFDAC',  min: 120, max: 400, fine: 90  },
  { crime: 'Betting Manipulation',caught: 'Betway noticed your pattern',      min: 180, max: 550, fine: 120 },
  { crime: 'Overloading a Bus',   caught: 'VIO officers pulled you over',     min: 80,  max: 280, fine: 70  },
  { crime: 'Touting',             caught: 'Area boys turned on you',          min: 60,  max: 200, fine: 50  },
  { crime: 'Counterfeit Cash',    caught: 'Bank teller spotted the fakes',    min: 300, max: 800, fine: 200 },
]

export default [

  // ── .work ─────────────────────────────────────────────
  {
    command:  'work',
    aliases:  ['hustle', 'grind'],
    category: 'economy',
    description: 'Work a job and earn FireCoins (1 hour cooldown)',
    usage:    '.work',
    example:  '.work',

    handler: async (sock, msg, args, ctx) => {
      try {
        const res       = await getEco(ctx.sender)
        const eco       = res?.data || {}
        const lastWork  = eco.last_work || 0
        const nextWork  = lastWork + WORK_COOLDOWN
        const now       = Date.now()

        if (lastWork && now < nextWork) {
          return sock.sendMessage(ctx.from, {
            text: [
              `⏳ *Still Working...*`,
              ``,
              `You need to rest before working again.`,
              `Come back in *${formatTimeLeft(nextWork)}*.`,
              `💰 Balance: *${eco.balance ?? 0} ${FC}*`
            ].join('\n')
          }, { quoted: msg })
        }

        const scenario = pick(WORK_SCENARIOS)
        const earned   = Math.floor(Math.random() * (scenario.max - scenario.min + 1)) + scenario.min
        const bonus    = ctx.isPremium ? Math.floor(earned * 0.25) : 0
        const total    = earned + bonus
        const newBal   = (eco.balance ?? 0) + total

        await setEco(ctx.sender, 'balance',   newBal)
        await setEco(ctx.sender, 'last_work', now)

        await sock.sendMessage(ctx.from, {
          text: [
            `💼 *Work Complete*`,
            ``,
            `👷 *Job:* ${scenario.job}`,
            `✅ *Task:* ${scenario.action}`,
            ``,
            `💵 Earned:  *+${earned} ${FC}*`,
            bonus ? `⭐ Premium: *+${bonus} ${FC}*` : '',
            ``,
            `🏦 *Balance:* ${newBal} ${FC}`,
            `_Next work shift available in 1 hour_`
          ].filter(Boolean).join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .crime ────────────────────────────────────────────
  {
    command:  'crime',
    aliases:  ['rob', 'steal'],
    category: 'economy',
    description: 'Do something illegal for big rewards — but risk getting caught (2hr cooldown)',
    usage:    '.crime',
    example:  '.crime',

    handler: async (sock, msg, args, ctx) => {
      try {
        const res        = await getEco(ctx.sender)
        const eco        = res?.data || {}
        const lastCrime  = eco.last_crime || 0
        const nextCrime  = lastCrime + CRIME_COOLDOWN
        const now        = Date.now()

        if (lastCrime && now < nextCrime) {
          return sock.sendMessage(ctx.from, {
            text: [
              `⏳ *Laying Low...*`,
              ``,
              `The heat is still on. Stay off the radar.`,
              `Come back in *${formatTimeLeft(nextCrime)}*.`,
              `💰 Balance: *${eco.balance ?? 0} ${FC}*`
            ].join('\n')
          }, { quoted: msg })
        }

        const scenario = pick(CRIME_SCENARIOS)
        const caught   = Math.random() < 0.35  // 35% chance of getting caught
        const now2     = Date.now()

        await setEco(ctx.sender, 'last_crime', now2)

        if (caught) {
          // Got caught — pay a fine
          const fine      = scenario.fine + Math.floor(Math.random() * 50)
          const newBal    = Math.max(0, (eco.balance ?? 0) - fine)
          await setEco(ctx.sender, 'balance', newBal)

          await sock.sendMessage(ctx.from, {
            text: [
              `🚨 *Caught Red-Handed!*`,
              ``,
              `🦹 *Crime:* ${scenario.crime}`,
              `👮 *${scenario.caught}*`,
              ``,
              `💸 Fine paid:  *-${fine} ${FC}*`,
              `🏦 *Balance:* ${newBal} ${FC}`,
              ``,
              `_Lay low for 2 hours before trying again_`
            ].join('\n')
          }, { quoted: msg })

        } else {
          // Got away with it
          const earned  = Math.floor(Math.random() * (scenario.max - scenario.min + 1)) + scenario.min
          const newBal  = (eco.balance ?? 0) + earned
          await setEco(ctx.sender, 'balance', newBal)

          await sock.sendMessage(ctx.from, {
            text: [
              `🦹 *Crime Successful!*`,
              ``,
              `🎭 *Crime:* ${scenario.crime}`,
              `✅ You got away clean!`,
              ``,
              `💰 Earned:  *+${earned} ${FC}*`,
              `🏦 *Balance:* ${newBal} ${FC}`,
              ``,
              `_Don't push your luck — wait 2 hours_`
            ].join('\n')
          }, { quoted: msg })
        }

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
