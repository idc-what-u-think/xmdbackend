const FC  = '🔥'
const now = () => Math.floor(Date.now() / 1000)

export default [

  {
    command: 'gamble',
    aliases: ['bet', 'slots'],
    category: 'economy',
    description: 'Gamble your FireCoins on the slots',
    usage: '.gamble <amount>',
    example: '.gamble 100',

    handler: async (sock, msg, ctx, { api }) => {
      const amount = parseInt(ctx.query)
      if (isNaN(amount) || amount < 10) {
        return sock.sendMessage(ctx.from, {
          text: `🎰 *Slots*\n\nUsage: ${ctx.prefix}gamble <amount>\nMinimum bet: *10 ${FC}*`
        }, { quoted: msg })
      }

      const res = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco = res?.eco || {}
      if ((eco.balance ?? 0) < amount) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Not enough coins! Balance: *${eco.balance ?? 0} ${FC}*`
        }, { quoted: msg })
      }

      const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '🔥', '7️⃣']
      const spin    = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      const s1      = spin(), s2 = spin(), s3 = spin()

      let multiplier = 0
      if (s1 === s2 && s2 === s3) {
        multiplier = s1 === '7️⃣' ? 10 : s1 === '💎' ? 5 : 3
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        multiplier = 1.5
      }

      const won    = multiplier > 0
      const payout = won ? Math.floor(amount * multiplier) : 0
      const newBal = won
        ? (eco.balance ?? 0) - amount + payout
        : Math.max(0, (eco.balance ?? 0) - amount)

      await api.setEco(ctx.senderStorageJid || ctx.sender, 'balance', newBal)

      await sock.sendMessage(ctx.from, {
        text: [
          `🎰 *Slots*`,
          ``,
          `┌─────────────┐`,
          `│  ${s1}  ${s2}  ${s3}  │`,
          `└─────────────┘`,
          ``,
          won
            ? `✅ *You won ${payout} ${FC}!* (${multiplier}x)`
            : `❌ *You lost ${amount} ${FC}*`,
          ``,
          `💰 Balance: *${newBal} ${FC}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'flip',
    aliases: ['coinflip', 'cf'],
    category: 'economy',
    description: 'Bet on a coin flip',
    usage: '.flip <heads|tails> <amount>',
    example: '.flip heads 100',

    handler: async (sock, msg, ctx, { api }) => {
      const side   = ctx.args[0]?.toLowerCase()
      const amount = parseInt(ctx.args[1])

      if (!['heads', 'tails'].includes(side) || isNaN(amount) || amount < 10) {
        return sock.sendMessage(ctx.from, {
          text: `🪙 *Coin Flip*\n\nUsage: ${ctx.prefix}flip <heads|tails> <amount>\nMinimum bet: *10 ${FC}*`
        }, { quoted: msg })
      }

      const res = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco = res?.eco || {}
      if ((eco.balance ?? 0) < amount) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Not enough coins! Balance: *${eco.balance ?? 0} ${FC}*`
        }, { quoted: msg })
      }

      const result = Math.random() < 0.5 ? 'heads' : 'tails'
      const won    = side === result
      const newBal = won
        ? (eco.balance ?? 0) + amount
        : Math.max(0, (eco.balance ?? 0) - amount)

      await api.setEco(ctx.senderStorageJid || ctx.sender, 'balance', newBal)

      await sock.sendMessage(ctx.from, {
        text: [
          `🪙 *Coin Flip*`,
          ``,
          `You chose: *${side}*`,
          `Result: *${result}* ${result === 'heads' ? '👑' : '🪙'}`,
          ``,
          won
            ? `✅ *You won +${amount} ${FC}!*`
            : `❌ *You lost -${amount} ${FC}*`,
          ``,
          `💰 Balance: *${newBal} ${FC}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'leaderboard',
    aliases: ['lb', 'richlist', 'top'],
    category: 'economy',
    description: 'View the top richest users',
    usage: '.leaderboard',
    example: '.leaderboard',

    handler: async (sock, msg, ctx, { api }) => {
      const res  = await api.getLeaderboard()
      const list = res?.leaderboard || []

      if (!list.length) {
        return sock.sendMessage(ctx.from, {
          text: `📊 *Leaderboard — Empty*\n\nNo economy data yet.`
        }, { quoted: msg })
      }

      const medals = ['🥇', '🥈', '🥉']
      const lines  = list.slice(0, 10).map((u, i) => {
        const num = u.jid?.split('@')[0] || '?'
        const med = medals[i] || `${i + 1}.`
        return `${med} @${num} — *${u.balance} ${FC}*`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `📊 *Top 10 Richest*`,
          `${'─'.repeat(28)}`,
          ``,
          ...lines,
          ``,
          `_Your balance: ${FC} use ${ctx.prefix}balance_`
        ].join('\n'),
        mentions: list.slice(0, 10).map(u => u.jid).filter(Boolean)
      }, { quoted: msg })
    }
  },

]
