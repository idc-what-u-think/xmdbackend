const FC = '🔥'

export default [

  {
    command: 'transfer',
    aliases: ['give', 'send', 'pay'],
    category: 'economy',
    description: 'Transfer FireCoins to another user',
    usage: '.transfer @user <amount>',
    example: '.transfer @2348012345678 500',

    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0]
      const amount = parseInt(ctx.args.find(a => !a.startsWith('@') && !isNaN(a)))

      if (!target || isNaN(amount) || amount < 1) {
        return sock.sendMessage(ctx.from, {
          text: `💸 *Transfer*\n\nUsage: ${ctx.prefix}transfer @user <amount>`
        }, { quoted: msg })
      }

      if (target === ctx.sender) {
        return sock.sendMessage(ctx.from, { text: `❌ Cannot transfer to yourself.` }, { quoted: msg })
      }

      const res = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco = res?.eco || {}

      if ((eco.balance ?? 0) < amount) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Not enough coins! Balance: *${eco.balance ?? 0} ${FC}*`
        }, { quoted: msg })
      }

      const targetRes = await api.getEco(target)
      const targetEco = targetRes?.eco || {}

      await Promise.all([
        api.setEco(ctx.senderStorageJid || ctx.sender, 'balance', (eco.balance ?? 0) - amount),
        api.setEco(target, 'balance', (targetEco.balance ?? 0) + amount),
      ])

      await sock.sendMessage(ctx.from, {
        text: [
          `💸 *Transfer Complete*`,
          ``,
          `✅ Sent *${amount} ${FC}* to @${target.split('@')[0]}`,
          ``,
          `💰 Your new balance: *${(eco.balance ?? 0) - amount} ${FC}*`
        ].join('\n'),
        mentions: [target]
      }, { quoted: msg })
    }
  },

  {
    command: 'gift',
    aliases: ['gifted'],
    category: 'economy',
    description: 'Gift a random amount of coins to someone',
    usage: '.gift @user',
    example: '.gift @2348012345678',

    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender
      if (!target) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user.\n📌 *Usage:* ${ctx.prefix}gift @user`
        }, { quoted: msg })
      }

      if (target === ctx.sender) {
        return sock.sendMessage(ctx.from, { text: `❌ Cannot gift yourself.` }, { quoted: msg })
      }

      const res = await api.getEco(ctx.senderStorageJid || ctx.sender)
      const eco = res?.eco || {}
      const max = Math.min(200, Math.floor((eco.balance ?? 0) * 0.1))

      if (max < 10) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Not enough coins to gift. Earn more with ${ctx.prefix}work or ${ctx.prefix}daily`
        }, { quoted: msg })
      }

      const gift      = Math.floor(Math.random() * max) + 10
      const targetRes = await api.getEco(target)
      const targetEco = targetRes?.eco || {}

      await Promise.all([
        api.setEco(ctx.senderStorageJid || ctx.sender, 'balance', (eco.balance ?? 0) - gift),
        api.setEco(target, 'balance', (targetEco.balance ?? 0) + gift),
      ])

      await sock.sendMessage(ctx.from, {
        text: `🎁 @${ctx.senderNumber} gifted *${gift} ${FC}* to @${target.split('@')[0]}! 🎉`,
        mentions: [ctx.sender, target]
      }, { quoted: msg })
    }
  },

]
