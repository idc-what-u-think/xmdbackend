// commands/cards/anime.js — Anime card collection commands v2
// .acard <sub> — Full card system with stars, descriptions, image reveals

const RARITY_COLOR = { common:'⚪', rare:'🔵', epic:'💜', legendary:'⭐' }
const RARITY_LABEL = { common:'Common', rare:'Rare', epic:'Epic', legendary:'Legendary' }
const FC = '🔥'

function stars(n) { return '★'.repeat(n || 0) + '☆'.repeat(Math.max(0, 5 - (n || 0))) }

export default [
  {
    command: 'acard',
    aliases: ['animecard', 'ac'],
    category: 'cards',
    description: 'Anime card collection',
    usage: '.acard <list|view|packs|spin|spin10|release|market|buy|top|showcase>',

    handler: async (sock, msg, ctx, { api }) => {
      const sub  = ctx.args[0]?.toLowerCase()
      const rest = ctx.args.slice(1).join(' ').trim()
      const reply    = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })
      const replyImg = (url, caption) => sock.sendMessage(ctx.from, { image: { url }, caption }, { quoted: msg })

      // ── .acard list ────────────────────────────────────────────────────
      if (!sub || sub === 'list') {
        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards. Try again.')
        const cards = res.cards || []
        if (!cards.length) return reply(
          `🃏 *Your Anime Collection*\n\nNo cards yet!\n\nUse *.acard packs* to see available packs\nUse *.acard spin <pack>* to pull cards`
        )
        const grouped = {}
        for (const c of cards) {
          const r = c.rarity || 'common'
          if (!grouped[r]) grouped[r] = []
          grouped[r].push(c)
        }
        const lines = [`🃏 *Your Anime Cards* (${cards.length} unique)\n`]
        for (const rarity of ['legendary','epic','rare','common']) {
          if (!grouped[rarity]) continue
          const total = grouped[rarity].reduce((s,c) => s + (c.quantity||1), 0)
          lines.push(`${RARITY_COLOR[rarity]} *${RARITY_LABEL[rarity]}* — ${grouped[rarity].length} unique (${total} total)`)
          for (const c of grouped[rarity].slice(0,8)) {
            lines.push(`  › ${c.name}${c.series ? ` · ${c.series}` : ''}${c.quantity>1 ? ` ×${c.quantity}` : ''}  ${stars(c.stars||0)}`)
          }
          if (grouped[rarity].length > 8) lines.push(`  _...and ${grouped[rarity].length-8} more_`)
          lines.push('')
        }
        lines.push(`_View card: .acard view <name>_`)
        return reply(lines.join('\n'))
      }

      // ── .acard view <name> ─────────────────────────────────────────────
      if (sub === 'view') {
        if (!rest) return reply('Usage: *.acard view <character name>*\nExample: .acard view Itachi')
        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load cards.')
        const card = (res.cards || []).find(c => c.name.toLowerCase().includes(rest.toLowerCase()))
        if (!card) return reply(`❌ No card matching *"${rest}"*\n\nCheck *.acard list*`)

        const starStr = stars(card.stars || 0)
        const caption = [
          `${RARITY_COLOR[card.rarity] || '⚪'} *${card.name}*`,
          `${'─'.repeat(26)}`,
          card.series ? `📺 *${card.series}*` : '',
          `⭐ Rarity: ${RARITY_LABEL[card.rarity] || card.rarity}`,
          `${starStr}`,
          `🔢 Copies owned: ${card.quantity}`,
          `💰 Release value: ${card.release_price || 0} ${FC}`,
          card.ai_description ? `\n📖 _${card.ai_description}_` : '',
          `\n_Use .acard release ${card.name} to sell_`,
        ].filter(Boolean).join('\n')

        if (card.image_url) return replyImg(card.image_url, caption)
        return reply(caption)
      }

      // ── .acard dups ────────────────────────────────────────────────────
      if (sub === 'dups') {
        const res  = await api.getCards('anime').catch(() => null)
        const dups = (res?.cards || []).filter(c => (c.quantity||1) > 1)
        if (!dups.length) return reply(`🃏 *Duplicates*\n\nNo duplicates yet!`)
        const lines = [`🔄 *Your Duplicates* (${dups.length} cards)\n`]
        for (const c of dups) {
          lines.push(`${RARITY_COLOR[c.rarity]||'⚪'} ${c.name} ×${c.quantity}  ${stars(c.stars||0)}  — ${c.release_price||0}${FC} each`)
        }
        lines.push(`\n_Release: .acard release <name>_`)
        return reply(lines.join('\n'))
      }

      // ── .acard top ─────────────────────────────────────────────────────
      if (sub === 'top') {
        const res = await api.getCards('anime').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load leaderboard.')
        const lb = res.leaderboard || []
        if (!lb.length) return reply('📊 No leaderboard data yet.')
        const lines = [`🏆 *Anime Card Leaderboard*\n`]
        lb.slice(0,10).forEach((u, i) => {
          lines.push(`${i+1}. *${u.username || u.jid?.split('@')[0] || '?'}* — ${u.total_cards} cards`)
        })
        return reply(lines.join('\n'))
      }

      // ── .acard packs ──────────────────────────────────────────────────
      if (sub === 'packs') {
        const res   = await api.getPacks('anime').catch(() => null)
        const packs = res?.packs || []
        if (!packs.length) return reply('🎁 No anime packs available right now.')
        const lines = [`🎁 *Available Anime Packs*\n`]
        for (const p of packs) {
          const aggNow    = p.aggressive_mode && Date.now()/1000 >= p.aggressive_start && Date.now()/1000 <= p.aggressive_end
          const modeLabel = p.spin_mode === 'wheel' ? '🎡 Wheel' : '📦 Pack'
          const expiresStr = p.expires_at ? `\n  ⏰ Ends: ${new Date(p.expires_at*1000).toLocaleDateString()}` : ''
          lines.push(`${aggNow ? '🔥 ' : ''}*${p.name}*  ${modeLabel}`)
          lines.push(`  1× ${p.spin_cost_1}${FC}  ·  10× ${p.spin_cost_10}${FC}${expiresStr}`)
          if (aggNow) lines.push(`  🔥 *AGGRESSIVE MODE ACTIVE — boosted odds!*`)
          lines.push('')
        }
        lines.push(`_Spin: .acard spin <pack name>_\n_10×: .acard spin10 <pack name>_`)
        return reply(lines.join('\n'))
      }

      // ── .acard spin / spin10 ──────────────────────────────────────────
      if (sub === 'spin' || sub === 'spin10') {
        if (!rest) return reply(`Usage: *.acard ${sub} <pack name>*\nSee packs: *.acard packs*`)
        const packsRes = await api.getPacks('anime').catch(() => null)
        const pack     = (packsRes?.packs || []).find(p => p.name.toLowerCase().includes(rest.toLowerCase()))
        if (!pack) return reply(`❌ Pack not found: *"${rest}"*\n\nSee *.acard packs*`)

        const count = sub === 'spin10' ? 10 : 1
        await reply(`⏳ ${count===10 ? 'Opening 10 packs...' : 'Opening pack...'} 🎴`)
        const res = await api.spinPack(pack.id, count).catch(() => null)
        if (!res?.ok) return reply(`❌ Spin failed: ${res?.error || 'Not enough coins?'}`)

        const cards = res.cards || []
        const lines = [`✨ *Pulled ${cards.length} card${cards.length>1?'s':''}!*\n`]
        for (const c of cards) {
          lines.push(`${RARITY_COLOR[c.rarity]||'⚪'} *${c.name}*  ${stars(c.stars||0)}`)
          if (c.series) lines.push(`  📺 ${c.series}`)
          lines.push(`  ${RARITY_LABEL[c.rarity]||c.rarity}${c.is_new ? ' — ✨ *NEW!*' : ' — duplicate'}`)
          lines.push('')
        }
        lines.push(`💰 Balance: *${res.new_balance}${FC}*`)
        if (res.pity_progress >= 30) lines.push(`\n_Getting closer to a guaranteed pull!_`)

        // Single pull with image = show as image reveal
        if (cards.length === 1 && cards[0].image_url) {
          return replyImg(cards[0].image_url, lines.join('\n'))
        }
        return reply(lines.join('\n'))
      }

      // ── .acard release <name> ─────────────────────────────────────────
      if (sub === 'release') {
        if (!rest) return reply('Usage: *.acard release <card name>*')
        const confirmMatch = rest.match(/^confirm\s+(.+)/i)
        if (confirmMatch) {
          const cardName = confirmMatch[1].trim()
          const res  = await api.getCards('anime').catch(() => null)
          const card = (res?.cards||[]).find(c => c.name.toLowerCase() === cardName.toLowerCase())
          if (!card) return reply(`❌ Card not found: *"${cardName}"*`)
          const releaseRes = await api.releaseCard(card.user_card_id).catch(() => null)
          if (!releaseRes?.ok) return reply(`❌ Release failed: ${releaseRes?.error || 'error'}`)
          return reply(`✅ *Released!*\n\nYou received *${releaseRes.coins_earned}${FC}* for *${card.name}*!\n💰 Balance: ${releaseRes.new_balance}${FC}`)
        }
        const res  = await api.getCards('anime').catch(() => null)
        const card = (res?.cards||[]).find(c => c.name.toLowerCase().includes(rest.toLowerCase()))
        if (!card) return reply(`❌ Card not found: *"${rest}"*\n\nCheck *.acard list*`)
        return reply(
          `⚠️ *Release Confirmation*\n\n` +
          `${RARITY_COLOR[card.rarity]||'⚪'} *${card.name}*  ${stars(card.stars||0)}\n` +
          `💰 You will receive: *${card.release_price||0}${FC}*\n\n` +
          `Confirm: *.acard release confirm ${card.name}*\n_This cannot be undone!_`
        )
      }

      // ── .acard market ─────────────────────────────────────────────────
      if (sub === 'market') {
        const res      = await api.getMarket('anime').catch(() => null)
        const listings = res?.listings || []
        if (!listings.length) return reply(`🏪 *Anime Marketplace*\n\nNo listings right now.\n\n_List yours via .acard release <n>_`)
        const lines = [`🏪 *Anime Marketplace*\n`]
        listings.slice(0,12).forEach((l, i) => {
          lines.push(`${i+1}. ${RARITY_COLOR[l.rarity]||'⚪'} *${l.card_name}*  ${stars(l.stars||0)}`)
          lines.push(`   ${RARITY_LABEL[l.rarity]||l.rarity}  ·  💰 *${l.price}${FC}*`)
        })
        lines.push(`\n_Buy: .acard buy <#number>_`)
        return reply(lines.join('\n'))
      }

      // ── .acard buy <#n> ───────────────────────────────────────────────
      if (sub === 'buy') {
        const n = parseInt(rest)
        if (isNaN(n) || n < 1) return reply('Usage: *.acard buy <#>*\nSee: *.acard market*')
        const res     = await api.getMarket('anime').catch(() => null)
        const listing = (res?.listings||[])[n-1]
        if (!listing) return reply(`❌ No listing #${n}. See *.acard market*`)
        const buyRes  = await api.buyCard(listing.id).catch(() => null)
        if (!buyRes?.ok) return reply(`❌ Purchase failed: ${buyRes?.error || 'Not enough coins?'}`)
        return reply(`✅ *Purchased!*\n\n${RARITY_COLOR[listing.rarity]||'⚪'} *${listing.card_name}* is now yours!\n💰 Balance: *${buyRes.new_balance}${FC}*`)
      }

      // ── .acard showcase ───────────────────────────────────────────────
      if (sub === 'showcase') {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null
        const res    = await api.getShowcase(mentioned, 'anime').catch(() => null)
        const cards  = res?.showcase || []
        const owner  = mentioned ? mentioned.split('@')[0] : 'Your'
        if (!cards.length) return reply(`📋 *${owner === 'Your' ? 'Your' : owner+"'s"} Showcase*\n\nNot set yet!\n\n_Set via the dashboard_`)
        const lines  = [`📋 *${owner === 'Your' ? 'Your' : owner+"'s"} Anime Showcase*\n`]
        cards.forEach((c, i) => {
          lines.push(`${i+1}. ${RARITY_COLOR[c.rarity]||'⚪'} *${c.name}*  ${stars(c.stars||0)}${c.series ? `  · ${c.series}` : ''}`)
        })
        return reply(lines.join('\n'))
      }

      return reply(
        `🃏 *Anime Cards — Commands*\n\n` +
        `*.acard list* — Your collection\n` +
        `*.acard view <name>* — Card details + image\n` +
        `*.acard dups* — Duplicates\n` +
        `*.acard top* — Leaderboard\n` +
        `*.acard packs* — Available packs\n` +
        `*.acard spin <pack>* — Spin 1×\n` +
        `*.acard spin10 <pack>* — Spin 10×\n` +
        `*.acard release <name>* — Sell card\n` +
        `*.acard market* — Marketplace\n` +
        `*.acard buy <#>* — Buy from market\n` +
        `*.acard showcase* — View showcase`
      )
    }
  }
]
