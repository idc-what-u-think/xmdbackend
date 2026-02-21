const FC = '🔥'
const MIN = 10
const MAX = 10000
const SYMS   = ['🍋','🍊','🍇','🍒','💎','🔥','7️⃣']
const MULT   = { '🍋':2,'🍊':2.5,'🍇':3,'🍒':4,'💎':6,'🔥':8,'7️⃣':10 }
const WEIGHT = [30,25,20,15,5,3,2]

const spin = () => {
  let r = Math.random() * 100, c = 0
  for (let i = 0; i < SYMS.length; i++) { c += WEIGHT[i]; if (r < c) return SYMS[i] }
  return SYMS[0]
}

const parseBet = (s, bal) => {
  if (!s) return null
  const l = s.toLowerCase()
  if (l === 'all' || l === 'allin') return bal
  if (l === 'half') return Math.floor(bal / 2)
  const n = parseInt(l.replace(/,/g,''), 10)
  return isNaN(n) ? null : n
}

const checkBet = (bet, bal, sock, ctx, msg) => {
  if (!bet || bet < 1) return sock.sendMessage(ctx.from, { text: '❌ Invalid amount.' }, { quoted: msg })
  if (bet < MIN) return sock.sendMessage(ctx.from, { text: `❌ Min bet is *${MIN} ${FC}*` }, { quoted: msg })
  if (bet > MAX) return sock.sendMessage(ctx.from, { text: `❌ Max bet is *${MAX} ${FC}*` }, { quoted: msg })
  if (bet > bal) return sock.sendMessage(ctx.from, { text: `❌ Not enough. Balance: *${bal} ${FC}*` }, { quoted: msg })
  return null
}

export default [
  {
    command: 'gamble',
    aliases: ['bet', 'casino'],
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) return sock.sendMessage(ctx.from, { text: `🎰 *Usage:* ${ctx.prefix}gamble <amount|all|half>\n_Min: ${MIN} ${FC} | Max: ${MAX} ${FC}_` }, { quoted: msg })
      const res = await api.getEco(ctx.sender)
      const eco = res.eco || {}
      const bal = eco.balance ?? 0
      const bet = parseBet(ctx.query, bal)
      const err = checkBet(bet, bal, sock, ctx, msg)
      if (err) return err
      const won    = Math.random() < 0.45
      const newBal = Math.max(0, won ? bal + bet : bal - bet)
      await api.setEco(ctx.sender, 'balance', newBal)
      await sock.sendMessage(ctx.from, {
        text: won
          ? `🎉 *YOU WON!*\n\n+${bet} ${FC}\n🏦 Balance: *${newBal} ${FC}*`
          : `💀 *YOU LOST!*\n\n-${bet} ${FC}\n🏦 Balance: *${newBal} ${FC}*`
      }, { quoted: msg })
    }
  },
  {
    command: 'slots',
    aliases: ['slot', 'slotmachine'],
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) return sock.sendMessage(ctx.from, {
        text: [`🎰 *Slot Machine*`, ``, `Match 3 to win!`, `🍋🍊🍇 = 2–3x | 🍒=4x | 💎=6x | 🔥=8x | 7️⃣=10x`, ``, `*Usage:* ${ctx.prefix}slots <amount|all|half>`, `_Min: ${MIN} ${FC} | Max: ${MAX} ${FC}_`].join('\n')
      }, { quoted: msg })
      const res = await api.getEco(ctx.sender)
      const eco = res.eco || {}
      const bal = eco.balance ?? 0
      const bet = parseBet(ctx.query, bal)
      const err = checkBet(bet, bal, sock, ctx, msg)
      if (err) return err
      const r1 = spin(), r2 = spin(), r3 = spin()
      const win  = r1 === r2 && r2 === r3
      const pair = !win && (r1 === r2 || r2 === r3 || r1 === r3)
      let newBal, txt
      if (win) {
        const w = Math.floor(bet * MULT[r1])
        newBal = bal - bet + w
        txt = [`🎊 *JACKPOT!*`, ``, `│ ${r1} ${r2} ${r3} │`, ``, `${MULT[r1]}x → +${w} ${FC}`, `🏦 Balance: *${newBal} ${FC}*`].join('\n')
      } else if (pair) {
        const back = Math.floor(bet * 0.5)
        newBal = bal - bet + back
        txt = [`😅 *Pair — Half Back!*`, ``, `│ ${r1} ${r2} ${r3} │`, ``, `Returned: +${back} ${FC}`, `🏦 Balance: *${newBal} ${FC}*`].join('\n')
      } else {
        newBal = bal - bet
        txt = [`💀 *No Match!*`, ``, `│ ${r1} ${r2} ${r3} │`, ``, `-${bet} ${FC}`, `🏦 Balance: *${Math.max(0, newBal)} ${FC}*`].join('\n')
      }
      await api.setEco(ctx.sender, 'balance', Math.max(0, newBal))
      await sock.sendMessage(ctx.from, { text: txt }, { quoted: msg })
    }
  }
]
