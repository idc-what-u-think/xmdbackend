// commands/ai/groq.js
// All AI commands — Groq (primary) + Gemini (secondary)
// Key selection is handled automatically by the Worker based on the user's plan.

// ── Helpers ────────────────────────────────────────────────────────────────

const NO_KEY_MSG = (prefix) =>
  `❌ *No AI key available right now.*\n\n` +
  `The bot owner hasn't added API keys yet, or the daily limit has been reached.\n` +
  `_Try again later or contact the owner._`

const UPGRADE_MSG = (prefix) =>
  `⭐ *Premium users get priority AI access with dedicated keys.*\n` +
  `Upgrade at https://firekidofficial.name.ng`

// Call Groq API
const callGroq = async (apiKey, model, systemPrompt, userMessage, maxTokens = 1024) => {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:       model || 'llama-3.3-70b-versatile',
      max_tokens:  maxTokens,
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: userMessage  },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Groq error ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// Call Gemini API
const callGemini = async (apiKey, prompt, maxTokens = 1024) => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini error ${res.status}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}

// Generic AI command factory using Groq
const makeGroqCmd = (command, aliases, systemPrompt, inputLabel, maxTokens = 800) => ({
  command,
  aliases,
  category: 'ai',
  handler: async (sock, msg, ctx, { api }) => {
    const input = ctx.query || (ctx.quoted ? ctx.quotedBody : '')
    if (!input) {
      return sock.sendMessage(ctx.from, {
        text: `❌ Provide a message.\n📌 *Usage:* ${ctx.prefix}${command} <${inputLabel}>`
      }, { quoted: msg })
    }

    const placeholder = await sock.sendMessage(ctx.from, { text: '🤖 Thinking...' }, { quoted: msg })

    try {
      const keyRes = await api.getKey('groq', ctx.senderStorageJid)
      if (!keyRes?.key) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
        return
      }

      const reply = await callGroq(keyRes.key, null, systemPrompt, input, maxTokens)
      await sock.sendMessage(ctx.from, { edit: placeholder.key, text: reply || '❌ No response from AI.' })
    } catch (err) {
      await sock.sendMessage(ctx.from, {
        edit: placeholder.key,
        text: `❌ AI error: ${err.message}`
      })
    }
  }
})

// ── Commands ──────────────────────────────────────────────────────────────

export default [

  // ── .ai / .groq — general chat ──────────────────────────────────────────
  {
    command: 'ai',
    aliases: ['ask', 'chat', 'bot'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query || (ctx.quoted ? ctx.quotedBody : '')
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: `🤖 *Firekid AI*\n\nAsk me anything!\n📌 *Usage:* ${ctx.prefix}ai <your question>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: '🤖 Thinking...' }, { quoted: msg })

      try {
        const keyRes = await api.getKey('groq', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }

        const reply = await callGroq(
          keyRes.key,
          'llama-3.3-70b-versatile',
          'You are Firekid AI, a helpful, friendly, and witty WhatsApp assistant. Reply concisely. Match the language the user writes in.',
          input,
          1024
        )

        const text = reply || '❌ No response from AI.'
        const footer = !ctx.isPremium ? `\n\n_⭐ Upgrade for priority AI: https://firekidofficial.name.ng_` : ''
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: text + footer })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ AI error: ${err.message}` })
      }
    }
  },

  // ── .groq — explicit Groq ──────────────────────────────────────────────
  {
    command: 'groq',
    aliases: ['llama', 'llm'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query || (ctx.quoted ? ctx.quotedBody : '')
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: `⚡ *Groq AI — Ultra Fast*\n\nPowered by Llama 3.3 70B on Groq's blazing-fast inference.\n📌 *Usage:* ${ctx.prefix}groq <your message>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: '⚡ Groq processing...' }, { quoted: msg })

      try {
        const keyRes = await api.getKey('groq', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }

        const reply = await callGroq(
          keyRes.key,
          'llama-3.3-70b-versatile',
          'You are a helpful assistant. Be clear, concise, and accurate. Match the user\'s language.',
          input,
          1024
        )
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: reply || '❌ No response.' })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Groq error: ${err.message}` })
      }
    }
  },

  // ── .gemini — Google Gemini ────────────────────────────────────────────
  {
    command: 'gemini',
    aliases: ['google', 'bard'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query || (ctx.quoted ? ctx.quotedBody : '')
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: `✨ *Google Gemini AI*\n\nPowered by Gemini 1.5 Flash.\n📌 *Usage:* ${ctx.prefix}gemini <your message>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: '✨ Asking Gemini...' }, { quoted: msg })

      try {
        const keyRes = await api.getKey('gemini', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }

        const reply = await callGemini(keyRes.key, input, 1024)
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: reply || '❌ No response from Gemini.' })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Gemini error: ${err.message}` })
      }
    }
  },

  // ── .gpt — alias for Groq (no OpenAI key needed) ──────────────────────
  {
    command: 'gpt',
    aliases: ['chatgpt'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query || (ctx.quoted ? ctx.quotedBody : '')
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: `🤖 *GPT-style AI*\n📌 *Usage:* ${ctx.prefix}gpt <your message>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: '🤖 Processing...' }, { quoted: msg })

      try {
        const keyRes = await api.getKey('groq', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }
        const reply = await callGroq(
          keyRes.key, 'llama-3.3-70b-versatile',
          'You are a helpful assistant. Be clear, concise, and accurate.',
          input, 1024
        )
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: reply || '❌ No response.' })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Error: ${err.message}` })
      }
    }
  },

  // ── .deepseek — uses Groq's mixtral as a stand-in ─────────────────────
  {
    command: 'deepseek',
    aliases: ['think2'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query || (ctx.quoted ? ctx.quotedBody : '')
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: `🧠 *DeepSeek AI*\n📌 *Usage:* ${ctx.prefix}deepseek <your message>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: '🧠 Deep thinking...' }, { quoted: msg })

      try {
        const keyRes = await api.getKey('groq', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }
        const reply = await callGroq(
          keyRes.key, 'mixtral-8x7b-32768',
          'You are a deep analytical AI. Think step by step and give detailed, thoughtful answers.',
          input, 1500
        )
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: reply || '❌ No response.' })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Error: ${err.message}` })
      }
    }
  },

  // ── .think — step-by-step reasoning ──────────────────────────────────
  makeGroqCmd(
    'think', ['reason', 'analyze'],
    'You are a deep thinker. Break down the problem step by step with clear reasoning. Be thorough but concise.',
    'problem or question', 1500
  ),

  // ── .translate ────────────────────────────────────────────────────────
  {
    command: 'translate',
    aliases: ['tr', 'lang'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const targetLang = ctx.args[0]
      const textToTranslate = ctx.args.slice(1).join(' ') || ctx.quotedBody

      if (!targetLang || !textToTranslate) {
        return sock.sendMessage(ctx.from, {
          text: `🌍 *Translate*\n\n📌 *Usage:* ${ctx.prefix}translate <language> <text>\n\n*Examples:*\n  ${ctx.prefix}translate yoruba Good morning\n  ${ctx.prefix}translate french How are you?\n  ${ctx.prefix}translate spanish I love coding`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: `🌍 Translating to ${targetLang}...` }, { quoted: msg })

      try {
        const keyRes = await api.getKey('groq', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }

        const reply = await callGroq(
          keyRes.key, null,
          `You are a professional translator. Translate the given text to ${targetLang}. Output ONLY the translated text, nothing else. No explanations, no labels, just the translation.`,
          textToTranslate, 512
        )

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [`🌍 *Translation → ${targetLang}*`, `${'─'.repeat(28)}`, ``, reply || '❌ Translation failed.'].join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Translation error: ${err.message}` })
      }
    }
  },

  // ── .roast ───────────────────────────────────────────────────────────
  {
    command: 'roast',
    aliases: ['burn', 'toast'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.mentionedJids[0] || ctx.quotedSender
      const name = target ? `@${target.split('@')[0]}` : (ctx.query || 'this person')

      const placeholder = await sock.sendMessage(ctx.from, { text: '🔥 Warming up the roaster...' }, { quoted: msg })

      try {
        const keyRes = await api.getKey('groq', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }

        const reply = await callGroq(
          keyRes.key, null,
          'You are a savage but funny roast comedian. Write a witty, creative roast — harsh enough to be funny but never truly mean. Keep it under 150 words. No disclaimers.',
          `Roast someone referred to as "${name}"`,
          300
        )

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [`🔥 *ROAST TIME*`, `${'─'.repeat(28)}`, ``, reply, ``, `_Ouch. 💀_`].join('\n'),
          mentions: target ? [target] : []
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Roast failed: ${err.message}` })
      }
    }
  },

  // ── .story ────────────────────────────────────────────────────────────
  makeGroqCmd(
    'story', ['shortstory', 'tale'],
    'You are a creative storyteller. Write a short, engaging story (100-200 words) based on the given prompt. Make it interesting with a clear beginning, middle, and end.',
    'story prompt', 600
  ),

  // ── .poem ─────────────────────────────────────────────────────────────
  makeGroqCmd(
    'poem', ['poetry', 'verse'],
    'You are a skilled poet. Write a beautiful, original poem based on the given theme or topic. Keep it between 8-16 lines. No explanations, just the poem.',
    'poem topic', 400
  ),

  // ── .rap ──────────────────────────────────────────────────────────────
  makeGroqCmd(
    'rap', ['bars', 'freestyle'],
    'You are a skilled rapper and lyricist. Write original rap bars/lyrics based on the given topic. Include rhymes, wordplay, and flow. 8-16 lines. No explanations.',
    'rap topic', 400
  ),

  // ── .debate ───────────────────────────────────────────────────────────
  makeGroqCmd(
    'debate', ['argue', 'both sides'],
    'You are a debate expert. For the given topic, present strong arguments for BOTH sides clearly labeled "FOR:" and "AGAINST:". Be balanced and factual. Keep each side to 3-4 points.',
    'debate topic', 800
  ),

  // ── .summarize ────────────────────────────────────────────────────────
  makeGroqCmd(
    'summarize', ['summary', 'tldr', 'sum'],
    'You are an expert at summarizing. Create a clear, concise summary of the given text. Use bullet points if helpful. Capture all key points.',
    'text to summarize', 600
  ),

  // ── .fix ──────────────────────────────────────────────────────────────
  {
    command: 'fix',
    aliases: ['correct', 'improve', 'grammar'],
    category: 'ai',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query || ctx.quotedBody
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: `✏️ *Fix Text*\n\nFixes grammar, spelling, and improves your writing.\n📌 *Usage:* ${ctx.prefix}fix <text> OR reply to a message`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: '✏️ Fixing...' }, { quoted: msg })

      try {
        const keyRes = await api.getKey('groq', ctx.senderStorageJid)
        if (!keyRes?.key) {
          await sock.sendMessage(ctx.from, { edit: placeholder.key, text: NO_KEY_MSG(ctx.prefix) })
          return
        }

        const reply = await callGroq(
          keyRes.key, null,
          'You are a professional editor and proofreader. Fix all grammar, spelling, punctuation errors and improve clarity. Output ONLY the corrected text — no explanations, no "Here is the corrected version:", just the fixed text.',
          input, 512
        )

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [`✏️ *Fixed Text*`, `${'─'.repeat(28)}`, ``, reply || input].join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Fix error: ${err.message}` })
      }
    }
  },

  // ── .explain ──────────────────────────────────────────────────────────
  makeGroqCmd(
    'explain', ['eli5', 'breakdown', 'clarify'],
    'You are an expert teacher. Explain the given concept clearly and simply, as if teaching someone who knows nothing about it. Use simple language, analogies, and examples. Be thorough but easy to understand.',
    'topic or concept', 800
  ),

]
