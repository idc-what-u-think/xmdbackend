// commands/game/listener.js
// Handles all non-command group messages for active games:
//   - WCG word answers
//   - Trivia / riddle answers
//
// SHARED STATE via globalThis:
//   globalThis._wcgGames  — set by wcg.js commands, read here
//   globalThis._wcgTimer  — startTimer helper, set by wcg.js
//   game sessions for trivia/riddle are in games.js via globalThis._gameSessions

import { activeSessions } from './games.js'
import { startTimer }     from './wcg.js'

const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

const isRealWord = async (word) => {
  try {
    const res = await fetch(`${DICTIONARY_URL}${word.toLowerCase()}`, {
      signal: AbortSignal.timeout(5_000)
    })
    return res.status === 200
  } catch {
    return true
  }
}

const handleWCG = async (sock, msg, ctx) => {
  // Always pull from globalThis — survives module cache-busting
  const activeGames = globalThis._wcgGames
  if (!activeGames) return

  const game = activeGames.get(ctx.from)
  if (!game || game.status !== 'playing') return

  const curr = game.players[game.turnIndex]
  if (ctx.sender !== curr) return

  const word = ctx.body?.trim().toLowerCase()
  if (!word || word.includes(' ')) return

  // Wrong starting letter — silent ignore (player can try again)
  if (word[0] !== game.currentLetter) return

  // Already used — silent ignore
  if (game.usedWords.has(word)) {
    return sock.sendMessage(ctx.from, {
      text: `♻️ *${word.toUpperCase()}* was already used! Try a different word.`
    })
  }

  // React with ⏳ while we check the dictionary
  await sock.sendMessage(ctx.from, { react: { text: '⏳', key: msg.key } })

  const isValid = await isRealWord(word)

  if (!isValid) {
    await sock.sendMessage(ctx.from, { react: { text: '❌', key: msg.key } })
    return
  }

  // ── Correct answer ──────────────────────────────────────────────────
  // Stop the timeout timer
  if (game.timer) { clearTimeout(game.timer); game.timer = null }

  game.usedWords.add(word)
  game.currentWord   = word
  game.currentLetter = word[word.length - 1]
  game.turnIndex     = (game.turnIndex + 1) % game.players.length
  game.round++

  const prevPlayer = curr
  const prevName   = game.names[prevPlayer] || prevPlayer.split('@')[0]
  const nextPlayer = game.players[game.turnIndex]
  const nextName   = game.names[nextPlayer] || nextPlayer.split('@')[0]

  // React ✅ on correct word
  await sock.sendMessage(ctx.from, { react: { text: '✅', key: msg.key } })

  // 3 second pause before next turn prompt
  await new Promise(r => setTimeout(r, 3_000))

  await sock.sendMessage(ctx.from, {
    text: [
      `✅ *${word.toUpperCase()}* — @${prevName}`, ``,
      `➡️  Next letter: *${game.currentLetter.toUpperCase()}*`,
      `👤 @${nextName} your turn! (20s) ⏱️`, ``,
      `_Round ${game.round} | Words used: ${game.usedWords.size}_`
    ].join('\n'),
    mentions: [prevPlayer, nextPlayer],
  })

  startTimer(sock, ctx.from)
}

const handleTriviaRiddle = async (sock, msg, ctx) => {
  const triviaSession = activeSessions.get(ctx.from)
  if (!triviaSession) return
  if (triviaSession.type !== 'trivia' && triviaSession.type !== 'riddle') return

  const answer   = ctx.body?.trim().toLowerCase()
  const expected = triviaSession.answer.toLowerCase()
  const correct  = answer === expected || answer.includes(expected) || expected.includes(answer)
  if (!correct) return

  activeSessions.delete(ctx.from)
  const isTrivia = triviaSession.type === 'trivia'

  await sock.sendMessage(ctx.from, {
    text: [
      `🎉 *CORRECT!* @${ctx.senderNumber}`, ``,
      `✅ Answer: *${expected.toUpperCase()}*`, ``,
      isTrivia
        ? `_Start another: ${ctx.prefix}trivia_`
        : `_Start another: ${ctx.prefix}riddle_`
    ].join('\n'),
    mentions: [ctx.sender],
  })
}

const handleGameMessage = async (sock, msg, ctx) => {
  if (ctx.fromMe)  return
  if (ctx.isCmd)   return
  if (!ctx.isGroup) return

  await handleWCG(sock, msg, ctx)
  await handleTriviaRiddle(sock, msg, ctx)
}

export default { onMessage: handleGameMessage }
