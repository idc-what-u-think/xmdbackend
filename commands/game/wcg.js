// commands/game/wcg.js
// Word Chain Game — commands only
//
// SHARED STATE via globalThis._wcgGames:
//   The loader imports every file with ?v=timestamp (cache-busting), which means
//   listener.js and wcg.js get DIFFERENT module instances even if one imports from
//   the other. So we can't share state via ESM imports. Using globalThis instead,
//   which is always the same object in the same Node.js process.

if (!globalThis._wcgGames) globalThis._wcgGames = new Map()
const activeGames = globalThis._wcgGames

// ── Timer escalation ──────────────────────────────────────────────────────────
// Rounds 1–3:  20s
// Rounds 4–6:  15s
// Rounds 7–9:  10s  (+ 35% chance second-to-last letter)
// Round  10+:   7s  (+ 35% chance second-to-last letter) — floor, never goes lower
const getTurnTimeout = (round) => {
  if (round <= 3) return 20_000
  if (round <= 6) return 15_000
  if (round <= 9) return 10_000
  return 7_000
}

const getTurnTimeoutLabel = (round) => {
  if (round <= 3) return '20s'
  if (round <= 6) return '15s'
  if (round <= 9) return '10s'
  return '7s'
}

// ── Letter selection ──────────────────────────────────────────────────────────
// At round 7+ (10s and 7s tiers), 35% chance the required letter is the
// second-to-last letter of the current word instead of the last.
// Falls back to last letter if word is only 1 character.
export const getNextLetter = (word, round) => {
  if (round >= 7 && word.length >= 2 && Math.random() < 0.35) {
    return word[word.length - 2]
  }
  return word[word.length - 1]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MIN_PLAYERS     = 2
const MAX_PLAYERS     = 10
const DICTIONARY_URL  = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

const SEED_WORDS = [
  'apple', 'bridge', 'cloud', 'dragon', 'eagle', 'flame', 'grace',
  'house', 'island', 'jungle', 'knight', 'light', 'magic', 'night',
  'ocean', 'prince', 'queen', 'river', 'stone', 'tiger', 'umbrella',
  'violet', 'winter', 'yellow', 'forest', 'mountain', 'thunder',
  'silver', 'golden', 'shadow', 'crystal', 'spirit', 'breeze',
]
const randomSeed = () => SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)]

const isRealWord = async (word) => {
  try {
    const res = await fetch(`${DICTIONARY_URL}${word.toLowerCase()}`, {
      signal: AbortSignal.timeout(5_000)
    })
    return res.status === 200
  } catch {
    return true // fail open so network errors don't break the game
  }
}

const clearTimer = (jid) => {
  const game = activeGames.get(jid)
  if (game?.timer) { clearTimeout(game.timer); game.timer = null }
}

export const startTimer = (sock, jid) => {
  clearTimer(jid)
  const game = activeGames.get(jid)
  if (!game) return

  const timeoutMs = getTurnTimeout(game.round)

  game.timer = setTimeout(async () => {
    const g = activeGames.get(jid)
    if (!g) return

    const timedOut = g.players[g.turnIndex]
    const name     = g.names[timedOut] || timedOut.split('@')[0]

    g.players.splice(g.turnIndex, 1)
    delete g.names[timedOut]

    if (g.players.length < 2) {
      const winner     = g.players[0]
      const winnerName = winner ? (g.names[winner] || winner.split('@')[0]) : 'Nobody'
      await sock.sendMessage(jid, {
        text: [
          `⏰ @${name} took too long — *eliminated!*`, ``,
          `🏆 *GAME OVER!*`, ``,
          winner
            ? `👑 @${winnerName} wins the Word Chain Game! 🎉`
            : `No winner — everyone was eliminated!`
        ].join('\n'),
        mentions: [timedOut, winner].filter(Boolean),
      })
      activeGames.delete(jid)
      return
    }

    if (g.turnIndex >= g.players.length) g.turnIndex = 0
    const next     = g.players[g.turnIndex]
    const nextName = g.names[next] || next.split('@')[0]
    const timeLabel = getTurnTimeoutLabel(g.round)

    await sock.sendMessage(jid, {
      text: [
        `⏰ @${name} took too long! *Eliminated!*`, ``,
        `🔤 Last word: *${g.currentWord.toUpperCase()}*`,
        `➡️  Next letter: *${g.currentLetter.toUpperCase()}*`, ``,
        `@${nextName} your turn! (${timeLabel}) ⏱️`
      ].join('\n'),
      mentions: [timedOut, next],
    })
    startTimer(sock, jid)
  }, timeoutMs)
}

export default [
  {
    command: 'wcg',
    aliases: ['wordchain', 'wc'],
    category: 'game',
    groupOnly: true,
    handler: async (sock, msg, ctx) => {
      const sub  = ctx.args[0]?.toLowerCase() || 'help'
      const game = activeGames.get(ctx.from)

      // ── Help ───────────────────────────────────────────────────────
      if (sub === 'help' || !sub) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🔤 *Word Chain Game (WCG)*`, `${'─'.repeat(30)}`, ``,
            `Chain words by the last letter of the previous word!`, ``,
            `*Commands:*`,
            `${ctx.prefix}wcg join     — Join the game`,
            `${ctx.prefix}wcg start    — Start (2+ players)`,
            `${ctx.prefix}wcg stop     — End the game`,
            `${ctx.prefix}wcg skip     — Skip your turn (you get eliminated)`,
            `${ctx.prefix}wcg players  — See who's in the game`, ``,
            `*Rules:*`,
            `• Type a word starting with the last letter of the previous word`,
            `• No repeated words`,
            `• Must be a real English word`,
            `• Timer: 20s (R1-3) → 15s (R4-6) → 10s (R7-9) → 7s (R10+)`,
            `• At round 7+: 35% chance the required letter is second-to-last!`, ``,
            `_Example: APPLE → ELEPHANT → TIGER → RABBIT_`
          ].join('\n')
        }, { quoted: msg })
      }

      // ── Join ───────────────────────────────────────────────────────
      if (sub === 'join') {
        if (!game) {
          activeGames.set(ctx.from, {
            status: 'waiting',
            players: [ctx.sender],
            names: { [ctx.sender]: ctx.pushName || ctx.senderNumber },
            currentWord: null, currentLetter: null, turnIndex: 0,
            usedWords: new Set(), round: 0, timer: null, host: ctx.sender,
          })
          return sock.sendMessage(ctx.from, {
            text: [
              `🎮 *Word Chain Game Created!*`, ``,
              `@${ctx.senderNumber} started a lobby.`, ``,
              `Type *${ctx.prefix}wcg join* to join!`,
              `Type *${ctx.prefix}wcg start* to begin (min ${MIN_PLAYERS} players)`, ``,
              `_Players: 1/${MAX_PLAYERS}_`
            ].join('\n'),
            mentions: [ctx.sender],
          }, { quoted: msg })
        }

        if (game.status === 'playing')
          return sock.sendMessage(ctx.from, { text: `❌ A game is already in progress.` }, { quoted: msg })
        if (game.players.includes(ctx.sender))
          return sock.sendMessage(ctx.from, { text: `⚠️ You already joined!` }, { quoted: msg })
        if (game.players.length >= MAX_PLAYERS)
          return sock.sendMessage(ctx.from, { text: `❌ Game is full! (${MAX_PLAYERS} max)` }, { quoted: msg })

        game.players.push(ctx.sender)
        game.names[ctx.sender] = ctx.pushName || ctx.senderNumber

        return sock.sendMessage(ctx.from, {
          text: [
            `✅ @${ctx.senderNumber} joined!`, ``,
            `👥 Players (${game.players.length}/${MAX_PLAYERS}):`,
            game.players.map((p, i) => `${i + 1}. @${game.names[p] || p.split('@')[0]}`).join('\n'), ``,
            `_${game.players.length >= MIN_PLAYERS
              ? `Ready! Type ${ctx.prefix}wcg start`
              : `Need ${MIN_PLAYERS - game.players.length} more player(s)`}_`
          ].join('\n'),
          mentions: game.players,
        }, { quoted: msg })
      }

      // ── Start ──────────────────────────────────────────────────────
      if (sub === 'start') {
        if (!game || game.status !== 'waiting')
          return sock.sendMessage(ctx.from, { text: `❌ No lobby. Type ${ctx.prefix}wcg join first.` }, { quoted: msg })
        if (ctx.sender !== game.host && !ctx.isAdmin && !ctx.isOwner)
          return sock.sendMessage(ctx.from, { text: `❌ Only the game host or admins can start.` }, { quoted: msg })
        if (game.players.length < MIN_PLAYERS)
          return sock.sendMessage(ctx.from, { text: `❌ Need at least ${MIN_PLAYERS} players. Currently: ${game.players.length}` }, { quoted: msg })

        game.players.sort(() => Math.random() - 0.5)
        game.status        = 'playing'
        game.currentWord   = randomSeed()
        game.round         = 1
        game.currentLetter = getNextLetter(game.currentWord, game.round)
        game.turnIndex     = 0
        game.usedWords     = new Set([game.currentWord])

        const first     = game.players[0]
        const firstName = game.names[first] || first.split('@')[0]
        const timeLabel = getTurnTimeoutLabel(game.round)

        await sock.sendMessage(ctx.from, {
          text: [
            `🎮 *Word Chain Game — START!*`, `${'─'.repeat(30)}`, ``,
            `👥 Players:`,
            game.players.map((p, i) => `${i + 1}. @${game.names[p] || p.split('@')[0]}`).join('\n'), ``,
            `🔤 Starting word: *${game.currentWord.toUpperCase()}*`,
            `➡️  Next letter: *${game.currentLetter.toUpperCase()}*`, ``,
            `@${firstName} GO FIRST! (${timeLabel}) ⏱️`, ``,
            `_Just type your word — no command needed!_`
          ].join('\n'),
          mentions: game.players,
        }, { quoted: msg })
        startTimer(sock, ctx.from)
        return
      }

      // ── Stop ───────────────────────────────────────────────────────
      if (sub === 'stop' || sub === 'end') {
        if (!game)
          return sock.sendMessage(ctx.from, { text: `❌ No active game.` }, { quoted: msg })
        if (ctx.sender !== game.host && !ctx.isAdmin && !ctx.isOwner)
          return sock.sendMessage(ctx.from, { text: `❌ Only the game host or admins can stop the game.` }, { quoted: msg })
        clearTimer(ctx.from)
        activeGames.delete(ctx.from)
        return sock.sendMessage(ctx.from, {
          text: [`🛑 *Word Chain Game stopped.*`, ``, `_Start a new one with ${ctx.prefix}wcg join_`].join('\n')
        }, { quoted: msg })
      }

      // ── Skip ───────────────────────────────────────────────────────
      if (sub === 'skip') {
        if (!game || game.status !== 'playing')
          return sock.sendMessage(ctx.from, { text: `❌ No game in progress.` }, { quoted: msg })

        const curr     = game.players[game.turnIndex]
        const currName = game.names[curr] || curr.split('@')[0]

        if (ctx.sender !== curr) {
          return sock.sendMessage(ctx.from, {
            text: `❌ It's not your turn! Wait for @${currName}.`,
            mentions: [curr],
          }, { quoted: msg })
        }

        clearTimer(ctx.from)
        game.players.splice(game.turnIndex, 1)
        delete game.names[curr]

        if (game.players.length < 2) {
          const winner     = game.players[0]
          const winnerName = winner ? (game.names[winner] || winner.split('@')[0]) : 'Nobody'
          await sock.sendMessage(ctx.from, {
            text: [
              `🏳️ @${currName} skipped — *eliminated!*`, ``,
              `🏆 *GAME OVER!*`,
              winner ? `👑 @${winnerName} wins! 🎉` : `No winner!`
            ].join('\n'),
            mentions: [curr, winner].filter(Boolean),
          }, { quoted: msg })
          activeGames.delete(ctx.from)
          return
        }

        if (game.turnIndex >= game.players.length) game.turnIndex = 0
        const next      = game.players[game.turnIndex]
        const nextName  = game.names[next] || next.split('@')[0]
        const timeLabel = getTurnTimeoutLabel(game.round)

        await sock.sendMessage(ctx.from, {
          text: [
            `🏳️ @${currName} skipped — *eliminated!*`, ``,
            `🔤 Last word: *${game.currentWord.toUpperCase()}*`,
            `➡️  Next letter: *${game.currentLetter.toUpperCase()}*`, ``,
            `@${nextName} your turn! (${timeLabel}) ⏱️`
          ].join('\n'),
          mentions: [curr, next],
        }, { quoted: msg })
        startTimer(sock, ctx.from)
        return
      }

      // ── Players ────────────────────────────────────────────────────
      if (sub === 'players' || sub === 'list') {
        if (!game)
          return sock.sendMessage(ctx.from, { text: `❌ No active game. Start one with ${ctx.prefix}wcg join` }, { quoted: msg })

        const curr  = game.status === 'playing' ? game.players[game.turnIndex] : null
        const lines = game.players.map((p, i) => {
          const name = game.names[p] || p.split('@')[0]
          return `${i + 1}. @${name}${p === curr ? ' ⬅️ TURN' : ''}`
        })

        const timeLabel = game.status === 'playing' ? getTurnTimeoutLabel(game.round) : '20s'

        return sock.sendMessage(ctx.from, {
          text: [
            `👥 *WCG Players (${game.players.length})*`,
            `Status: ${game.status === 'playing' ? '🎮 Playing' : '⏳ Waiting'}`,
            game.status === 'playing' ? `⏱️ Timer: ${timeLabel} | Round: ${game.round}` : '',
            ``,
            ...lines,
            game.status === 'playing' ? `\n🔤 Current word: *${game.currentWord?.toUpperCase()}*` : '',
          ].filter(s => s !== '').join('\n'),
          mentions: game.players,
        }, { quoted: msg })
      }

      return sock.sendMessage(ctx.from, { text: `❌ Unknown option. Use: ${ctx.prefix}wcg help` }, { quoted: msg })
    },
  },
]
