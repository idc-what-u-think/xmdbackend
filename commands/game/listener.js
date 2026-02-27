import { handleGameMessage as handleWCG } from './wcg.js'
import { activeSessions } from './games.js'

const handleGameMessage = async (sock, msg, ctx) => {
  if (ctx.fromMe) return
  if (ctx.isCmd) return

  await handleWCG(sock, msg, ctx)

  const triviaSession = activeSessions.get(ctx.from)

  if (triviaSession && (triviaSession.type === 'trivia' || triviaSession.type === 'riddle')) {
    const answer = ctx.body?.trim().toLowerCase()
    const expected = triviaSession.answer.toLowerCase()

    const correct = answer === expected || answer.includes(expected) || expected.includes(answer)
    if (!correct) return

    activeSessions.delete(ctx.from)

    const isTrivia = triviaSession.type === 'trivia'

    await sock.sendMessage(ctx.from, {
      text: [
        `🎉 *CORRECT!* @${ctx.senderNumber}`,
        ``,
        `✅ Answer: *${expected.toUpperCase()}*`,
        ``,
        isTrivia ? `_Start another: ${ctx.prefix}trivia_` : `_Start another: ${ctx.prefix}riddle_`
      ].join('\n'),
      mentions: [ctx.sender]
    })
  }
}

export default { onMessage: handleGameMessage }
