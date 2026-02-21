// commands/game/listener.js
// Unified game message listener
//
// Wire into handler.js:
//
//   import { handleGameMessage } from '../commands/game/listener.js'
//
//   // Inside handleMessage(), BEFORE the "if (!ctx.isCmd)" return:
//   await handleGameMessage(sock, msg, ctx)
//   if (!ctx.isCmd || !ctx.command) return
//
// This single import handles ALL game plain-text responses:
//   - WCG word submissions
//   - Trivia answers
//   - Riddle answers

import { handleGameMessage as handleWCG } from './wcg.js'
import { activeSessions } from './games.js'

export const handleGameMessage = async (sock, msg, ctx) => {
  if (ctx.fromMe) return
  if (ctx.isCmd)  return  // skip commands — only handle plain text

  // ── WCG word submissions ───────────────────────────────
  await handleWCG(sock, msg, ctx)

  // ── Trivia / Riddle answers ────────────────────────────
  const triviaSession = activeSessions.get(ctx.from)

  if (triviaSession && (triviaSession.type === 'trivia' || triviaSession.type === 'riddle')) {
    const answer   = ctx.body?.trim().toLowerCase()
    const expected = triviaSession.answer.toLowerCase()

    // Accept close answers (includes check for partial match on multi-word answers)
    const correct = answer === expected ||
                    answer.includes(expected) ||
                    expected.includes(answer)

    if (!correct) return  // not an answer attempt, ignore

    // Correct!
    activeSessions.delete(ctx.from)

    const isTrivia = triviaSession.type === 'trivia'

    await sock.sendMessage(ctx.from, {
      text: [
        `🎉 *CORRECT!* @${ctx.senderNumber}`,
        ``,
        `✅ Answer: *${expected.toUpperCase()}*`,
        ``,
        isTrivia
          ? `_Start another: ${ctx.prefix}trivia_`
          : `_Start another: ${ctx.prefix}riddle_`
      ].join('\n'),
      mentions: [ctx.sender]
    })
  }

  // ── Number guess is handled per-user (in command itself) ──
  // No listener needed — uses ctx.prefix + guess command
}
