const FC = '🔥'

export default [
  {
    command: 'give',
    aliases: ['transfer', 'send', 'pay'],
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0]
      const amtStr = ctx.args.find(a => !a.startsWith('@') && !isNaN(parseInt(a, 10)))
      const amount = parseInt(amtStr, 10)
      if (!target) return sock.sendMessage(ctx.from, { text: `❌ Tag someone.\n📌 *Usage:* ${ctx.prefix}give @user <amount>` }, { quoted: msg })
      if (target === ctx.sender) return sock.sendMessage(ctx.from, { text: '❌ Cannot give to yourself.' }, { quoted: msg })
      if (!amount || amount < 1) return sock.sendMessage(ctx.from, { text: `❌ Invalid amount.\n📌 *Usage:* ${ctx.prefix}give @user <amount>` }, { quoted: msg })
      const [sRes, tRes] = await Promise.all([api.getEco(ctx.sender), api.getEco(target)])
      const sBal = sRes.eco?.balance ?? 0
      const tBal = tRes.eco?.balance ?? 0
      if (amount > sBal) return sock.sendMessage(ctx.from, { text: `❌ Not enough coins.\n💰 Balance: *${sBal} ${FC}*` }, { quoted: msg })
      await Promise.all([api.setEco(ctx.sender, 'balance', sBal - amount), api.setEco(target, 'balance', tBal + amount)])
      await sock.sendMessage(ctx.from, {
        text: `💸 *Sent ${amount} ${FC} to @${target.split('@')[0]}*\n\nYour balance: *${sBal - amount} ${FC}*`,
        mentions: [target]
      }, { quoted: msg })
    }
  },

  {
    command: 'leaderboard',
    aliases: ['richlist', 'top', 'lb'],
    handler: async (sock, msg, ctx, { api }) => {
      const res  = await api.getLeaderboard()
      const list = res.leaderboard || []
      if (!list.length) return sock.sendMessage(ctx.from, { text: '😔 No data yet. Start earning with .daily, .work, .gamble!' }, { quoted: msg })
      const medals = ['🥇','🥈','🥉']
      const lines = list.slice(0, 10).map((e, i) => `${medals[i] || `${i + 1}.`} *+${e.jid?.split('@')[0]}*  —  ${e.balance} ${FC}`)
      await sock.sendMessage(ctx.from, {
        text: [`🏆 *FireCoins Leaderboard*`, `${'─'.repeat(28)}`, ``, ...lines, ``, `_Earn with .daily .work .crime .gamble_`].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'rank',
    aliases: ['level', 'myrank'],
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.getEco(ctx.sender)
      const eco = res.eco || {}
      const bal = eco.balance ?? 0
      let title
      if (bal >= 100000) title = '👑 FireKing'
      else if (bal >= 50000) title = '💎 Diamond'
      else if (bal >= 20000) title = '🥇 Gold'
      else if (bal >= 5000)  title = '🥈 Silver'
      else if (bal >= 1000)  title = '🥉 Bronze'
      else title = '🪨 Newbie'
      await sock.sendMessage(ctx.from, {
        text: [`📊 *Economy Profile*`, `${'─'.repeat(26)}`, ``, `👤 @${ctx.senderNumber}`, `🎖️ *${title}*`, `💰 Balance: *${bal} ${FC}*`].join('\n'),
        mentions: [ctx.sender]
      }, { quoted: msg })
    }
  },

  {
    // Renamed from 'premium' to 'upgrade' to avoid clash with owner/access.js premium command
    command: 'upgrade',
    aliases: ['vip', 'buypremium', 'getpremium'],
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `💎 *Get Premium*`,
          `${'─'.repeat(28)}`,
          ``,
          `Upgrade your account to unlock:`,
          `• +50% daily reward bonus`,
          `• +25% work bonus`,
          `• Priority support`,
          `• Access to premium-only commands`,
          ``,
          `*Visit the dashboard to buy premium:*`,
          `https://wa-dashboard-7e4.pages.dev`,
          ``,
          `_Login with your WhatsApp number and purchase from your profile._`
        ].join('\n')
      }, { quoted: msg })
    }
  }
]
