// commands/economy/gamble.js
// Commands: .gamble | .slots

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

const FC        = '🔥'
const MIN_BET   = 10
const MAX_BET   = 10_000

// Slots symbols and their weights (higher index = rarer)
const SLOTS_SYMBOLS = ['🍋', '🍊', '🍇', '🍒', '💎', '🔥', '7️⃣']
const SLOTS_MULT    = {
  '🍋': 2,
  '🍊': 2.5,
  '🍇': 3,
  '🍒': 4,
  '💎': 6,
  '🔥': 8,
  '7️⃣': 10,
}

// Weighted random spin — rarer symbols appear less
const spinReel = () => {
  const weights = [30, 25, 20, 15, 5, 3, 2]  // total = 100
  const rand    = Math.random() * 100
  let   cum     = 0
  for (let i = 0; i < SLOTS_SYMBOLS.length; i++) {
    cum += weights[i]
    if (rand < cum) return SLOTS_SYMBOLS[i]
  }
  return SLOTS_SYMBOLS[0]
}

const parseBet = (input, balance) => {
  if (!input) return null
  const s = input.toLowerCase().trim()
  if (s === 'all' || s === 'allin')  return balance
  if (s === 'half')                  return Math.floor(balance / 2)
  const n = parseInt(s.replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}

export default [

  // ── .gamble ───────────────────────────────────────────
  {
    command:  'gamble',
    aliases:  ['bet', 'casino'],
    category: 'economy',
    description: 'Bet your FireCoins — win 2x or lose it all (45% win rate)',
    usage:    '.gamble <amount|all|half>',
    example:  '.gamble 500',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🎰 *Gamble Usage*`,
            ``,
            `${ctx.prefix}gamble <amount>  — bet a specific amount`,
            `${ctx.prefix}gamble all       — bet everything`,
            `${ctx.prefix}gamble half      — bet half your balance`,
            ``,
            `_Min bet: ${MIN_BET} ${FC} | Max bet: ${MAX_BET} ${FC}_`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        const res = await getEco(ctx.sender)
        const eco = res?.data || {}
        const bal = eco.balance ?? 0

        if (bal < MIN_BET) {
          return sock.sendMessage(ctx.from, {
            text: `❌ You need at least *${MIN_BET} ${FC}* to gamble.\n💰 Your balance: *${bal} ${FC}*`
          }, { quoted: msg })
        }

        const bet = parseBet(ctx.query, bal)

        if (!bet || bet < 1) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Invalid bet amount. Use a number, "all", or "half".`
          }, { quoted: msg })
        }

        if (bet < MIN_BET) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Minimum bet is *${MIN_BET} ${FC}*.`
          }, { quoted: msg })
        }

        if (bet > MAX_BET) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Maximum bet is *${MAX_BET} ${FC}*.`
          }, { quoted: msg })
        }

        if (bet > bal) {
          return sock.sendMessage(ctx.from, {
            text: `❌ You don't have enough coins.\n💰 Balance: *${bal} ${FC}* | Bet: *${bet} ${FC}*`
          }, { quoted: msg })
        }

        // 45% win rate — house edge
        const won    = Math.random() < 0.45
        const newBal = won ? bal + bet : bal - bet

        await setEco(ctx.sender, 'balance', Math.max(0, newBal))

        if (won) {
          await sock.sendMessage(ctx.from, {
            text: [
              `🎉 *YOU WON!*`,
              ``,
              `🎰 Bet:      *${bet} ${FC}*`,
              `💵 Won:      *+${bet} ${FC}*`,
              `🏦 Balance:  *${newBal} ${FC}*`,
              ``,
              `_Feeling lucky? Try again!_`
            ].join('\n')
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, {
            text: [
              `💀 *YOU LOST!*`,
              ``,
              `🎰 Bet:      *${bet} ${FC}*`,
              `💸 Lost:     *-${bet} ${FC}*`,
              `🏦 Balance:  *${Math.max(0, newBal)} ${FC}*`,
              ``,
              `_Better luck next time!_`
            ].join('\n')
          }, { quoted: msg })
        }

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .slots ────────────────────────────────────────────
  {
    command:  'slots',
    aliases:  ['slotmachine', 'slot'],
    category: 'economy',
    description: 'Spin the slot machine — match 3 symbols to win big!',
    usage:    '.slots <amount|all|half>',
    example:  '.slots 200',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🎰 *Slot Machine*`,
            ``,
            `Match 3 symbols to win!`,
            ``,
            `🍋🍊🍇 = 2x–3x`,
            `🍒 = 4x | 💎 = 6x | 🔥 = 8x | 7️⃣ = 10x`,
            ``,
            `*Usage:* ${ctx.prefix}slots <amount|all|half>`,
            `_Min: ${MIN_BET} ${FC} | Max: ${MAX_BET} ${FC}_`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        const res = await getEco(ctx.sender)
        const eco = res?.data || {}
        const bal = eco.balance ?? 0

        if (bal < MIN_BET) {
          return sock.sendMessage(ctx.from, {
            text: `❌ You need at least *${MIN_BET} ${FC}* to spin.\n💰 Your balance: *${bal} ${FC}*`
          }, { quoted: msg })
        }

        const bet = parseBet(ctx.query, bal)

        if (!bet || bet < 1)    return sock.sendMessage(ctx.from, { text: `❌ Invalid amount.` }, { quoted: msg })
        if (bet < MIN_BET)      return sock.sendMessage(ctx.from, { text: `❌ Min bet is *${MIN_BET} ${FC}*.` }, { quoted: msg })
        if (bet > MAX_BET)      return sock.sendMessage(ctx.from, { text: `❌ Max bet is *${MAX_BET} ${FC}*.` }, { quoted: msg })
        if (bet > bal)          return sock.sendMessage(ctx.from, { text: `❌ Not enough coins. Balance: *${bal} ${FC}*` }, { quoted: msg })

        // Spin 3 reels
        const r1 = spinReel()
        const r2 = spinReel()
        const r3 = spinReel()

        const isWin   = r1 === r2 && r2 === r3
        const isPair  = !isWin && (r1 === r2 || r2 === r3 || r1 === r3)
        const mult    = isWin ? SLOTS_MULT[r1] : isPair ? 0.5 : 0

        let newBal
        let resultText

        if (isWin) {
          const winnings = Math.floor(bet * mult)
          newBal     = bal - bet + winnings
          resultText = [
            `🎊 *JACKPOT! ALL THREE MATCH!*`,
            ``,
            `┌─────────────────┐`,
            `│  ${r1}  ${r2}  ${r3}  │`,
            `└─────────────────┘`,
            ``,
            `🎯 Multiplier:  *${mult}x*`,
            `💵 Won:         *+${winnings} ${FC}*`,
            `🏦 Balance:     *${newBal} ${FC}*`
          ].join('\n')
        } else if (isPair) {
          const halfBack = Math.floor(bet * 0.5)
          newBal     = bal - bet + halfBack
          resultText = [
            `😅 *Two of a Kind — Half Back!*`,
            ``,
            `┌─────────────────┐`,
            `│  ${r1}  ${r2}  ${r3}  │`,
            `└─────────────────┘`,
            ``,
            `💵 Returned:  *+${halfBack} ${FC}*`,
            `🏦 Balance:   *${newBal} ${FC}*`
          ].join('\n')
        } else {
          newBal     = bal - bet
          resultText = [
            `💀 *No Match — You Lost!*`,
            ``,
            `┌─────────────────┐`,
            `│  ${r1}  ${r2}  ${r3}  │`,
            `└─────────────────┘`,
            ``,
            `💸 Lost:      *-${bet} ${FC}*`,
            `🏦 Balance:   *${Math.max(0, newBal)} ${FC}*`
          ].join('\n')
        }

        await setEco(ctx.sender, 'balance', Math.max(0, newBal))

        await sock.sendMessage(ctx.from, {
          text: resultText
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
