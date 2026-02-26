// commands/cards/football.js — Football card collection commands v2
// .fcard <sub> — Full football card system with multi-position, AI ratings, formation

const RARITY_COLOR = { bronze:'🟤', silver:'⚪', gold:'🟡', icon:'🔴' }
const RARITY_LABEL = { bronze:'Bronze', silver:'Silver', gold:'Gold', icon:'Icon' }
const FC = '🔥'

// Star display — filled + empty
function stars(n) { return '★'.repeat(n||0) + '☆'.repeat(Math.max(0,5-(n||0))) }

// Rating bar — visual 0-130 scale
function ratingBar(r) {
  const filled = Math.round((r / 130) * 10)
  return '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${r}/130`
}

// Position penalty warning
function posWarning(card, slotLabel) {
  if (!card.positions && !card.position) return ''
  const pList = (card.positions || card.position || '').split(',').map(p => p.trim().toUpperCase())
  if (!pList.includes(slotLabel.toUpperCase())) {
    return `\n⚠️ _Position mismatch — effective rating drops to ${Math.round((card.rating||0)*0.7)}_`
  }
  return ''
}

const VALID_POSITIONS = ['GK','CB','LB','RB','CMF','DMF','LMF','RMF','RWF','LWF','SS','AMF','CF']

const FORMATION_SLOTS = {
  '4-3-3':   ['GK','RB','CB1','CB2','LB','CMF1','CMF2','CMF3','RWF','CF','LWF'],
  '4-2-1-3': ['GK','RB','CB1','CB2','LB','DMF1','DMF2','AMF','RWF','CF','LWF'],
  '4-1-2-3': ['GK','RB','CB1','CB2','LB','DMF','RMF','LMF','RWF','CF','LWF'],
  '3-4-3':   ['GK','CB1','CB2','CB3','RMF','CMF1','CMF2','LMF','RWF','CF','LWF'],
  '3-5-2':   ['GK','CB1','CB2','CB3','RMF','CMF1','DMF','CMF2','LMF','CF1','CF2'],
}

// Slot key → base position label (for penalty check)
const SLOT_POSITION = {
  GK:'GK', RB:'RB', CB:'CB', CB1:'CB', CB2:'CB', CB3:'CB', LB:'LB',
  CMF:'CMF', CMF1:'CMF', CMF2:'CMF', CMF3:'CMF',
  DMF:'DMF', DMF1:'DMF', DMF2:'DMF',
  AMF:'AMF', RMF:'RMF', LMF:'LMF',
  RWF:'RWF', LWF:'LWF', SS:'SS', CF:'CF', CF1:'CF', CF2:'CF'
}

export default [
  {
    command: 'fcard',
    aliases: ['footballcard', 'fc'],
    category: 'cards',
    description: 'Football card collection',
    usage: '.fcard <list|view|packs|spin|spin10|formation|team|release|market|buy|showcase>',

    handler: async (sock, msg, ctx, { api }) => {
      const sub  = ctx.args[0]?.toLowerCase()
      const rest = ctx.args.slice(1).join(' ').trim()
      const reply    = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })
      const replyImg = (url, caption) => sock.sendMessage(ctx.from, { image: { url }, caption }, { quoted: msg })

      // ── .fcard list ─────────────────────────────────────────────────
      if (!sub || sub === 'list') {
        const res = await api.getCards('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not fetch your cards. Try again.')
        const cards = res.cards || []
        if (!cards.length) return reply(
          `⚽ *Your Football Collection*\n\nNo cards yet!\n\nUse *.fcard packs* to see available packs\nUse *.fcard spin <pack>* to pull cards`
        )
        const grouped = {}
        for (const c of cards) {
          const r = c.rarity || 'bronze'
          if (!grouped[r]) grouped[r] = []
          grouped[r].push(c)
        }
        const lines = [`⚽ *Your Football Cards* (${cards.length} unique)\n`]
        for (const rarity of ['icon','gold','silver','bronze']) {
          if (!grouped[rarity]) continue
          const total = grouped[rarity].reduce((s,c) => s+(c.quantity||1),0)
          lines.push(`${RARITY_COLOR[rarity]} *${RARITY_LABEL[rarity]}* — ${grouped[rarity].length} unique (${total} total)`)
          for (const c of grouped[rarity].slice(0,6)) {
            // Show primary position from positions field
            const primaryPos = (c.positions||c.position||'').split(',')[0]?.trim() || '?'
            lines.push(`  › *${c.name}* [${primaryPos}]  ${stars(c.stars||0)}  ${c.rating||0}/130`)
          }
          if (grouped[rarity].length > 6) lines.push(`  _...and ${grouped[rarity].length-6} more_`)
          lines.push('')
        }
        lines.push(`_View player: .fcard view <n>_\n_Formation: .fcard formation_`)
        return reply(lines.join('\n'))
      }

      // ── .fcard view <n> ──────────────────────────────────────────────
      if (sub === 'view') {
        if (!rest) return reply('Usage: *.fcard view <player name>*\nExample: .fcard view Mbappe')
        const res = await api.getCards('football').catch(() => null)
        if (!res?.ok) return reply('❌ Could not load cards.')
        const card = (res.cards||[]).find(c => c.name.toLowerCase().includes(rest.toLowerCase()))
        if (!card) return reply(`❌ No card matching *"${rest}"*\n\nCheck *.fcard list*`)

        const starStr  = stars(card.stars || 0)
        const positions = (card.positions || card.position || '?').split(',').map(p => p.trim())
        const primaryPos = positions[0]

        // Score breakdown
        let scoreLines = ''
        if (card.football_score_json) {
          try {
            const sc = JSON.parse(card.football_score_json)
            scoreLines = '\n' + Object.entries(sc).map(([k,v]) => {
              const bar = '▓'.repeat(Math.round((v.score/v.max)*8)) + '░'.repeat(8-Math.round((v.score/v.max)*8))
              return `${k.padEnd(16)} ${bar} ${v.score}/${v.max}`
            }).join('\n')
          } catch {}
        }

        const caption = [
          `${RARITY_COLOR[card.rarity]||'⚽'} *${card.name}*`,
          `${'─'.repeat(26)}`,
          `🏟️ Club: *${card.club || '?'}*`,
          `🌍 Nation: *${card.nationality || '?'}*`,
          `📍 Position: *${primaryPos}*${positions.length > 1 ? ` _(also: ${positions.slice(1).join(', ')})_` : ''}`,
          ``,
          `📊 *Rating: ${card.rating||0}/130*  ${starStr}`,
          `   ${ratingBar(card.rating||0)}`,
          scoreLines,
          card.ai_description ? `\n📋 _${card.ai_description}_` : '',
          `\n🔢 Copies: ${card.quantity}  💰 Release: ${card.release_price||0}${FC}`,
          `\n_Use .fcard release ${card.name} to sell_`,
        ].filter(v => v !== null && v !== undefined).join('\n')

        if (card.image_url) return replyImg(card.image_url, caption)
        return reply(caption)
      }

      // ── .fcard packs ─────────────────────────────────────────────────
      if (sub === 'packs') {
        const res   = await api.getPacks('football').catch(() => null)
        const packs = res?.packs || []
        if (!packs.length) return reply('🎁 No football packs available right now.')
        const lines = [`🎁 *Available Football Packs*\n`]
        for (const p of packs) {
          const aggNow    = p.aggressive_mode && Date.now()/1000 >= p.aggressive_start && Date.now()/1000 <= p.aggressive_end
          const modeLabel = p.spin_mode === 'wheel' ? '🎡 Wheel' : '📦 Pack'
          const expiresStr = p.expires_at ? `\n  ⏰ Ends: ${new Date(p.expires_at*1000).toLocaleDateString()}` : ''
          lines.push(`${aggNow?'🔥 ':''}*${p.name}*  ${modeLabel}`)
          lines.push(`  1× ${p.spin_cost_1}${FC}  ·  10× ${p.spin_cost_10}${FC}${expiresStr}`)
          if (aggNow) lines.push(`  🔥 *AGGRESSIVE MODE — boosted odds!*`)
          lines.push('')
        }
        lines.push(`_Spin: .fcard spin <pack name>_\n_10×: .fcard spin10 <pack name>_`)
        return reply(lines.join('\n'))
      }

      // ── .fcard spin / spin10 ─────────────────────────────────────────
      if (sub === 'spin' || sub === 'spin10') {
        if (!rest) return reply(`Usage: *.fcard ${sub} <pack name>*\nSee packs: *.fcard packs*`)
        const packsRes = await api.getPacks('football').catch(() => null)
        const pack     = (packsRes?.packs||[]).find(p => p.name.toLowerCase().includes(rest.toLowerCase()))
        if (!pack) return reply(`❌ Pack not found: *"${rest}"*\n\nSee *.fcard packs*`)

        const count = sub === 'spin10' ? 10 : 1
        await reply(`⏳ ${count===10 ? 'Opening 10 packs...' : 'Opening pack...'} ⚽`)
        const res = await api.spinPack(pack.id, count).catch(() => null)
        if (!res?.ok) return reply(`❌ Spin failed: ${res?.error || 'Not enough coins?'}`)

        const cards = res.cards || []
        const lines = [`⚽ *Pulled ${cards.length} card${cards.length>1?'s':''}!*\n`]
        for (const c of cards) {
          const primaryPos = (c.positions||c.position||'?').split(',')[0]?.trim()
          lines.push(`${RARITY_COLOR[c.rarity]||'⚽'} *${c.name}*  [${primaryPos}]  ${stars(c.stars||0)}`)
          lines.push(`  ⭐ ${RARITY_LABEL[c.rarity]||c.rarity}  ·  📊 ${c.rating||0}/130`)
          if (c.club) lines.push(`  🏟️ ${c.club}${c.nationality ? ` · ${c.nationality}` : ''}`)
          lines.push(`  ${c.is_new ? '✨ *NEW!*' : 'Duplicate'}`)
          lines.push('')
        }
        lines.push(`💰 Balance: *${res.new_balance}${FC}*`)
        if (res.pity_progress >= 30) lines.push(`\n_Getting closer to a guaranteed pull!_`)

        if (cards.length === 1 && cards[0].image_url) {
          return replyImg(cards[0].image_url, lines.join('\n'))
        }
        return reply(lines.join('\n'))
      }

      // ── .fcard formation ─────────────────────────────────────────────
      if (sub === 'formation' || sub === 'team') {
        const formRes  = await api.getFormation().catch(() => null)
        const cardsRes = await api.getCards('football').catch(() => null)
        const formation = formRes?.formation || '4-3-3'
        const slots     = formRes?.slots || {}
        const allCards  = cardsRes?.cards || []

        const slotKeys = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3']
        const lines = [`⚽ *My Formation (${formation})*\n`]

        // Build a map: card_id → card
        const cardMap = {}
        for (const c of allCards) cardMap[String(c.card_id)] = c

        let totalRating    = 0
        let playerCount    = 0
        let mismatches     = 0
        const clubCount    = {}
        const natCount     = {}

        for (const slotKey of slotKeys) {
          const cardId    = slots[slotKey]
          const card      = cardId ? cardMap[String(cardId)] : null
          const posLabel  = SLOT_POSITION[slotKey] || slotKey.replace(/\d+$/,'')
          const positions = card ? (card.positions||card.position||'').split(',').map(p=>p.trim().toUpperCase()) : []
          const isMatch   = card ? positions.includes(posLabel.toUpperCase()) : true
          const effRating = card ? (isMatch ? (card.rating||0) : Math.round((card.rating||0)*0.7)) : 0
          const warn      = !isMatch && card ? ' ⚠️' : ''

          if (card) {
            totalRating += effRating
            playerCount++
            if (!isMatch) mismatches++
            if (card.club)        clubCount[card.club] = (clubCount[card.club]||0)+1
            if (card.nationality) natCount[card.nationality] = (natCount[card.nationality]||0)+1
            const primaryPos = (card.positions||card.position||'?').split(',')[0].trim()
            lines.push(`[${posLabel.padEnd(4)}] *${card.name}* [${primaryPos}] — ${effRating}${warn}`)
          } else {
            lines.push(`[${posLabel.padEnd(4)}] _Empty_`)
          }
        }

        lines.push('')

        if (playerCount > 0) {
          // Chemistry bonus
          let chem = 0
          Object.values(clubCount).forEach(n => { if (n>1) chem += (n-1)*3 })
          Object.values(natCount).forEach(n   => { if (n>1) chem += (n-1)*2 })
          chem = Math.min(chem, 50)

          const avgRating = totalRating / playerCount
          const teamStr   = Math.round(avgRating * (250/11) + chem)
          const maxStr    = 2500
          const pct       = Math.min(100, Math.round((teamStr/maxStr)*100))

          lines.push(`📊 *Team Strength: ${teamStr}*  (${pct}% max)`)
          if (mismatches > 0) lines.push(`⚠️ ${mismatches} position mismatch${mismatches>1?'es':''} — ratings reduced 30%`)
          lines.push(`👥 ${playerCount}/11 slots filled`)
        } else {
          lines.push(`_No players set. Visit the dashboard to set your formation._`)
        }

        lines.push(`\n_Set formation via dashboard or *.fcard view <n>*_`)
        return reply(lines.join('\n'))
      }

      // ── .fcard release <n> ──────────────────────────────────────────
      if (sub === 'release') {
        if (!rest) return reply('Usage: *.fcard release <player name>*')
        const confirmMatch = rest.match(/^confirm\s+(.+)/i)
        if (confirmMatch) {
          const name = confirmMatch[1].trim()
          const res  = await api.getCards('football').catch(() => null)
          const card = (res?.cards||[]).find(c => c.name.toLowerCase() === name.toLowerCase())
          if (!card) return reply(`❌ Card not found: *"${name}"*`)
          const releaseRes = await api.releaseCard(card.user_card_id).catch(() => null)
          if (!releaseRes?.ok) return reply(`❌ Release failed: ${releaseRes?.error||'error'}`)
          return reply(`✅ *Released!*\n\n${RARITY_COLOR[card.rarity]||'⚽'} *${card.name}*\n💰 Received: *${releaseRes.coins_earned}${FC}*\nBalance: ${releaseRes.new_balance}${FC}`)
        }
        const res  = await api.getCards('football').catch(() => null)
        const card = (res?.cards||[]).find(c => c.name.toLowerCase().includes(rest.toLowerCase()))
        if (!card) return reply(`❌ No card matching *"${rest}"*\n\nCheck *.fcard list*`)
        const primaryPos = (card.positions||card.position||'?').split(',')[0].trim()
        return reply(
          `⚠️ *Release Confirmation*\n\n` +
          `${RARITY_COLOR[card.rarity]||'⚽'} *${card.name}*  [${primaryPos}]  ${stars(card.stars||0)}\n` +
          `📊 Rating: ${card.rating||0}/130\n` +
          `💰 You will receive: *${card.release_price||0}${FC}*\n\n` +
          `Confirm: *.fcard release confirm ${card.name}*\n_This cannot be undone!_`
        )
      }

      // ── .fcard market ─────────────────────────────────────────────────
      if (sub === 'market') {
        const res      = await api.getMarket('football').catch(() => null)
        const listings = res?.listings || []
        if (!listings.length) return reply(`🏪 *Football Marketplace*\n\nNo listings right now.\n\n_List yours: .fcard release <n>_`)
        const lines = [`🏪 *Football Marketplace*\n`]
        listings.slice(0,12).forEach((l,i) => {
          const primaryPos = (l.position||'?').split(',')[0].trim()
          lines.push(`${i+1}. ${RARITY_COLOR[l.rarity]||'⚽'} *${l.card_name}*  [${primaryPos}]  ${stars(l.stars||0)}`)
          lines.push(`   ${RARITY_LABEL[l.rarity]||l.rarity}  ·  📊 ${l.rating||0}/130  ·  💰 *${l.price}${FC}*`)
        })
        lines.push(`\n_Buy: .fcard buy <#number>_`)
        return reply(lines.join('\n'))
      }

      // ── .fcard buy <#n> ────────────────────────────────────────────
      if (sub === 'buy') {
        const n = parseInt(rest)
        if (isNaN(n)||n<1) return reply('Usage: *.fcard buy <#>*\nSee: *.fcard market*')
        const res     = await api.getMarket('football').catch(() => null)
        const listing = (res?.listings||[])[n-1]
        if (!listing) return reply(`❌ No listing #${n}. See *.fcard market*`)
        const buyRes  = await api.buyCard(listing.id).catch(() => null)
        if (!buyRes?.ok) return reply(`❌ Purchase failed: ${buyRes?.error||'Not enough coins?'}`)
        return reply(`✅ *Purchased!*\n\n${RARITY_COLOR[listing.rarity]||'⚽'} *${listing.card_name}* is now yours!\n💰 Balance: *${buyRes.new_balance}${FC}*`)
      }

      // ── .fcard showcase ───────────────────────────────────────────────
      if (sub === 'showcase') {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null
        const res    = await api.getShowcase(mentioned, 'football').catch(() => null)
        const cards  = res?.showcase || []
        const owner  = mentioned ? mentioned.split('@')[0] : 'Your'
        if (!cards.length) return reply(`📋 *${owner==='Your'?'Your':owner+"'s"} Showcase*\n\nNot set yet!\n\n_Set via the dashboard_`)
        const lines  = [`📋 *${owner==='Your'?'Your':owner+"'s"} Football Showcase*\n`]
        cards.forEach((c, i) => {
          const primaryPos = (c.positions||c.position||'?').split(',')[0].trim()
          lines.push(`${i+1}. ${RARITY_COLOR[c.rarity]||'⚽'} *${c.name}*  [${primaryPos}]  ${stars(c.stars||0)}  📊 ${c.rating||0}/130`)
        })
        return reply(lines.join('\n'))
      }

      return reply(
        `⚽ *Football Cards — Commands*\n\n` +
        `*.fcard list* — Your collection\n` +
        `*.fcard view <n>* — Player details + image\n` +
        `*.fcard packs* — Available packs\n` +
        `*.fcard spin <pack>* — Spin 1×\n` +
        `*.fcard spin10 <pack>* — Spin 10×\n` +
        `*.fcard formation* — View your team\n` +
        `*.fcard release <n>* — Sell card\n` +
        `*.fcard market* — Marketplace\n` +
        `*.fcard buy <#>* — Buy from market\n` +
        `*.fcard showcase* — View showcase`
      )
    }
  }
]
