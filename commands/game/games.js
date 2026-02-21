// commands/game/games.js
// Commands: .truth | .dare | .8ball | .rps | .dice | .coinflip | .trivia | .riddle | .guess

// ── Active trivia/riddle sessions ─────────────────────────
// Key = ctx.from (chat JID)
// Value = { type, answer, hint, askedAt, askerJid }
export const activeSessions = new Map()

// ── Truth questions ───────────────────────────────────────
const TRUTHS = [
  "What is your biggest fear?",
  "What is the most embarrassing thing you've ever done?",
  "Have you ever lied to your best friend? What about?",
  "What's the weirdest dream you've ever had?",
  "What's your biggest insecurity?",
  "Have you ever cheated on a test or game?",
  "What's the most childish thing you still do?",
  "Who was your first crush?",
  "What's the worst thing you've ever said to someone?",
  "Have you ever been caught doing something embarrassing?",
  "What's a secret you've never told anyone here?",
  "What's the most money you've ever wasted?",
  "Have you ever betrayed a friend's trust?",
  "What's something you pretend to like but actually hate?",
  "What's the most selfish thing you've ever done?",
  "If you could change one thing about yourself, what would it be?",
  "What's your biggest regret?",
  "Have you ever stolen something?",
  "What do you do when nobody's watching?",
  "What's the most embarrassing thing on your phone right now?",
  "What's the pettiest reason you've ever unfollowed or blocked someone?",
  "What's something you pretend to understand but actually don't?",
  "What's the longest you've gone without showering?",
  "Have you ever pretended to be busy to avoid someone?",
  "What's a habit you have that most people would find strange?"
]

// ── Dares ─────────────────────────────────────────────────
const DARES = [
  "Send a voice note singing a song for 10 seconds.",
  "Change your WhatsApp status to something embarrassing for 1 hour.",
  "Send a GIF that describes your personality.",
  "Tag 3 people and say something nice about each of them.",
  "Send a thumbs-up to the last person you texted.",
  "Tell a joke — it must make someone laugh.",
  "Send your best impression of a celebrity in a voice note.",
  "Change your profile picture to a funny face for 30 minutes.",
  "Send a voice note in the most dramatic voice you can.",
  "Type the next 10 messages using only emojis.",
  "Send a voice note saying 'I love this group' 5 times fast.",
  "Confess something embarrassing to the group right now.",
  "Do your best impression of the last person who messaged you.",
  "Send a picture of whatever is directly to your left.",
  "Tell the group a funny story from your childhood.",
  "Write a 2-sentence love letter and send it to the group.",
  "Send a voice note of you beatboxing for 15 seconds.",
  "Say something nice to every active member of this group.",
  "Send the 10th photo in your gallery right now.",
  "Call someone 'bestie' in every message for the next 10 minutes."
]

// ── 8ball responses ───────────────────────────────────────
const EIGHTBALL = [
  // Positive
  "✅ It is certain.",
  "✅ It is decidedly so.",
  "✅ Without a doubt.",
  "✅ Yes, definitely.",
  "✅ You may rely on it.",
  "✅ As I see it, yes.",
  "✅ Most likely.",
  "✅ Outlook good.",
  "✅ Yes.",
  "✅ Signs point to yes.",
  // Neutral
  "🤔 Reply hazy, try again.",
  "🤔 Ask again later.",
  "🤔 Better not tell you now.",
  "🤔 Cannot predict now.",
  "🤔 Concentrate and ask again.",
  // Negative
  "❌ Don't count on it.",
  "❌ My reply is no.",
  "❌ My sources say no.",
  "❌ Outlook not so good.",
  "❌ Very doubtful."
]

// ── Trivia questions ──────────────────────────────────────
const TRIVIA = [
  { q: "What is the capital of Australia?", a: "canberra", hint: "It starts with C" },
  { q: "How many sides does a hexagon have?", a: "6", hint: "It's a single digit number" },
  { q: "What is the largest ocean on Earth?", a: "pacific", hint: "It covers more than a third of Earth" },
  { q: "Who wrote Romeo and Juliet?", a: "shakespeare", hint: "William ________" },
  { q: "What is the chemical symbol for gold?", a: "au", hint: "2 letters, from its Latin name" },
  { q: "How many bones are in the adult human body?", a: "206", hint: "Between 200 and 210" },
  { q: "What is the smallest planet in our solar system?", a: "mercury", hint: "Named after a Roman god" },
  { q: "In what year did World War II end?", a: "1945", hint: "Mid-1940s" },
  { q: "What language has the most native speakers in the world?", a: "mandarin", hint: "Asian language" },
  { q: "What is the hardest natural substance on Earth?", a: "diamond", hint: "Also very valuable" },
  { q: "How many continents are there on Earth?", a: "7", hint: "Single digit" },
  { q: "What is the longest river in the world?", a: "nile", hint: "Located in Africa" },
  { q: "What gas do plants absorb from the atmosphere?", a: "carbon dioxide", hint: "CO2" },
  { q: "What is the speed of light (approx km/s)?", a: "300000", hint: "300,000 km/s" },
  { q: "What is the largest mammal in the world?", a: "blue whale", hint: "Lives in the ocean" },
  { q: "How many days are in a leap year?", a: "366", hint: "One more than usual" },
  { q: "What country is the Eiffel Tower in?", a: "france", hint: "European country, starts with F" },
  { q: "What is the currency of Japan?", a: "yen", hint: "3 letters" },
  { q: "What planet is known as the Red Planet?", a: "mars", hint: "4th from the sun" },
  { q: "How many strings does a standard guitar have?", a: "6", hint: "Single digit, less than 10" },
  { q: "What is the tallest mountain in the world?", a: "everest", hint: "Located in the Himalayas" },
  { q: "What animal is the fastest on land?", a: "cheetah", hint: "A big cat" },
  { q: "What is the most spoken language in Nigeria?", a: "yoruba", hint: "South-west Nigeria" },
  { q: "What is 12 × 12?", a: "144", hint: "A perfect square number" },
  { q: "What is the freezing point of water in Celsius?", a: "0", hint: "Zero" }
]

// ── Riddles ───────────────────────────────────────────────
const RIDDLES = [
  { q: "I speak without a mouth and hear without ears. What am I?", a: "echo", hint: "A sound phenomenon" },
  { q: "The more you take, the more you leave behind. What am I?", a: "footsteps", hint: "You make them when you walk" },
  { q: "I have cities but no houses, mountains but no trees, water but no fish. What am I?", a: "map", hint: "Used for navigation" },
  { q: "What has hands but can't clap?", a: "clock", hint: "It tells time" },
  { q: "I'm light as a feather, but even the strongest man can't hold me for more than 5 minutes. What am I?", a: "breath", hint: "You do it to stay alive" },
  { q: "What gets wetter as it dries?", a: "towel", hint: "Used after bathing" },
  { q: "I have keys but no locks. I have space but no room. You can enter but can't go inside. What am I?", a: "keyboard", hint: "You type on me" },
  { q: "What has a head and a tail but no body?", a: "coin", hint: "Used as money" },
  { q: "What can you catch but not throw?", a: "cold", hint: "An illness" },
  { q: "The more you have of it, the less you see. What is it?", a: "darkness", hint: "Opposite of light" },
  { q: "What goes up but never comes down?", a: "age", hint: "It increases every year" },
  { q: "What has teeth but cannot bite?", a: "comb", hint: "Used for hair" },
  { q: "I am not alive but I grow. I don't have lungs but I need air. What am I?", a: "fire", hint: "Hot and bright" },
  { q: "What can run but never walks, has a mouth but never talks, has a head but never weeps?", a: "river", hint: "Body of flowing water" },
  { q: "You see me once in June, twice in November but not at all in May. What am I?", a: "letter e", hint: "A letter of the alphabet" }
]

// ── RPS data ──────────────────────────────────────────────
const RPS_EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' }
const RPS_BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' }
const RPS_OPTIONS = ['rock', 'paper', 'scissors']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export default [

  // ── .truth ────────────────────────────────────────────
  {
    command:  'truth',
    aliases:  ['t', 'asktruth'],
    category: 'game',
    description: 'Get a random truth question',
    usage:    '.truth',
    example:  '.truth',

    handler: async (sock, msg, ctx) => {
      const question = pick(TRUTHS)

      await sock.sendMessage(ctx.from, {
        text: [
          `🔮 *TRUTH*`,
          `${'─'.repeat(28)}`,
          ``,
          question,
          ``,
          `@${ctx.senderNumber} must answer! 👀`
        ].join('\n'),
        mentions: [ctx.sender]
      }, { quoted: msg })
    }
  },

  // ── .dare ─────────────────────────────────────────────
  {
    command:  'dare',
    aliases:  ['d', 'givdare'],
    category: 'game',
    description: 'Get a random dare challenge',
    usage:    '.dare',
    example:  '.dare',

    handler: async (sock, msg, ctx) => {
      const dare = pick(DARES)

      await sock.sendMessage(ctx.from, {
        text: [
          `💥 *DARE*`,
          `${'─'.repeat(28)}`,
          ``,
          dare,
          ``,
          `@${ctx.senderNumber} must do this! 😂`
        ].join('\n'),
        mentions: [ctx.sender]
      }, { quoted: msg })
    }
  },

  // ── .8ball ────────────────────────────────────────────
  {
    command:  '8ball',
    aliases:  ['eightball', 'ask', 'magic8'],
    category: 'game',
    description: 'Ask the magic 8-ball a yes/no question',
    usage:    '.8ball <question>',
    example:  '.8ball Will I be rich?',

    handler: async (sock, msg, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `🎱 Ask me a question!\n\n📌 *Usage:* ${ctx.prefix}8ball <your question>`
        }, { quoted: msg })
      }

      const response = pick(EIGHTBALL)

      await sock.sendMessage(ctx.from, {
        text: [
          `🎱 *Magic 8-Ball*`,
          ``,
          `❓ _"${ctx.query}"_`,
          ``,
          response
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .rps ──────────────────────────────────────────────
  {
    command:  'rps',
    aliases:  ['rockpaperscissors', 'rockpaper'],
    category: 'game',
    description: 'Play Rock Paper Scissors against the bot',
    usage:    '.rps rock | paper | scissors',
    example:  '.rps rock',

    handler: async (sock, msg, ctx) => {
      const choice = ctx.query?.toLowerCase().trim()

      if (!choice || !RPS_OPTIONS.includes(choice)) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🪨 *Rock Paper Scissors*`,
            ``,
            `Choose your weapon:`,
            `  ${ctx.prefix}rps rock`,
            `  ${ctx.prefix}rps paper`,
            `  ${ctx.prefix}rps scissors`
          ].join('\n')
        }, { quoted: msg })
      }

      const botChoice = pick(RPS_OPTIONS)

      let result
      if (choice === botChoice) {
        result = `🤝 *Draw!*`
      } else if (RPS_BEATS[choice] === botChoice) {
        result = `🏆 *You Win!*`
      } else {
        result = `💀 *You Lose!*`
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `🪨✂️📄 *Rock Paper Scissors*`,
          `${'─'.repeat(26)}`,
          ``,
          `You:  *${RPS_EMOJI[choice]} ${choice.toUpperCase()}*`,
          `Bot:  *${RPS_EMOJI[botChoice]} ${botChoice.toUpperCase()}*`,
          ``,
          result
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .dice ─────────────────────────────────────────────
  {
    command:  'dice',
    aliases:  ['rolldice', 'roll'],
    category: 'game',
    description: 'Roll a dice (default 6-sided, or specify sides)',
    usage:    '.dice [sides]',
    example:  '.dice | .dice 20',

    handler: async (sock, msg, ctx) => {
      const sides = parseInt(ctx.query) || 6

      if (sides < 2 || sides > 100) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Dice sides must be between 2 and 100.`
        }, { quoted: msg })
      }

      const result = Math.floor(Math.random() * sides) + 1

      await sock.sendMessage(ctx.from, {
        text: [
          `🎲 *Dice Roll* (${sides}-sided)`,
          ``,
          `Result: *${result}*`,
          ``,
          result === sides    ? `🎉 Maximum roll!`  :
          result === 1        ? `💀 Critical fail!` :
          result >= sides * 0.8 ? `🔥 Lucky roll!` : ``
        ].filter(Boolean).join('\n')
      }, { quoted: msg })
    }
  },

  // ── .coinflip ─────────────────────────────────────────
  {
    command:  'coinflip',
    aliases:  ['flip', 'coin', 'headstails'],
    category: 'game',
    description: 'Flip a coin — heads or tails',
    usage:    '.coinflip',
    example:  '.coinflip',

    handler: async (sock, msg, ctx) => {
      const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS'
      const emoji  = result === 'HEADS' ? '🪙' : '🌕'

      await sock.sendMessage(ctx.from, {
        text: [
          `🪙 *Coin Flip*`,
          ``,
          `${emoji} *${result}!*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .trivia ───────────────────────────────────────────
  {
    command:  'trivia',
    aliases:  ['quiz', 'question'],
    category: 'game',
    description: 'Answer a trivia question — type the answer as a plain message',
    usage:    '.trivia',
    example:  '.trivia',

    handler: async (sock, msg, ctx) => {
      // Check if answer subcommand
      const sub = ctx.args[0]?.toLowerCase()

      if (sub === 'hint') {
        const session = activeSessions.get(ctx.from)
        if (!session || session.type !== 'trivia') {
          return sock.sendMessage(ctx.from, {
            text: `❌ No active trivia. Start one with ${ctx.prefix}trivia`
          }, { quoted: msg })
        }
        return sock.sendMessage(ctx.from, {
          text: `💡 *Hint:* ${session.hint}`
        }, { quoted: msg })
      }

      if (sub === 'skip' || sub === 'answer') {
        const session = activeSessions.get(ctx.from)
        if (!session || session.type !== 'trivia') {
          return sock.sendMessage(ctx.from, {
            text: `❌ No active trivia.`
          }, { quoted: msg })
        }
        activeSessions.delete(ctx.from)
        return sock.sendMessage(ctx.from, {
          text: `✅ *Answer was:* ${session.answer.toUpperCase()}`
        }, { quoted: msg })
      }

      // New trivia question
      if (activeSessions.has(ctx.from) && activeSessions.get(ctx.from).type === 'trivia') {
        return sock.sendMessage(ctx.from, {
          text: [
            `⚠️ A trivia is already active!`,
            ``,
            `Just type your answer as a normal message.`,
            `Or: ${ctx.prefix}trivia hint — for a hint`,
            `Or: ${ctx.prefix}trivia skip — to skip`
          ].join('\n')
        }, { quoted: msg })
      }

      const item = pick(TRIVIA)

      activeSessions.set(ctx.from, {
        type:     'trivia',
        answer:   item.a,
        hint:     item.hint,
        askedAt:  Date.now(),
        askerJid: ctx.sender
      })

      // Auto-expire after 60 seconds
      setTimeout(() => {
        const s = activeSessions.get(ctx.from)
        if (s?.type === 'trivia' && s.askedAt === activeSessions.get(ctx.from)?.askedAt) {
          activeSessions.delete(ctx.from)
          sock.sendMessage(ctx.from, {
            text: `⏰ *Time's up!* Nobody answered.\n✅ Answer was: *${item.a.toUpperCase()}*`
          })
        }
      }, 60_000)

      await sock.sendMessage(ctx.from, {
        text: [
          `🧠 *TRIVIA*`,
          `${'─'.repeat(26)}`,
          ``,
          item.q,
          ``,
          `_Type your answer as a plain message!_`,
          `_${ctx.prefix}trivia hint — for a hint_`,
          `_${ctx.prefix}trivia skip — to skip_`,
          `_60 seconds to answer_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .riddle ───────────────────────────────────────────
  {
    command:  'riddle',
    aliases:  ['brain', 'braineaser', 'puzzle'],
    category: 'game',
    description: 'Get a riddle to solve — type the answer as a plain message',
    usage:    '.riddle',
    example:  '.riddle',

    handler: async (sock, msg, ctx) => {
      const sub = ctx.args[0]?.toLowerCase()

      if (sub === 'hint') {
        const session = activeSessions.get(ctx.from)
        if (!session || session.type !== 'riddle') {
          return sock.sendMessage(ctx.from, {
            text: `❌ No active riddle. Start one with ${ctx.prefix}riddle`
          }, { quoted: msg })
        }
        return sock.sendMessage(ctx.from, {
          text: `💡 *Hint:* ${session.hint}`
        }, { quoted: msg })
      }

      if (sub === 'skip' || sub === 'answer') {
        const session = activeSessions.get(ctx.from)
        if (!session || session.type !== 'riddle') {
          return sock.sendMessage(ctx.from, {
            text: `❌ No active riddle.`
          }, { quoted: msg })
        }
        activeSessions.delete(ctx.from)
        return sock.sendMessage(ctx.from, {
          text: `✅ *Answer was:* ${session.answer.toUpperCase()}`
        }, { quoted: msg })
      }

      if (activeSessions.has(ctx.from) && activeSessions.get(ctx.from).type === 'riddle') {
        return sock.sendMessage(ctx.from, {
          text: [
            `⚠️ A riddle is already active!`,
            `Just type your answer as a message.`,
            `${ctx.prefix}riddle hint — for a hint`,
            `${ctx.prefix}riddle skip — to skip`
          ].join('\n')
        }, { quoted: msg })
      }

      const item = pick(RIDDLES)

      activeSessions.set(ctx.from, {
        type:     'riddle',
        answer:   item.a,
        hint:     item.hint,
        askedAt:  Date.now(),
        askerJid: ctx.sender
      })

      setTimeout(() => {
        const s = activeSessions.get(ctx.from)
        if (s?.type === 'riddle' && s.askedAt === activeSessions.get(ctx.from)?.askedAt) {
          activeSessions.delete(ctx.from)
          sock.sendMessage(ctx.from, {
            text: `⏰ *Time's up!* Nobody solved it.\n✅ Answer was: *${item.a.toUpperCase()}*`
          })
        }
      }, 90_000)

      await sock.sendMessage(ctx.from, {
        text: [
          `🧩 *RIDDLE*`,
          `${'─'.repeat(26)}`,
          ``,
          item.q,
          ``,
          `_Type your answer as a plain message!_`,
          `_${ctx.prefix}riddle hint — for a hint_`,
          `_${ctx.prefix}riddle skip — to skip_`,
          `_90 seconds to answer_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .guess ────────────────────────────────────────────
  {
    command:  'guess',
    aliases:  ['guessnumber', 'numberguess'],
    category: 'game',
    description: 'Guess the number the bot is thinking of (1–100)',
    usage:    '.guess <number>',
    example:  '.guess 42',

    handler: async (sock, msg, ctx) => {
      const session = activeSessions.get(`guess_${ctx.from}_${ctx.sender}`)

      // Start new game
      if (!ctx.query || ctx.query.toLowerCase() === 'start') {
        const target = Math.floor(Math.random() * 100) + 1

        activeSessions.set(`guess_${ctx.from}_${ctx.sender}`, {
          type:     'guess',
          target,
          attempts: 0,
          askedAt:  Date.now()
        })

        return sock.sendMessage(ctx.from, {
          text: [
            `🔢 *Number Guess Game*`,
            ``,
            `I'm thinking of a number between *1 and 100*.`,
            `You have 7 attempts!`,
            ``,
            `Type: ${ctx.prefix}guess <number>`
          ].join('\n')
        }, { quoted: msg })
      }

      if (!session) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Start a game first: ${ctx.prefix}guess start`
        }, { quoted: msg })
      }

      const guess = parseInt(ctx.query)

      if (isNaN(guess) || guess < 1 || guess > 100) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Guess a number between 1 and 100.`
        }, { quoted: msg })
      }

      session.attempts++
      const remaining = 7 - session.attempts

      if (guess === session.target) {
        activeSessions.delete(`guess_${ctx.from}_${ctx.sender}`)
        return sock.sendMessage(ctx.from, {
          text: [
            `🎉 *CORRECT!*`,
            ``,
            `The number was *${session.target}*!`,
            `You got it in *${session.attempts}* attempt(s)!`,
            ``,
            session.attempts === 1 ? `🤯 First try! Legendary!` :
            session.attempts <= 3  ? `🔥 Impressive!`          :
            session.attempts <= 5  ? `👏 Nice job!`            : `😅 You barely made it!`
          ].join('\n')
        }, { quoted: msg })
      }

      if (session.attempts >= 7) {
        activeSessions.delete(`guess_${ctx.from}_${ctx.sender}`)
        return sock.sendMessage(ctx.from, {
          text: [
            `💀 *GAME OVER!*`,
            ``,
            `The number was *${session.target}*.`,
            `Better luck next time! Try again: ${ctx.prefix}guess start`
          ].join('\n')
        }, { quoted: msg })
      }

      const direction = guess < session.target ? '📈 Too low!' : '📉 Too high!'

      await sock.sendMessage(ctx.from, {
        text: [
          `${direction}`,
          ``,
          `Your guess: *${guess}*`,
          `Attempts left: *${remaining}*`
        ].join('\n')
      }, { quoted: msg })
    }
  }

]
