// commands/cards/football.js
// .fcard — football card collection commands

const RARITY_EMOJI = { bronze: '🟤', silver: '⚪', gold: '🟡', icon: '👑' }
const RARITY_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', icon: 'Icon' }
const FC = '🔥'

const raritySort = { icon: 0, gold: 1, silver: 2, bronze: 3 }

export default [
  {
    command: 'fcard',
    aliases: ['footballcard', 'fc'],
    category: 'cards',
    description: 'Football card collection commands',
    usage: '.fcard <list|view|dups|top|release|market|buy|packs|spin|spin10|showcase>',

    handler: async (sock, msg, ctx, { api }) => {
      const sub  = ctx.args[0]?.toLowerCase()
      const rest = ctx.args.slice(1).join(' ').trim()
      const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

      // ── .fcard list ───────────────────────────────────────────────────────
      if (!sub || sub === 'list') {
        const res = await api.getCards('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards. Try again.')

        const cards = res.cards || []
        if (!cards.length) return reply(`⚽ *Your Football Cards*\n\nYou have no football cards yet!\n\nUse *.fcard packs* to see available packs.`)

        const grouped = {}
        for (const c of cards) {
          const r = c.rarity || 'bronze'
          if (!grouped[r]) grouped[r] = []
          grouped[r].push(c)
        }

        const lines = []
        for (const rarity of ['icon', 'gold', 'silver', 'bronze']) {
          if (!grouped[rarity]) continue
          lines.push(`\n${RARITY_EMOJI[rarity]} *${RARITY_LABEL[rarity]}* (${grouped[rarity].length})`)
          for (const c of grouped[rarity]) {
            lines.push(`  › ${c.name} — ${c.club}${c.nationality ? ` ${c.nationality}` : ''}${c.quantity > 1 ? ` ×${c.quantity}` : ''}`)
          }
        }

        return reply([
          `⚽ *Your Football Cards* (${cards.length} total)`,
          `${'─'.repeat(30)}`,
          ...lines,
          ``,
          `_Use .fcard view <name> for card details_`,
          `_Use .fcard dups to see duplicates_`,
        ].join('\n'))
      }

      // ── .fcard view <n> ────────────────────────────────────────────────────
      if (sub === 'view') {
        if (!rest) return reply(`Usage: *.fcard view <player name>*\nExample: .fcard view Mbappe`)

        const res = await api.getCards('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards.')

        const card = (res.cards || []).find(c =>
          c.name.toLowerCase().includes(rest.toLowerCase())
        )
        if (!card) return reply(`❌ No football card found matching *"${rest}"*\n\nCheck your collection with *.fcard list*`)

        const lines = [
          `${RARITY_EMOJI[card.rarity]} *${card.name}*`,
          `${'─'.repeat(28)}`,
          `🏟️ Club: ${card.club}`,
          `📍 Position: ${card.position || '—'}`,
          card.nationality ? `🌍 Nation: ${card.nationality}` : '',
          card.rating ? `⭐ Rating: ${card.rating}` : '',
          `🎖️ Tier: ${RARITY_LABEL[card.rarity]}`,
          `🔢 Copies: ${card.quantity}`,
          ``,
          `_Card ID: ${card.user_card_id}_`,
          `_Use .fcard release ${card.name} to sell it_`,
        ].filter(v => v !== '')

        if (card.image_url) {
          return sock.sendMessage(ctx.from, {
            image:   { url: card.image_url },
            caption: lines.join('\n'),
          }, { quoted: msg })
        }
        return reply(lines.join('\n'))
      }

      // ── .fcard dups ───────────────────────────────────────────────────────
      if (sub === 'dups' || sub === 'duplicates') {
        const res = await api.getCards('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards.')

        const dups = (res.cards || []).filter(c => c.quantity > 1)
        if (!dups.length) return reply(`✅ No duplicates! All your football cards are unique.\n\nKeep spinning to collect more!`)

        const lines = dups
          .sort((a, b) => (raritySort[a.rarity] || 3) - (raritySort[b.rarity] || 3))
          .map(c => `${RARITY_EMOJI[c.rarity]} ${c.name} — ×${c.quantity} (${c.club})`)

        return reply([
          `🔄 *Duplicate Football Cards* (${dups.length})`,
          `${'─'.repeat(30)}`,
          ...lines,
          ``,
          `_Use .fcard release <n> to sell a duplicate for coins_`,
        ].join('\n'))
      }

      // ── .fcard top ────────────────────────────────────────────────────────
      if (sub === 'top') {
        const res = await api.getCards('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load leaderboard.')

        const top = (res.leaderboard || []).slice(0, 10)
        if (!top.length) return reply('📊 No leaderboard data yet. Be the first to collect!')

        const medals = ['🥇', '🥈', '🥉']
        const lines  = top.map((u, i) => `${medals[i] || `${i + 1}.`} @${u.username || u.jid?.split('@')[0]} — ${u.total_value} value · ${u.card_count} cards`)

        return sock.sendMessage(ctx.from, {
          text: [`📊 *Top Football Collectors*`, `${'─'.repeat(28)}`, ``, ...lines].join('\n'),
          mentions: top.map(u => u.jid).filter(Boolean),
        }, { quoted: msg })
      }

      // ── .fcard release <n> ─────────────────────────────────────────────
      if (sub === 'release') {
        if (!rest) return reply(`Usage: *.fcard release <player name>*\nExample: .fcard release Haaland`)

        const res = await api.getCards('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards.')

        const card = (res.cards || []).find(c =>
          c.name.toLowerCase().includes(rest.toLowerCase())
        )
        if (!card) return reply(`❌ You don't have a card matching *"${rest}"*`)

        const salePrice  = card.release_price || 0
        const marketPrice = Math.floor(salePrice * 1.1)

        return reply([
          `💰 *Release Card Confirmation*`,
          `${'─'.repeat(28)}`,
          `${RARITY_EMOJI[card.rarity]} *${card.name}* (${card.club})`,
          `Tier: ${RARITY_LABEL[card.rarity]}`,
          ``,
          `You will receive: *${salePrice} ${FC}*`,
          `Marketplace price: *${marketPrice} ${FC}* (+10%)`,
          ``,
          `To confirm, type:`,
          `*.fcard release confirm ${card.user_card_id}*`,
          ``,
          `_This cannot be undone once confirmed_`,
        ].join('\n'))
      }

      if (sub === 'release' && ctx.args[1] === 'confirm') {
        const userCardId = ctx.args[2]
        if (!userCardId) return reply('❌ Missing card ID. Use *.fcard release <n>* first.')

        const res = await api.releaseCard(userCardId).catch(() => null)
        if (!res?.ok) return reply(`❌ Release failed: ${res?.error || 'Unknown error'}`)

        return reply([
          `✅ *Card Released!*`,
          ``,
          `💰 You received *${res.coins_earned} ${FC}*`,
          `🏪 Your card is now listed on the marketplace for *${res.market_price} ${FC}*`,
          ``,
          `_Check marketplace with .fcard market_`,
        ].join('\n'))
      }

      // ── .fcard market ─────────────────────────────────────────────────────
      if (sub === 'market') {
        const res = await api.getMarket('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load marketplace.')

        const listings = res.listings || []
        if (!listings.length) return reply(`🏪 *Football Card Marketplace*\n\nNo cards listed yet.\n\nRelease a duplicate with *.fcard release <n>* to be the first!`)

        const lines = listings.slice(0, 15).map((l, i) =>
          `${i + 1}. ${RARITY_EMOJI[l.rarity]} *${l.card_name}* — ${l.price} ${FC}\n    ${l.club} · Sold by @${l.seller_username || '?'}`
        )

        return reply([
          `🏪 *Football Card Marketplace* (${listings.length} listings)`,
          `${'─'.repeat(30)}`,
          ``,
          ...lines,
          ``,
          `_Buy with .fcard buy <listing number>_`,
        ].join('\n'))
      }

      // ── .fcard buy <number> ───────────────────────────────────────────────
      if (sub === 'buy') {
        const num = parseInt(rest)
        if (isNaN(num) || num < 1) return reply(`Usage: *.fcard buy <listing number>*\nSee listings with *.fcard market*`)

        const marketRes = await api.getMarket('football').catch(() => null)
        if (!marketRes?.ok) return reply('❌ Could not load marketplace.')

        const listing = (marketRes.listings || [])[num - 1]
        if (!listing) return reply(`❌ No listing at position ${num}. Check *.fcard market*`)

        const res = await api.buyCard(listing.listing_id).catch(() => null)
        if (!res?.ok) return reply(`❌ Purchase failed: ${res?.error || 'Not enough coins or card already sold'}`)

        return reply([
          `✅ *Card Purchased!*`,
          ``,
          `${RARITY_EMOJI[listing.rarity]} *${listing.card_name}* is now in your collection!`,
          `💰 Spent: *${listing.price} ${FC}*`,
          `💰 New balance: *${res.new_balance} ${FC}*`,
        ].join('\n'))
      }

      // ── .fcard packs ──────────────────────────────────────────────────────
      if (sub === 'packs') {
        const res = await api.getPacks('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load packs.')

        const packs = res.packs || []
        if (!packs.length) return reply(`🎁 *Football Card Packs*\n\nNo packs available right now.\n\nCheck back soon for new events!`)

        const lines = packs.map((p, i) => [
          `${i + 1}. ⚽ *${p.name}*`,
          `   1 spin: ${p.spin_cost_1} ${FC}  |  10 spins: ${p.spin_cost_10} ${FC}`,
          p.expires_at ? `   ⏰ Ends: ${new Date(p.expires_at * 1000).toLocaleDateString()}` : `   ✅ No expiry`,
        ].join('\n'))

        return reply([
          `🎁 *Available Football Packs*`,
          `${'─'.repeat(30)}`,
          ``,
          lines.join('\n\n'),
          ``,
          `_Spin with .fcard spin <pack name>_`,
          `_10 spins with .fcard spin10 <pack name>_`,
        ].join('\n'))
      }

      // ── .fcard spin / spin10 ──────────────────────────────────────────────
      if (sub === 'spin' || sub === 'spin10') {
        const count    = sub === 'spin10' ? 10 : 1
        const packName = rest
        if (!packName) return reply(`Usage: *.fcard ${sub} <pack name>*\nSee packs with *.fcard packs*`)

        const packsRes = await api.getPacks('football').catch(() => null)
        if (!packsRes?.ok) return reply('❌ Could not load packs.')

        const pack = (packsRes.packs || []).find(p =>
          p.name.toLowerCase().includes(packName.toLowerCase())
        )
        if (!pack) return reply(`❌ No pack found matching *"${packName}"*\n\nSee packs with *.fcard packs*`)

        const cost    = count === 10 ? pack.spin_cost_10 : pack.spin_cost_1
        const spinRes = await api.spinPack(pack.id, count).catch(() => null)

        if (!spinRes?.ok) {
          const err = spinRes?.error || 'Unknown error'
          if (err.includes('coins')) return reply(`❌ Not enough coins!\n\nThis spin costs *${cost} ${FC}*\nCheck your balance with *.balance*`)
          return reply(`❌ Spin failed: ${err}`)
        }

        const pulled = spinRes.cards || []
        if (!pulled.length) return reply('❌ Spin returned no cards. Try again.')

        const resultLines = pulled.map(c =>
          `${RARITY_EMOJI[c.rarity]} *${c.name}* ${c.is_new ? '✨ NEW!' : '(duplicate)'}  — ${c.club}`
        )

        const icons = pulled.filter(c => c.rarity === 'icon')
        const header = icons.length
          ? `👑 *ICON PULL!* 👑\n`
          : count === 10 ? `⚽ *10x Spin Results!*` : `⚽ *Spin Result!*`

        const msg_text = [
          header,
          `Pack: ${pack.name}`,
          `Spent: ${spinRes.cost_paid} ${FC}`,
          `${'─'.repeat(28)}`,
          ``,
          ...resultLines,
          ``,
          `💰 Balance: *${spinRes.new_balance} ${FC}*`,
          spinRes.pity_progress ? `_Pity: ${spinRes.pity_progress} spins_` : '',
        ].filter(Boolean).join('\n')

        if (pulled[0]?.image_url && count === 1) {
          return sock.sendMessage(ctx.from, {
            image:   { url: pulled[0].image_url },
            caption: msg_text,
          }, { quoted: msg })
        }

        return reply(msg_text)
      }

      // ── .fcard showcase ───────────────────────────────────────────────────
      if (sub === 'showcase') {
        const targetMention = ctx.mentionedJids[0]
        if (targetMention) {
          const phone = targetMention.split('@')[0].replace(/\D/g, '')
          const res   = await api.getShowcase(phone).catch(() => null)
          if (!res?.ok || !res.showcase?.length) {
            return reply(`@${phone} hasn't set up a football showcase yet.`)
          }
          const lines = res.showcase.map((c, i) =>
            `${i + 1}. ${RARITY_EMOJI[c.rarity]} *${c.name}* — ${c.club}`
          )
          return sock.sendMessage(ctx.from, {
            text: [`🎖️ *@${phone}'s Football Showcase*`, `${'─'.repeat(28)}`, ``, ...lines].join('\n'),
            mentions: [targetMention],
          }, { quoted: msg })
        }

        return reply([
          `🎖️ *Your Football Showcase*`,
          `${'─'.repeat(28)}`,
          `You can showcase up to 7 cards on your profile.`,
          `Other users can view them with .fcard showcase @you`,
          ``,
          `To manage your showcase, visit your dashboard:`,
          `_Cards Tab → tap a card → Set as Showcase_`,
        ].join('\n'))
      }

      // ── Unknown sub ───────────────────────────────────────────────────────
      return reply([
        `⚽ *Football Card Commands*`,
        `${'─'.repeat(28)}`,
        `*.fcard list* — view your collection`,
        `*.fcard view <n>* — card details`,
        `*.fcard dups* — show duplicates`,
        `*.fcard top* — collector leaderboard`,
        `*.fcard packs* — available packs`,
        `*.fcard spin <pack>* — spin once`,
        `*.fcard spin10 <pack>* — spin 10x`,
        `*.fcard release <n>* — sell a card`,
        `*.fcard market* — browse marketplace`,
        `*.fcard buy <#>* — buy from marketplace`,
        `*.fcard showcase [@user]* — view showcase`,
      ].join('\n'))
    },
  },
]
