// commands/cards/anime.js
// .acard — anime card collection commands
// All card data lives in D1 via the Worker. FK key resolves the account.

const RARITY_EMOJI = { common: '⚪', rare: '🔵', epic: '💜', legendary: '🟡' }
const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }
const FC = '🔥'

const raritySort = { legendary: 0, epic: 1, rare: 2, common: 3 }

export default [
  {
    command: 'acard',
    aliases: ['animecard', 'ac'],
    category: 'cards',
    description: 'Anime card collection commands',
    usage: '.acard <list|view|dups|top|release|market|buy|packs|spin|spin10|showcase>',

    handler: async (sock, msg, ctx, { api }) => {
      const sub  = ctx.args[0]?.toLowerCase()
      const rest = ctx.args.slice(1).join(' ').trim()
      const jid  = ctx.senderStorageJid || ctx.sender
      const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

      // ── .acard list ───────────────────────────────────────────────────────
      if (!sub || sub === 'list') {
        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards. Try again.')

        const cards = res.cards || []
        if (!cards.length) return reply(`🃏 *Your Anime Cards*\n\nYou have no anime cards yet!\n\nUse *.acard packs* to see available packs and *.acard spin <pack>* to get cards.`)

        // Group by rarity
        const grouped = {}
        for (const c of cards) {
          const r = c.rarity || 'common'
          if (!grouped[r]) grouped[r] = []
          grouped[r].push(c)
        }

        const lines = []
        for (const rarity of ['legendary', 'epic', 'rare', 'common']) {
          if (!grouped[rarity]) continue
          lines.push(`\n${RARITY_EMOJI[rarity]} *${RARITY_LABEL[rarity]}* (${grouped[rarity].length})`)
          for (const c of grouped[rarity]) {
            lines.push(`  › ${c.name} — ${c.series}${c.quantity > 1 ? ` ×${c.quantity}` : ''}`)
          }
        }

        return reply([
          `🃏 *Your Anime Cards* (${cards.length} total)`,
          `${'─'.repeat(30)}`,
          ...lines,
          ``,
          `_Use .acard view <name> for card details_`,
          `_Use .acard dups to see duplicates_`,
        ].join('\n'))
      }

      // ── .acard view <name> ────────────────────────────────────────────────
      if (sub === 'view') {
        if (!rest) return reply(`Usage: *.acard view <character name>*\nExample: .acard view Itachi`)

        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards.')

        const card = (res.cards || []).find(c =>
          c.name.toLowerCase().includes(rest.toLowerCase())
        )
        if (!card) return reply(`❌ No anime card found matching *"${rest}"*\n\nCheck your collection with *.acard list*`)

        const lines = [
          `${RARITY_EMOJI[card.rarity]} *${card.name}*`,
          `${'─'.repeat(28)}`,
          `📺 Series: ${card.series}`,
          `⭐ Rarity: ${RARITY_LABEL[card.rarity]}`,
          `🔢 Copies: ${card.quantity}`,
          card.description ? `\n📖 ${card.description}` : '',
          ``,
          `_Card ID: ${card.user_card_id}_`,
          `_Use .acard release ${card.name} to sell it_`,
        ].filter(v => v !== null)

        if (card.image_url) {
          return sock.sendMessage(ctx.from, {
            image:   { url: card.image_url },
            caption: lines.join('\n'),
          }, { quoted: msg })
        }
        return reply(lines.join('\n'))
      }

      // ── .acard dups ───────────────────────────────────────────────────────
      if (sub === 'dups' || sub === 'duplicates') {
        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards.')

        const dups = (res.cards || []).filter(c => c.quantity > 1)
        if (!dups.length) return reply(`✅ No duplicates! All your anime cards are unique.\n\nKeep spinning to collect more!`)

        const lines = dups
          .sort((a, b) => (raritySort[a.rarity] || 3) - (raritySort[b.rarity] || 3))
          .map(c => `${RARITY_EMOJI[c.rarity]} ${c.name} — ×${c.quantity} (${c.series})`)

        return reply([
          `🔄 *Duplicate Anime Cards* (${dups.length})`,
          `${'─'.repeat(30)}`,
          ...lines,
          ``,
          `_Use .acard release <name> to sell a duplicate for coins_`,
        ].join('\n'))
      }

      // ── .acard top ────────────────────────────────────────────────────────
      if (sub === 'top') {
        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load leaderboard.')

        const top = (res.leaderboard || []).slice(0, 10)
        if (!top.length) return reply('📊 No leaderboard data yet. Be the first to collect!')

        const medals = ['🥇', '🥈', '🥉']
        const lines  = top.map((u, i) => `${medals[i] || `${i + 1}.`} @${u.username || u.jid?.split('@')[0]} — ${u.total_value} value · ${u.card_count} cards`)

        return sock.sendMessage(ctx.from, {
          text: [`📊 *Top Anime Collectors*`, `${'─'.repeat(28)}`, ``, ...lines].join('\n'),
          mentions: top.map(u => u.jid).filter(Boolean),
        }, { quoted: msg })
      }

      // ── .acard release <name> ─────────────────────────────────────────────
      if (sub === 'release') {
        if (!rest) return reply(`Usage: *.acard release <card name>*\nExample: .acard release Itachi`)

        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards.')

        const card = (res.cards || []).find(c =>
          c.name.toLowerCase().includes(rest.toLowerCase())
        )
        if (!card) return reply(`❌ You don't have a card matching *"${rest}"*`)

        const salePrice = card.release_price || 0
        const marketPrice = Math.floor(salePrice * 1.1)

        // Show confirmation
        return reply([
          `💰 *Release Card Confirmation*`,
          `${'─'.repeat(28)}`,
          `${RARITY_EMOJI[card.rarity]} *${card.name}* (${card.series})`,
          `Rarity: ${RARITY_LABEL[card.rarity]}`,
          ``,
          `You will receive: *${salePrice} ${FC}*`,
          `Marketplace price: *${marketPrice} ${FC}* (+10%)`,
          ``,
          `To confirm, type:`,
          `*.acard release confirm ${card.user_card_id}*`,
          ``,
          `_This cannot be undone once confirmed_`,
        ].join('\n'))
      }

      // ── .acard release confirm <id> ───────────────────────────────────────
      if (sub === 'release' && ctx.args[1] === 'confirm') {
        const userCardId = ctx.args[2]
        if (!userCardId) return reply('❌ Missing card ID. Use *.acard release <name>* first.')

        const res = await api.releaseCard(userCardId).catch(() => null)
        if (!res?.ok) return reply(`❌ Release failed: ${res?.error || 'Unknown error'}`)

        return reply([
          `✅ *Card Released!*`,
          ``,
          `💰 You received *${res.coins_earned} ${FC}*`,
          `🏪 Your card is now listed on the marketplace for *${res.market_price} ${FC}*`,
          ``,
          `_Check marketplace with .acard market_`,
        ].join('\n'))
      }

      // ── .acard market ─────────────────────────────────────────────────────
      if (sub === 'market') {
        const res = await api.getMarket('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load marketplace.')

        const listings = res.listings || []
        if (!listings.length) return reply(`🏪 *Anime Card Marketplace*\n\nNo cards listed yet.\n\nRelease a duplicate with *.acard release <name>* to be the first!`)

        const lines = listings.slice(0, 15).map((l, i) =>
          `${i + 1}. ${RARITY_EMOJI[l.rarity]} *${l.card_name}* — ${l.price} ${FC}\n    ${l.series} · Sold by @${l.seller_username || '?'}`
        )

        return reply([
          `🏪 *Anime Card Marketplace* (${listings.length} listings)`,
          `${'─'.repeat(30)}`,
          ``,
          ...lines,
          ``,
          `_Buy with .acard buy <listing number>_`,
        ].join('\n'))
      }

      // ── .acard buy <number> ───────────────────────────────────────────────
      if (sub === 'buy') {
        const num = parseInt(rest)
        if (isNaN(num) || num < 1) return reply(`Usage: *.acard buy <listing number>*\nSee listings with *.acard market*`)

        const marketRes = await api.getMarket('anime').catch(() => null)
        if (!marketRes?.ok) return reply('❌ Could not load marketplace.')

        const listing = (marketRes.listings || [])[num - 1]
        if (!listing) return reply(`❌ No listing at position ${num}. Check *.acard market*`)

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

      // ── .acard packs ─────────────────────────────────────────────────────
      if (sub === 'packs') {
        const res = await api.getPacks('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load packs.')

        const packs = res.packs || []
        if (!packs.length) return reply(`🎁 *Anime Card Packs*\n\nNo packs available right now.\n\nCheck back soon for new events!`)

        const lines = packs.map((p, i) => [
          `${i + 1}. 🎴 *${p.name}*`,
          `   1 spin: ${p.spin_cost_1} ${FC}  |  10 spins: ${p.spin_cost_10} ${FC}`,
          p.expires_at ? `   ⏰ Ends: ${new Date(p.expires_at * 1000).toLocaleDateString()}` : `   ✅ No expiry`,
        ].join('\n'))

        return reply([
          `🎁 *Available Anime Packs*`,
          `${'─'.repeat(30)}`,
          ``,
          lines.join('\n\n'),
          ``,
          `_Spin with .acard spin <pack name>_`,
          `_10 spins with .acard spin10 <pack name>_`,
        ].join('\n'))
      }

      // ── .acard spin <pack> ────────────────────────────────────────────────
      if (sub === 'spin' || sub === 'spin10') {
        const count  = sub === 'spin10' ? 10 : 1
        const packName = rest
        if (!packName) return reply(`Usage: *.acard ${sub} <pack name>*\nSee packs with *.acard packs*`)

        const packsRes = await api.getPacks('anime').catch(() => null)
        if (!packsRes?.ok) return reply('❌ Could not load packs.')

        const pack = (packsRes.packs || []).find(p =>
          p.name.toLowerCase().includes(packName.toLowerCase())
        )
        if (!pack) return reply(`❌ No pack found matching *"${packName}"*\n\nSee packs with *.acard packs*`)

        const cost = count === 10 ? pack.spin_cost_10 : pack.spin_cost_1
        const spinRes = await api.spinPack(pack.id, count).catch(() => null)

        if (!spinRes?.ok) {
          const err = spinRes?.error || 'Unknown error'
          if (err.includes('coins')) return reply(`❌ Not enough coins!\n\nThis spin costs *${cost} ${FC}*\nCheck your balance with *.balance*`)
          return reply(`❌ Spin failed: ${err}`)
        }

        const pulled = spinRes.cards || []
        if (!pulled.length) return reply('❌ Spin returned no cards. Try again.')

        // Build result message
        const resultLines = pulled.map(c =>
          `${RARITY_EMOJI[c.rarity]} *${c.name}* ${c.is_new ? '✨ NEW!' : '(duplicate)'}  — ${c.series}`
        )

        const legendaries = pulled.filter(c => c.rarity === 'legendary')
        const header = legendaries.length
          ? `🌟 *LEGENDARY PULL!* 🌟\n`
          : count === 10 ? `🎴 *10x Spin Results!*` : `🎴 *Spin Result!*`

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

        // If there's an image on the first card, send it
        if (pulled[0]?.image_url && count === 1) {
          return sock.sendMessage(ctx.from, {
            image:   { url: pulled[0].image_url },
            caption: msg_text,
          }, { quoted: msg })
        }

        return reply(msg_text)
      }

      // ── .acard showcase ───────────────────────────────────────────────────
      if (sub === 'showcase') {
        const targetMention = ctx.mentionedJids[0]
        if (targetMention) {
          // View someone else's showcase
          const phone = targetMention.split('@')[0].replace(/\D/g, '')
          const res   = await api.getShowcase(phone).catch(() => null)
          if (!res?.ok || !res.showcase?.length) {
            return reply(`@${phone} hasn't set up a showcase yet.`)
          }
          const lines = res.showcase.map((c, i) =>
            `${i + 1}. ${RARITY_EMOJI[c.rarity]} *${c.name}* — ${c.series}`
          )
          return sock.sendMessage(ctx.from, {
            text: [`🎖️ *@${phone}'s Showcase*`, `${'─'.repeat(28)}`, ``, ...lines].join('\n'),
            mentions: [targetMention],
          }, { quoted: msg })
        }

        // View own showcase info
        return reply([
          `🎖️ *Your Anime Showcase*`,
          `${'─'.repeat(28)}`,
          `You can showcase up to 7 cards on your profile.`,
          `Other users can view them with .acard showcase @you`,
          ``,
          `To manage your showcase, visit your dashboard:`,
          `_Cards Tab → tap a card → Set as Showcase_`,
        ].join('\n'))
      }

      // ── Unknown sub ───────────────────────────────────────────────────────
      return reply([
        `🃏 *Anime Card Commands*`,
        `${'─'.repeat(28)}`,
        `*.acard list* — view your collection`,
        `*.acard view <name>* — card details`,
        `*.acard dups* — show duplicates`,
        `*.acard top* — collector leaderboard`,
        `*.acard packs* — available packs`,
        `*.acard spin <pack>* — spin once`,
        `*.acard spin10 <pack>* — spin 10x`,
        `*.acard release <name>* — sell a card`,
        `*.acard market* — browse marketplace`,
        `*.acard buy <#>* — buy from marketplace`,
        `*.acard showcase [@user]* — view showcase`,
      ].join('\n'))
    },
  },
]
