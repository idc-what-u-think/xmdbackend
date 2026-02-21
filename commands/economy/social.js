// commands/economy/social.js
// Commands: .give | .rob | .invest | .leaderboard | .rank

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

const FC             = '🔥'
const ROB_COOLDOWN   = 4 * 60 * 60 * 1000   // 4 hours
const INVEST_LOCK    = 6 * 60 * 60 * 1000   // 6 hours
const ROB_PENALTY    = 150                   // FC lost if caught

const formatTimeLeft = (futureMs) => {
  const diff = Math.max(0, futureMs - Date.now())
  const hrs  = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  const secs = Math.floor((diff % 60_000) / 1_000)
  if (hrs > 0)  return `${hrs}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

export default [

  // ── .give ─────────────────────────────────────────────
  {
    command:  'give',
    aliases:  ['transfer', 'send', 'pay'],
    category: 'economy',
    description: 'Transfer FireCoins to another user',
    usage:    '.give @user <amount>',
    example:  '.give @2348012345678 500',

    handler: async (sock, msg, args, ctx) => {
      const targetJid = ctx.mentionedJids[0] || null

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag someone to give coins to.\n📌 *Usage:* ${ctx.prefix}give @user <amount>`
        }, { quoted: msg })
      }

      if (targetJid === ctx.sender) {
        return sock.sendMessage(ctx.from, {
          text: '❌ You cannot give coins to yourself.'
        }, { quoted: msg })
      }

      // Amount is the number in args that isn't a @mention
      const amtStr = ctx.args.find(a => !a.startsWith('@') && !isNaN(parseInt(a, 10)))
      const amount  = parseInt(amtStr, 10)

      if (!amount || amount < 1) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a valid amount.\n📌 *Usage:* ${ctx.prefix}give @user <amount>`
        }, { quoted: msg })
      }

      try {
        const [senderRes, targetRes] = await Promise.all([
          getEco(ctx.sender),
          getEco(targetJid),
        ])

        const senderBal = senderRes?.data?.balance ?? 0
        const targetBal = targetRes?.data?.balance ?? 0

        if (amount > senderBal) {
          return sock.sendMessage(ctx.from, {
            text: `❌ You don't have enough.\n💰 Balance: *${senderBal} ${FC}* | Sending: *${amount} ${FC}*`
          }, { quoted: msg })
        }

        await Promise.all([
          setEco(ctx.sender, 'balance', senderBal - amount),
          setEco(targetJid, 'balance', targetBal + amount),
        ])

        const targetNum = targetJid.split('@')[0]

        await sock.sendMessage(ctx.from, {
          text: [
            `💸 *Transfer Successful!*`,
            ``,
            `📤 Sent to:   @${targetNum}`,
            `💰 Amount:    *${amount} ${FC}*`,
            ``,
            `Your new balance:  *${senderBal - amount} ${FC}*`
          ].join('\n'),
          mentions: [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .rob ──────────────────────────────────────────────
  {
    command:  'rob',
    aliases:  ['steal', 'heist'],
    category: 'economy',
    description: 'Attempt to steal from another user (4hr cooldown, 40% success rate)',
    usage:    '.rob @user',
    example:  '.rob @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender || null

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag someone to rob.\n📌 *Usage:* ${ctx.prefix}rob @user`
        }, { quoted: msg })
      }

      if (targetJid === ctx.sender) {
        return sock.sendMessage(ctx.from, {
          text: '❌ You cannot rob yourself 😅'
        }, { quoted: msg })
      }

      try {
        const [myRes, targetRes] = await Promise.all([
          getEco(ctx.sender),
          getEco(targetJid),
        ])

        const myEco     = myRes?.data    || {}
        const targetEco = targetRes?.data || {}
        const myBal     = myEco.balance     ?? 0
        const targetBal = targetEco.balance ?? 0
        const lastRob   = myEco.last_rob    ?? 0
        const nextRob   = lastRob + ROB_COOLDOWN
        const now       = Date.now()

        if (lastRob && now < nextRob) {
          return sock.sendMessage(ctx.from, {
            text: `⏳ You need to lay low for *${formatTimeLeft(nextRob)}* before robbing again.`
          }, { quoted: msg })
        }

        // Target needs at least 50 FC to be worth robbing
        if (targetBal < 50) {
          return sock.sendMessage(ctx.from, {
            text: `😂 @${targetJid.split('@')[0]} is broke! Not worth the risk.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        await setEco(ctx.sender, 'last_rob', now)

        const success    = Math.random() < 0.40   // 40% success
        const targetNum  = targetJid.split('@')[0]

        if (success) {
          // Steal 10–30% of target's balance
          const stealPct = (Math.random() * 0.20) + 0.10
          const stolen   = Math.max(10, Math.floor(targetBal * stealPct))

          await Promise.all([
            setEco(ctx.sender, 'balance', myBal + stolen),
            setEco(targetJid, 'balance', targetBal - stolen),
          ])

          await sock.sendMessage(ctx.from, {
            text: [
              `🦹 *Robbery Successful!*`,
              ``,
              `😱 You robbed @${targetNum}`,
              `💰 Stole:  *${stolen} ${FC}*`,
              `🏦 Your balance:  *${myBal + stolen} ${FC}*`,
              ``,
              `_They didn't even see it coming!_`
            ].join('\n'),
            mentions: [targetJid]
          }, { quoted: msg })

        } else {
          // Got caught — pay penalty
          const fine   = Math.min(ROB_PENALTY, myBal)
          const newBal = Math.max(0, myBal - fine)
          await setEco(ctx.sender, 'balance', newBal)

          await sock.sendMessage(ctx.from, {
            text: [
              `🚨 *Caught in the Act!*`,
              ``,
              `😤 @${targetNum} caught you trying to steal!`,
              `💸 Penalty:  *-${fine} ${FC}*`,
              `🏦 Balance:  *${newBal} ${FC}*`,
              ``,
              `_Never pull up on someone stronger!_`
            ].join('\n'),
            mentions: [targetJid]
          }, { quoted: msg })
        }

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .invest ───────────────────────────────────────────
  {
    command:  'invest',
    aliases:  ['investment'],
    category: 'economy',
    description: 'Lock coins into the market for 6 hours — earn 10–50% return (or lose 10–30%)',
    usage:    '.invest <amount|all|half>',
    example:  '.invest 1000',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📈 *Investment Market*`,
            ``,
            `Lock your coins for *6 hours*.`,
            `• 60% chance: earn *10–50%* return`,
            `• 40% chance: lose *10–30%*`,
            ``,
            `*Usage:* ${ctx.prefix}invest <amount|all|half>`,
            `Use ${ctx.prefix}invest check — to see current investment`
          ].join('\n')
        }, { quoted: msg })
      }

      // Special: check current investment
      if (ctx.query.toLowerCase() === 'check') {
        try {
          const res       = await getEco(ctx.sender)
          const eco       = res?.data || {}
          const invested  = eco.invest_amount ?? 0
          const investAt  = eco.last_invest   ?? 0

          if (!invested || !investAt) {
            return sock.sendMessage(ctx.from, {
              text: `📊 You have no active investment.\n\nUse ${ctx.prefix}invest <amount> to invest.`
            }, { quoted: msg })
          }

          const matureAt  = investAt + INVEST_LOCK
          const now       = Date.now()

          if (now >= matureAt) {
            return sock.sendMessage(ctx.from, {
              text: [
                `✅ *Investment Matured!*`,
                ``,
                `💼 Amount: *${invested} ${FC}*`,
                ``,
                `Use ${ctx.prefix}invest collect to claim your returns!`
              ].join('\n')
            }, { quoted: msg })
          } else {
            return sock.sendMessage(ctx.from, {
              text: [
                `📊 *Active Investment*`,
                ``,
                `💼 Amount:  *${invested} ${FC}*`,
                `⏳ Matures: *${formatTimeLeft(matureAt)}*`,
              ].join('\n')
            }, { quoted: msg })
          }
        } catch (err) {
          return sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
        }
      }

      // Collect returns
      if (ctx.query.toLowerCase() === 'collect') {
        try {
          const res       = await getEco(ctx.sender)
          const eco       = res?.data || {}
          const invested  = eco.invest_amount ?? 0
          const investAt  = eco.last_invest   ?? 0
          const bal       = eco.balance       ?? 0

          if (!invested || !investAt) {
            return sock.sendMessage(ctx.from, {
              text: `❌ No active investment to collect.`
            }, { quoted: msg })
          }

          const matureAt = investAt + INVEST_LOCK
          if (Date.now() < matureAt) {
            return sock.sendMessage(ctx.from, {
              text: `⏳ Investment not ready yet. Matures in *${formatTimeLeft(matureAt)}*.`
            }, { quoted: msg })
          }

          // Resolve returns
          const success  = Math.random() < 0.60
          let   returnPct, returnAmt, newBal

          if (success) {
            returnPct = (Math.random() * 0.40) + 0.10
            returnAmt = Math.floor(invested * returnPct)
            newBal    = bal + invested + returnAmt
          } else {
            returnPct = (Math.random() * 0.20) + 0.10
            returnAmt = Math.floor(invested * returnPct)
            newBal    = bal + invested - returnAmt
          }

          await setEco(ctx.sender, 'balance',       Math.max(0, newBal))
          await setEco(ctx.sender, 'invest_amount', 0)
          await setEco(ctx.sender, 'last_invest',   0)

          if (success) {
            await sock.sendMessage(ctx.from, {
              text: [
                `📈 *Investment Paid Off!*`,
                ``,
                `💼 Invested:  *${invested} ${FC}*`,
                `💰 Return:    *+${returnAmt} ${FC}* (${Math.round(returnPct * 100)}%)`,
                `🏦 Balance:   *${newBal} ${FC}*`
              ].join('\n')
            }, { quoted: msg })
          } else {
            await sock.sendMessage(ctx.from, {
              text: [
                `📉 *Market Crashed!*`,
                ``,
                `💼 Invested:  *${invested} ${FC}*`,
                `💸 Loss:      *-${returnAmt} ${FC}* (-${Math.round(returnPct * 100)}%)`,
                `🏦 Balance:   *${Math.max(0, newBal)} ${FC}*`
              ].join('\n')
            }, { quoted: msg })
          }
          return
        } catch (err) {
          return sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
        }
      }

      // New investment
      try {
        const res   = await getEco(ctx.sender)
        const eco   = res?.data || {}
        const bal   = eco.balance ?? 0

        // Don't allow stacking investments
        if (eco.invest_amount && eco.invest_amount > 0) {
          const matureAt = (eco.last_invest ?? 0) + INVEST_LOCK
          return sock.sendMessage(ctx.from, {
            text: [
              `❌ You already have an active investment.`,
              ``,
              `Use ${ctx.prefix}invest check — to check status`,
              `Use ${ctx.prefix}invest collect — to collect when ready`
            ].join('\n')
          }, { quoted: msg })
        }

        const input  = ctx.query.toLowerCase().trim()
        let   amount
        if (input === 'all')    amount = bal
        else if (input === 'half') amount = Math.floor(bal / 2)
        else { amount = parseInt(input.replace(/,/g, ''), 10) }

        if (!amount || isNaN(amount) || amount < 50) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Minimum investment is *50 ${FC}*.`
          }, { quoted: msg })
        }

        if (amount > bal) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Not enough coins. Balance: *${bal} ${FC}*`
          }, { quoted: msg })
        }

        const now    = Date.now()
        const newBal = bal - amount

        await setEco(ctx.sender, 'balance',       newBal)
        await setEco(ctx.sender, 'invest_amount', amount)
        await setEco(ctx.sender, 'last_invest',   now)

        await sock.sendMessage(ctx.from, {
          text: [
            `💼 *Investment Placed!*`,
            ``,
            `💰 Amount:  *${amount} ${FC}*`,
            `⏳ Matures: *in 6 hours*`,
            `📊 Balance: *${newBal} ${FC}*`,
            ``,
            `Use ${ctx.prefix}invest collect in 6 hours to claim returns.`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .leaderboard ──────────────────────────────────────
  {
    command:  'leaderboard',
    aliases:  ['richlist', 'top', 'lb'],
    category: 'economy',
    description: 'Show the top 10 richest users',
    usage:    '.leaderboard',
    example:  '.leaderboard',

    handler: async (sock, msg, args, ctx) => {
      try {
        const res  = await w(`/bot/eco/leaderboard?limit=10`)
        const list = res?.data || res?.leaderboard || []

        if (!Array.isArray(list) || !list.length) {
          return sock.sendMessage(ctx.from, {
            text: '😔 No leaderboard data yet. Start earning with .daily, .work, and .gamble!'
          }, { quoted: msg })
        }

        const medals = ['🥇', '🥈', '🥉']

        const lines = list.map((entry, i) => {
          const medal  = medals[i] || `${i + 1}.`
          const num    = (entry.jid || '').split('@')[0]
          const name   = entry.name || `+${num}`
          const bal    = entry.balance ?? 0
          return `${medal} *${name}*  —  ${bal} ${FC}`
        })

        await sock.sendMessage(ctx.from, {
          text: [
            `🏆 *FireCoins Leaderboard*`,
            `${'─'.repeat(28)}`,
            ``,
            ...lines,
            ``,
            `${'─'.repeat(28)}`,
            `_Earn with .daily .work .crime .gamble_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to fetch leaderboard: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .rank ─────────────────────────────────────────────
  {
    command:  'rank',
    aliases:  ['level', 'myrank'],
    category: 'economy',
    description: 'See your rank and level on the leaderboard',
    usage:    '.rank',
    example:  '.rank',

    handler: async (sock, msg, args, ctx) => {
      try {
        const [ecoRes, rankRes] = await Promise.all([
          getEco(ctx.sender),
          w(`/bot/eco/rank?jid=${encodeURIComponent(ctx.sender)}`),
        ])

        const eco     = ecoRes?.data  || {}
        const rank    = rankRes?.rank  ?? null
        const total   = rankRes?.total ?? null
        const bal     = eco.balance   ?? 0

        // Determine title based on balance
        let title
        if (bal >= 100_000)     title = '👑 FireKing'
        else if (bal >= 50_000) title = '💎 Diamond'
        else if (bal >= 20_000) title = '🥇 Gold'
        else if (bal >= 5_000)  title = '🥈 Silver'
        else if (bal >= 1_000)  title = '🥉 Bronze'
        else                    title = '🪨 Newbie'

        const rankLine = rank
          ? `🏆 Rank:     *#${rank}${total ? ` of ${total}` : ''}*`
          : ''

        await sock.sendMessage(ctx.from, {
          text: [
            `📊 *Your Economy Profile*`,
            `${'─'.repeat(28)}`,
            ``,
            `👤 User:    @${ctx.senderNumber}`,
            `🎖️ Title:   *${title}*`,
            rankLine,
            `💰 Balance: *${bal} ${FC}*`,
            `🔥 Streak:  *${eco.streak ?? 0} day(s)*`,
          ].filter(Boolean).join('\n'),
          mentions: [ctx.sender]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
