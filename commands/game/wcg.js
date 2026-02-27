export const activeGames = new Map()

const TURN_TIMEOUT_MS = 20_000
const MIN_PLAYERS = 2
const MAX_PLAYERS = 10
const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

const SEED_WORDS = [
  'apple', 'bridge', 'cloud', 'dragon', 'eagle', 'flame', 'grace',
  'house', 'island', 'jungle', 'knight', 'light', 'magic', 'night',
  'ocean', 'prince', 'queen', 'river', 'stone', 'tiger', 'umbrella',
  'violet', 'winter', 'yellow', 'forest', 'mountain', 'thunder',
  'silver', 'golden', 'shadow', 'crystal', 'spirit', 'breeze'
]

const randomSeed = () => SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)]

const isRealWord = async (word) => {
  try {
    const res = await fetch(`${DICTIONARY_URL}${word.toLowerCase()}`, { signal: AbortSignal.timeout(5000) })
    return res.status === 200
  } catch {
    return true
  }
}

const clearTimer = (jid) => {
  const game = activeGames.get(jid)
  if (game?.timer) { clearTimeout(game.timer); game.timer = null }
}

const startTimer = (sock, jid) => {
  clearTimer(jid)
  const game = activeGames.get(jid)
  if (!game) return

  game.timer = setTimeout(async () => {
    const g = activeGames.get(jid)
    if (!g) return

    const timedOutPlayer = g.players[g.turnIndex]
    const name = g.names[timedOutPlayer] || timedOutPlayer.split('@')[0]

    g.players.splice(g.turnIndex, 1)
    delete g.names[timedOutPlayer]

    if (g.players.length < 2) {
      const winner = g.players[0]
      const winnerName = winner ? (g.names[winner] || winner.split('@')[0]) : 'Nobody'
      await sock.sendMessage(jid, {
        text: [`⏰ @${name} took too long and got *eliminated!*`, ``, `🏆 *GAME OVER!*`, ``, winner ? `👑 @${winnerName} wins the Word Chain Game! 🎉` : `No winner — everyone was eliminated!`].join('\n'),
        mentions: [timedOutPlayer, winner].filter(Boolean)
      })
      activeGames.delete(jid)
      return
    }

    if (g.turnIndex >= g.players.length) g.turnIndex = 0
    const nextPlayer = g.players[g.turnIndex]
    const nextPlayerName = g.names[nextPlayer] || nextPlayer.split('@')[0]

    await sock.sendMessage(jid, {
      text: [`⏰ @${name} took too long! *Eliminated!*`, ``, `🔤 Word: *${g.currentWord.toUpperCase()}*`, `➡️  Next letter: *${g.currentLetter.toUpperCase()}*`, ``, `@${nextPlayerName} your turn! (20s) ⏱️`].join('\n'),
      mentions: [timedOutPlayer, nextPlayer]
    })
    startTimer(sock, jid)
  }, TURN_TIMEOUT_MS)
}

export const handleGameMessage = async (sock, msg, ctx) => {
  if (!ctx.isGroup) return
  if (ctx.isCmd) return
  if (ctx.fromMe) return

  const game = activeGames.get(ctx.from)
  if (!game || game.status !== 'playing') return

  const currentPlayer = game.players[game.turnIndex]
  if (ctx.sender !== currentPlayer) return

  const word = ctx.body?.trim().toLowerCase()
  if (!word || word.includes(' ')) return

  if (word[0] !== game.currentLetter) {
    return sock.sendMessage(ctx.from, { text: `❌ *${word.toUpperCase()}* doesn't start with *${game.currentLetter.toUpperCase()}*! Try again...` })
  }

  if (game.usedWords.has(word)) {
    return sock.sendMessage(ctx.from, { text: `❌ *${word.toUpperCase()}* was already used! Try a different word.` })
  }

  const isValid = await isRealWord(word)
  if (!isValid) {
    return sock.sendMessage(ctx.from, { text: `❌ *${word.toUpperCase()}* is not a valid English word! Try again.` })
  }

  clearTimer(ctx.from)
  game.usedWords.add(word)
  game.currentWord = word
  game.currentLetter = word[word.length - 1]
  game.turnIndex = (game.turnIndex + 1) % game.players.length
  game.round++

  const nextPlayer = game.players[game.turnIndex]
  const nextPlayerName = game.names[nextPlayer] || nextPlayer.split('@')[0]
  const playerName = game.names[currentPlayer] || currentPlayer.split('@')[0]

  // React with ✅ on the correct word message
  await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })

  // Wait 3 seconds before sending the next turn prompt
  await new Promise(r => setTimeout(r, 3000))

  await sock.sendMessage(ctx.from, {
    text: [`✅ *${word.toUpperCase()}* — @${playerName}`, ``, `➡️  Next letter: *${game.currentLetter.toUpperCase()}*`, `👤 @${nextPlayerName} your turn! (20s) ⏱️`, ``, `_Round ${game.round} | Words used: ${game.usedWords.size}_`].join('\n'),
    mentions: [currentPlayer, nextPlayer]
  })
  startTimer(sock, ctx.from)
}

export default [
  {
    command: 'wcg',
    aliases: ['wordchain', 'wc'],
    category: 'game',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const sub = ctx.args[0]?.toLowerCase() || 'help'
      const game = activeGames.get(ctx.from)

      if (sub === 'help' || !sub) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🔤 *Word Chain Game (WCG)*`, `${'─'.repeat(30)}`, ``,
            `Chain words by the last letter of the previous word!`, ``,
            `*Commands:*`,
            `${ctx.prefix}wcg join     — Join the game`,
            `${ctx.prefix}wcg start    — Start (2+ players)`,
            `${ctx.prefix}wcg stop     — End the game`,
            `${ctx.prefix}wcg skip     — Skip your turn`,
            `${ctx.prefix}wcg players  — See who's in the game`, ``,
            `*Rules:*`,
            `• Type a word starting with the last letter of the previous word`,
            `• No repeated words`,
            `• Must be a real English word`,
            `• 20 seconds per turn or you're eliminated`, ``,
            `_Example: APPLE → ELEPHANT → TIGER → RABBIT_`
          ].join('\n')
        }, { quoted: msg })
      }

      if (sub === 'join') {
        if (!game) {
          activeGames.set(ctx.from, {
            status: 'waiting',
            players: [ctx.sender],
            names: { [ctx.sender]: ctx.pushName || ctx.senderNumber },
            currentWord: null, currentLetter: null, turnIndex: 0,
            usedWords: new Set(), round: 0, timer: null, host: ctx.sender
          })
          return sock.sendMessage(ctx.from, {
            text: [`🎮 *Word Chain Game Created!*`, ``, `@${ctx.senderNumber} started a lobby.`, ``, `Type *${ctx.prefix}wcg join* to join!`, `Type *${ctx.prefix}wcg start* to begin (min ${MIN_PLAYERS} players)`, ``, `_Players: 1/${MAX_PLAYERS}_`].join('\n'),
            mentions: [ctx.sender]
          }, { quoted: msg })
        }
        if (game.status === 'playing') return sock.sendMessage(ctx.from, { text: `❌ A game is already in progress.` }, { quoted: msg })
        if (game.players.includes(ctx.sender)) return sock.sendMessage(ctx.from, { text: `⚠️ You already joined the game!` }, { quoted: msg })
        if (game.players.length >= MAX_PLAYERS) return sock.sendMessage(ctx.from, { text: `❌ Game is full! (${MAX_PLAYERS} players max)` }, { quoted: msg })

        game.players.push(ctx.sender)
        game.names[ctx.sender] = ctx.pushName || ctx.senderNumber

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ @${ctx.senderNumber} joined the game!`, ``,
            `👥 Players (${game.players.length}/${MAX_PLAYERS}):`,
            game.players.map((p, i) => `${i + 1}. @${game.names[p] || p.split('@')[0]}`).join('\n'), ``,
            `_${game.players.length >= MIN_PLAYERS ? `Ready! Type ${ctx.prefix}wcg start` : `Need ${MIN_PLAYERS - game.players.length} more player(s)`}_`
          ].join('\n'),
          mentions: game.players
        }, { quoted: msg })
        return
      }

      if (sub === 'start') {
        if (!game || game.status !== 'waiting') return sock.sendMessage(ctx.from, { text: `❌ No lobby to start. Type ${ctx.prefix}wcg join first.` }, { quoted: msg })
        if (ctx.sender !== game.host && !ctx.isAdmin && !ctx.isOwner) return sock.sendMessage(ctx.from, { text: `❌ Only the game host or group admins can start the game.` }, { quoted: msg })
        if (game.players.length < MIN_PLAYERS) return sock.sendMessage(ctx.from, { text: `❌ Need at least ${MIN_PLAYERS} players. Currently: ${game.players.length}` }, { quoted: msg })

        game.players.sort(() => Math.random() - 0.5)
        game.status = 'playing'
        game.currentWord = randomSeed()
        game.currentLetter = game.currentWord[game.currentWord.length - 1]
        game.turnIndex = 0
        game.usedWords = new Set([game.currentWord])
        game.round = 1

        const firstPlayer = game.players[0]
        const firstPlayerName = game.names[firstPlayer] || firstPlayer.split('@')[0]

        await sock.sendMessage(ctx.from, {
          text: [
            `🎮 *Word Chain Game — START!*`, `${'─'.repeat(30)}`, ``,
            `👥 Players:`,
            game.players.map((p, i) => `${i + 1}. @${game.names[p] || p.split('@')[0]}`).join('\n'), ``,
            `🔤 Starting word: *${game.currentWord.toUpperCase()}*`,
            `➡️  Next letter: *${game.currentLetter.toUpperCase()}*`, ``,
            `@${firstPlayerName} GO FIRST! (20s) ⏱️`, ``,
            `_Just type your word — no command needed!_`
          ].join('\n'),
          mentions: game.players
        }, { quoted: msg })
        startTimer(sock, ctx.from)
        return
      }

      if (sub === 'stop' || sub === 'end') {
        if (!game) return sock.sendMessage(ctx.from, { text: `❌ No active game to stop.` }, { quoted: msg })
        if (ctx.sender !== game.host && !ctx.isAdmin && !ctx.isOwner) return sock.sendMessage(ctx.from, { text: `❌ Only the game host or group admins can stop the game.` }, { quoted: msg })
        clearTimer(ctx.from)
        activeGames.delete(ctx.from)
        await sock.sendMessage(ctx.from, { text: [`🛑 *Word Chain Game stopped.*`, ``, `_Start a new one with ${ctx.prefix}wcg join_`].join('\n') }, { quoted: msg })
        return
      }

      if (sub === 'skip') {
        if (!game || game.status !== 'playing') return sock.sendMessage(ctx.from, { text: `❌ No game in progress.` }, { quoted: msg })
        const currentPlayer = game.players[game.turnIndex]
        if (ctx.sender !== currentPlayer) {
          return sock.sendMessage(ctx.from, {
            text: `❌ It's not your turn! Wait for @${game.names[currentPlayer] || currentPlayer.split('@')[0]}.`,
            mentions: [currentPlayer]
          }, { quoted: msg })
        }
        clearTimer(ctx.from)
        const playerName = game.names[currentPlayer] || currentPlayer.split('@')[0]
        game.players.splice(game.turnIndex, 1)
        delete game.names[currentPlayer]

        if (game.players.length < 2) {
          const winner = game.players[0]
          const winnerName = winner ? (game.names[winner] || winner.split('@')[0]) : 'Nobody'
          await sock.sendMessage(ctx.from, {
            text: [`🏳️ @${playerName} skipped and was *eliminated!*`, ``, `🏆 *GAME OVER!*`, winner ? `👑 @${winnerName} wins! 🎉` : `No winner!`].join('\n'),
            mentions: [currentPlayer, winner].filter(Boolean)
          }, { quoted: msg })
          activeGames.delete(ctx.from)
          return
        }

        if (game.turnIndex >= game.players.length) game.turnIndex = 0
        const nextPlayer = game.players[game.turnIndex]
        const nextPlayerName = game.names[nextPlayer] || nextPlayer.split('@')[0]

        await sock.sendMessage(ctx.from, {
          text: [`🏳️ @${playerName} skipped and was *eliminated!*`, ``, `🔤 Word: *${game.currentWord.toUpperCase()}*`, `➡️  Next letter: *${game.currentLetter.toUpperCase()}*`, ``, `@${nextPlayerName} your turn! (20s) ⏱️`].join('\n'),
          mentions: [currentPlayer, nextPlayer]
        }, { quoted: msg })
        startTimer(sock, ctx.from)
        return
      }

      if (sub === 'players' || sub === 'list') {
        if (!game) return sock.sendMessage(ctx.from, { text: `❌ No active game. Start one with ${ctx.prefix}wcg join` }, { quoted: msg })
        const currentPlayer = game.status === 'playing' ? game.players[game.turnIndex] : null
        const lines = game.players.map((p, i) => {
          const name = game.names[p] || p.split('@')[0]
          return `${i + 1}. @${name}${p === currentPlayer ? ' ⬅️ TURN' : ''}`
        })
        await sock.sendMessage(ctx.from, {
          text: [
            `👥 *WCG Players (${game.players.length})*`,
            `Status: ${game.status === 'playing' ? '🎮 Playing' : '⏳ Waiting'}`, ``,
            ...lines,
            game.status === 'playing' ? `\n🔤 Current word: *${game.currentWord?.toUpperCase()}*` : ''
          ].filter(s => s !== '').join('\n'),
          mentions: game.players
        }, { quoted: msg })
        return
      }

      await sock.sendMessage(ctx.from, { text: `❌ Unknown option. Use: ${ctx.prefix}wcg help` }, { quoted: msg })
    }
  }
]
