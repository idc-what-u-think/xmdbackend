const LANG_MAP = {
  afrikaans:'af', albanian:'sq', amharic:'am', arabic:'ar', armenian:'hy',
  azerbaijani:'az', basque:'eu', belarusian:'be', bengali:'bn', bosnian:'bs',
  bulgarian:'bg', catalan:'ca', cebuano:'ceb', chinese:'zh', corsican:'co',
  croatian:'hr', czech:'cs', danish:'da', dutch:'nl', english:'en',
  esperanto:'eo', estonian:'et', finnish:'fi', french:'fr', frisian:'fy',
  galician:'gl', georgian:'ka', german:'de', greek:'el', gujarati:'gu',
  haitian:'ht', hausa:'ha', hawaiian:'haw', hebrew:'he', hindi:'hi',
  hmong:'hmn', hungarian:'hu', icelandic:'is', igbo:'ig', indonesian:'id',
  irish:'ga', italian:'it', japanese:'ja', javanese:'jv', kannada:'kn',
  kazakh:'kk', khmer:'km', kinyarwanda:'rw', korean:'ko', kurdish:'ku',
  kyrgyz:'ky', lao:'lo', latin:'la', latvian:'lv', lithuanian:'lt',
  luxembourgish:'lb', macedonian:'mk', malagasy:'mg', malay:'ms', malayalam:'ml',
  maltese:'mt', maori:'mi', marathi:'mr', mongolian:'mn', myanmar:'my',
  nepali:'ne', norwegian:'no', nyanja:'ny', odia:'or', pashto:'ps',
  persian:'fa', polish:'pl', portuguese:'pt', punjabi:'pa', romanian:'ro',
  russian:'ru', samoan:'sm', scottish:'gd', serbian:'sr', sesotho:'st',
  shona:'sn', sindhi:'sd', sinhala:'si', slovak:'sk', slovenian:'sl',
  somali:'so', spanish:'es', sundanese:'su', swahili:'sw', swedish:'sv',
  tagalog:'tl', tajik:'tg', tamil:'ta', tatar:'tt', telugu:'te',
  thai:'th', turkish:'tr', turkmen:'tk', ukrainian:'uk', urdu:'ur',
  uyghur:'ug', uzbek:'uz', vietnamese:'vi', welsh:'cy', xhosa:'xh',
  yiddish:'yi', yoruba:'yo', zulu:'zu', filipino:'fil', auto:'auto'
}

const resolveCode = (name) => {
  const n = name.toLowerCase().trim()
  if (Object.values(LANG_MAP).includes(n)) return n
  return LANG_MAP[n] || null
}

const convertStyle = (text, upperBase, lowerBase) =>
  [...text].map(c => {
    const n = c.charCodeAt(0)
    if (n >= 65 && n <= 90) return String.fromCodePoint(upperBase + n - 65)
    if (n >= 97 && n <= 122) return String.fromCodePoint(lowerBase + n - 97)
    return c
  }).join('')

const SMALL_CAPS = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',
  l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',
  w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
}

const toSmallCaps = (text) => [...text].map(c => SMALL_CAPS[c.toLowerCase()] || c).join('')

const toStrike = (text) => [...text].map(c => c + '\u0336').join('')

const toBubble = (text) => [...text].map(c => {
  const n = c.charCodeAt(0)
  if (n >= 65 && n <= 90) return String.fromCodePoint(0x24B6 + n - 65)
  if (n >= 97 && n <= 122) return String.fromCodePoint(0x24D0 + n - 97)
  if (n >= 48 && n <= 57) return n === 48 ? '⓪' : String.fromCodePoint(0x2460 + n - 49)
  return c
}).join('')

const applyStyles = (text) => {
  const bold       = convertStyle(text, 0x1D400, 0x1D41A)
  const italic     = convertStyle(text, 0x1D434, 0x1D44E)
  const boldItalic = convertStyle(text, 0x1D468, 0x1D482)
  const script     = convertStyle(text, 0x1D4D0, 0x1D4EA)
  const fraktur    = convertStyle(text, 0x1D56C, 0x1D586)
  const sansB      = convertStyle(text, 0x1D5D4, 0x1D5EE)
  const sansI      = convertStyle(text, 0x1D608, 0x1D622)
  const mono       = convertStyle(text, 0x1D670, 0x1D68A)
  const smallcaps  = toSmallCaps(text)
  const bubble     = toBubble(text)
  const strike     = toStrike(text)

  return [
    `1️⃣ *Bold*\n${bold}`,
    `2️⃣ *Italic*\n${italic}`,
    `3️⃣ *Bold Italic*\n${boldItalic}`,
    `4️⃣ *Script*\n${script}`,
    `5️⃣ *Fraktur*\n${fraktur}`,
    `6️⃣ *Sans Bold*\n${sansB}`,
    `7️⃣ *Sans Italic*\n${sansI}`,
    `8️⃣ *Monospace*\n${mono}`,
    `9️⃣ *Small Caps*\n${smallcaps}`,
    `🔟 *Bubble*\n${bubble}`,
    `🔡 *Strikethrough*\n${strike}`,
  ].join('\n\n')
}

export default [
  {
    command: 'tts',
    aliases: ['texttospeech', 'speak', 'voice'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const text = ctx.query?.trim()
      if (!text) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide text to speak.\n📌 *Usage:* ${ctx.prefix}tts Hello, how are you?`
        }, { quoted: msg })
      }
      if (text.length > 200) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Text too long. Max 200 characters.`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '🔊 Converting to speech...' }, { quoted: msg })
      try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&total=1&idx=0&textlen=${text.length}&client=tw-ob`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        })
        if (!res.ok) throw new Error('Google TTS failed')
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < 1000) throw new Error('empty audio')
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          audio: buf,
          mimetype: 'audio/mpeg',
          ptt: true
        }, { quoted: msg })
      } catch {
        try {
          const fallUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(text)}`
          const res2 = await fetch(fallUrl)
          if (!res2.ok) throw new Error('StreamElements TTS failed')
          const buf2 = Buffer.from(await res2.arrayBuffer())
          await sock.sendMessage(ctx.from, { delete: placeholder.key })
          await sock.sendMessage(ctx.from, {
            audio: buf2,
            mimetype: 'audio/mpeg',
            ptt: true
          }, { quoted: msg })
        } catch (err) {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ TTS failed: ${err.message}`
          })
        }
      }
    }
  },

  {
    command: 'translatorlang',
    aliases: ['setlang', 'translateset', 'tlang'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) {
        const saved = await api.sessionGet(`translatorlang:${ctx.sender}`)
        if (!saved?.value) {
          return sock.sendMessage(ctx.from, {
            text: [
              `🌍 *Translator Language*`,
              `${'─'.repeat(28)}`,
              ``,
              `No language pair set yet.`,
              ``,
              `📌 *Usage:* ${ctx.prefix}translatorlang <from> - <to>`,
              ``,
              `*Examples:*`,
              `  ${ctx.prefix}translatorlang spanish - english`,
              `  ${ctx.prefix}translatorlang french - yoruba`,
              `  ${ctx.prefix}translatorlang auto - english`,
              ``,
              `_Use "auto" to auto-detect source language_`
            ].join('\n')
          }, { quoted: msg })
        }
        const { from, to } = JSON.parse(saved.value)
        return sock.sendMessage(ctx.from, {
          text: `🌍 *Current Language Pair*\n\n${from} → ${to}\n\n_Change with: ${ctx.prefix}translatorlang <from> - <to>_`
        }, { quoted: msg })
      }
      const parts = query.split('-')
      if (parts.length < 2) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Format: ${ctx.prefix}translatorlang <from> - <to>\n\n*Example:* ${ctx.prefix}translatorlang spanish - english`
        }, { quoted: msg })
      }
      const fromName = parts[0].trim()
      const toName = parts.slice(1).join('-').trim()
      const fromCode = resolveCode(fromName)
      const toCode = resolveCode(toName)
      if (!fromCode) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Unknown language: *${fromName}*\n\nUse full language names like: english, spanish, french, yoruba, igbo, hausa, arabic, chinese, etc.`
        }, { quoted: msg })
      }
      if (!toCode) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Unknown language: *${toName}*\n\nUse full language names like: english, spanish, french, yoruba, etc.`
        }, { quoted: msg })
      }
      await api.sessionSet(`translatorlang:${ctx.sender}`, JSON.stringify({ from: fromCode, to: toCode, fromName, toName }))
      await sock.sendMessage(ctx.from, {
        text: [
          `✅ *Language pair set!*`,
          ``,
          `🌍 ${fromName} (${fromCode}) → ${toName} (${toCode})`,
          ``,
          `Now use *${ctx.prefix}translate <text>* to translate.`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'translate',
    aliases: ['tr', 'trans', 'tl'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const text = ctx.query?.trim() || ctx.quotedBody?.trim()
      if (!text) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide text to translate.\n📌 *Usage:* ${ctx.prefix}translate <text>\n\n_First set your language pair with ${ctx.prefix}translatorlang_`
        }, { quoted: msg })
      }
      const saved = await api.sessionGet(`translatorlang:${ctx.sender}`)
      if (!saved?.value) {
        return sock.sendMessage(ctx.from, {
          text: `❌ No language pair set.\n\nSet one first:\n${ctx.prefix}translatorlang spanish - english\n${ctx.prefix}translatorlang auto - english`
        }, { quoted: msg })
      }
      const { from, to, fromName, toName } = JSON.parse(saved.value)
      const placeholder = await sock.sendMessage(ctx.from, { text: `🌍 Translating...` }, { quoted: msg })
      try {
        const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`
        const res = await fetch(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        if (!res.ok) throw new Error(`Translation failed: ${res.status}`)
        const data = await res.json()
        const translated = data[0]?.map(r => r?.[0] || '').join('') || ''
        const detected = data[2] || from
        if (!translated) throw new Error('No translation returned')
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          text: [
            `🌍 *Translation*`,
            `${'─'.repeat(28)}`,
            ``,
            `*From:* ${fromName} (${detected})`,
            `*To:* ${toName} (${to})`,
            ``,
            `📝 *Original:*`,
            text,
            ``,
            `✅ *Translated:*`,
            translated
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Translation failed: ${err.message}`
        })
      }
    }
  },

  {
    command: 'styletext',
    aliases: ['styledtext', 'fancytext', 'textart', 'fonts'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const text = ctx.query?.trim()
      if (!text) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide text to style.\n📌 *Usage:* ${ctx.prefix}styletext Hello World`
        }, { quoted: msg })
      }
      if (text.length > 80) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Text too long. Max 80 characters for styling.`
        }, { quoted: msg })
      }
      await sock.sendMessage(ctx.from, {
        text: [
          `🎨 *Text Styles*`,
          `${'─'.repeat(28)}`,
          `📝 Input: ${text}`,
          ``,
          applyStyles(text)
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'readmore',
    aliases: ['rm', 'spoiler', 'hidemsg'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query || !query.includes('|')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Use *|* to separate visible and hidden parts.`,
            ``,
            `📌 *Usage:* ${ctx.prefix}readmore <visible text> | <hidden text>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}readmore Tap read more 👇 | This is the hidden content!`
          ].join('\n')
        }, { quoted: msg })
      }
      const pipeIndex = query.indexOf('|')
      const visible = query.slice(0, pipeIndex).trim()
      const hidden  = query.slice(pipeIndex + 1).trim()
      if (!visible || !hidden) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Both visible and hidden parts must have content.`
        }, { quoted: msg })
      }
      const spacer = '\u200B\n'.repeat(4001)
      await sock.sendMessage(ctx.from, {
        text: `${visible}${spacer}${hidden}`
      }, { quoted: msg })
    }
  },

  {
    command: 'url',
    aliases: ['shorten', 'shorturl', 'tinyurl'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const link = ctx.query?.trim()
      if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a valid URL.\n📌 *Usage:* ${ctx.prefix}url https://very-long-url.com/with/path`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '🔗 Shortening URL...' }, { quoted: msg })
      try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(link)}`)
        if (!res.ok) throw new Error('TinyURL failed')
        const short = (await res.text()).trim()
        if (!short.startsWith('http')) throw new Error('Invalid response')
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          text: [
            `🔗 *URL Shortened!*`,
            `${'─'.repeat(28)}`,
            ``,
            `📎 *Short:* ${short}`,
            `🌐 *Original:* ${link.length > 60 ? link.slice(0, 60) + '...' : link}`
          ].join('\n')
        }, { quoted: msg })
      } catch {
        try {
          const res2 = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(link)}`)
          if (!res2.ok) throw new Error('is.gd failed')
          const short2 = (await res2.text()).trim()
          await sock.sendMessage(ctx.from, { delete: placeholder.key })
          await sock.sendMessage(ctx.from, {
            text: [`🔗 *URL Shortened!*`, `${'─'.repeat(28)}`, ``, `📎 *Short:* ${short2}`, `🌐 *Original:* ${link}`].join('\n')
          }, { quoted: msg })
        } catch (err) {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ Shortening failed: ${err.message}`
          })
        }
      }
    }
  },

  {
    command: 'emojiinfo',
    aliases: ['emoji', 'emojidetail'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.trim()
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide an emoji.\n📌 *Usage:* ${ctx.prefix}emojiinfo 😂`
        }, { quoted: msg })
      }
      const chars = [...input]
      const emojiChar = chars[0]
      const codePoints = chars.map(c => ({
        char: c,
        dec: c.codePointAt(0),
        hex: 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
      }))
      const cpHex = codePoints[0].dec.toString(16).toLowerCase()
      let name = null
      let category = null
      let keywords = null
      try {
        const res = await fetch(`https://emojihub.yurace.pro/api/search/by-hexcode/${cpHex}`, {
          headers: { 'Accept': 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data[0]) {
            name = data[0].name
            category = data[0].category
            keywords = data[0].htmlCode?.join(' ')
          } else if (data?.name) {
            name = data.name
            category = data.category
          }
        }
      } catch { }
      await sock.sendMessage(ctx.from, {
        text: [
          `😀 *Emoji Info*`,
          `${'─'.repeat(28)}`,
          ``,
          `Emoji:    ${input}`,
          name     ? `Name:     ${name}`     : '',
          category ? `Category: ${category}` : '',
          ``,
          `*Unicode:*`,
          codePoints.map(c => `  ${c.hex}  (decimal: ${c.dec})`).join('\n'),
          keywords ? `\n*HTML Codes:* ${keywords}` : '',
          ``,
          `_${codePoints.map(c => `\\u{${c.dec.toString(16).toUpperCase()}}`).join(' ')}_`
        ].filter(l => l !== '').join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'obfuscate',
    aliases: ['obf', 'jsobfuscate', 'minify'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const code = ctx.query?.trim() || ctx.quotedBody?.trim()
      if (!code) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide JavaScript code.\n📌 *Usage:* ${ctx.prefix}obfuscate <JS code>\n_Or reply to a code message_`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '🔒 Obfuscating...' }, { quoted: msg })
      try {
        // javascript-obfuscator is CJS. Use createRequire to load it correctly in ESM.
        // Dynamic import() gives inconsistent results for this package across Node versions.
        const { createRequire } = await import('module')
        const require = createRequire(import.meta.url)
        let obfuscator
        try { obfuscator = require('javascript-obfuscator') } catch {
          throw Object.assign(new Error('javascript-obfuscator not installed'), { code: 'ERR_MODULE_NOT_FOUND' })
        }
        // Must call as obfuscator.obfuscate(code, opts) — NOT destructured.
        // javascript-obfuscator uses a class internally; destructuring loses `this`
        // binding and throws "Class constructor cannot be invoked without 'new'".
        const lib = obfuscator.default ?? obfuscator
        if (typeof lib?.obfuscate !== 'function') throw Object.assign(new Error('obfuscate fn not found'), { code: 'ERR_MODULE_NOT_FOUND' })
        const result = lib.obfuscate(code, {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,
          identifierNamesGenerator: 'hexadecimal',
          rotateStringArray: true,
          selfDefending: true,
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,
          unicodeEscapeSequence: false
        })
        const obfCode = result.getObfuscatedCode()
        await sock.sendMessage(ctx.from, { delete: placeholder.key })

        const { writeFile, unlink, readFile } = await import('fs/promises')
        const { tmpdir } = await import('os')
        const { join } = await import('path')
        const { randomBytes } = await import('crypto')
        const outPath = join(tmpdir(), `fkd_${randomBytes(6).toString('hex')}.js`)
        await writeFile(outPath, obfCode)
        const fileBuf = await readFile(outPath)
        await sock.sendMessage(ctx.from, {
          document: fileBuf,
          fileName: 'obfuscated.js',
          mimetype: 'text/javascript',
          caption: `🔒 *Obfuscated Code*\n${'─'.repeat(28)}\n📦 Size: ${(obfCode.length / 1024).toFixed(2)} KB\n_Protected with javascript-obfuscator_`
        }, { quoted: msg })
        await unlink(outPath).catch(() => {})
      } catch (err) {
        if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message?.includes('Cannot find')) {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ Package not installed.\n\nRun: \`npm install javascript-obfuscator\``
          })
        } else {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ Obfuscation failed: ${err.message}`
          })
        }
      }
    }
  },

  {
    command: 'sandbox',
    aliases: ['run', 'exec', 'execute', 'runcode'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim() || ctx.quotedBody?.trim()
      if (!query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide code to run.`,
            `📌 *Usage:* ${ctx.prefix}sandbox <code>`,
            ``,
            `*Supported languages (prefix with lang):*`,
            `js: | py: | bash: | go: | php:`,
            ``,
            `*Example:*`,
            `${ctx.prefix}sandbox js: console.log("hello")`,
            `${ctx.prefix}sandbox py: print("hello")`
          ].join('\n')
        }, { quoted: msg })
      }
      const LANG_PREFIXES = {
        'js:': { language: 'javascript', version: '18.15.0' },
        'javascript:': { language: 'javascript', version: '18.15.0' },
        'py:': { language: 'python', version: '3.10.0' },
        'python:': { language: 'python', version: '3.10.0' },
        'bash:': { language: 'bash', version: '5.2.0' },
        'sh:': { language: 'bash', version: '5.2.0' },
        'go:': { language: 'go', version: '1.16.2' },
        'php:': { language: 'php', version: '8.2.3' },
        'ts:': { language: 'typescript', version: '5.0.3' },
        'typescript:': { language: 'typescript', version: '5.0.3' },
        'ruby:': { language: 'ruby', version: '3.0.1' },
        'rs:': { language: 'rust', version: '1.68.2' },
        'rust:': { language: 'rust', version: '1.68.2' }
      }
      let lang = { language: 'javascript', version: '18.15.0' }
      let code = query
      for (const [prefix, def] of Object.entries(LANG_PREFIXES)) {
        if (query.toLowerCase().startsWith(prefix)) {
          lang = def
          code = query.slice(prefix.length).trim()
          break
        }
      }
      const placeholder = await sock.sendMessage(ctx.from, {
        text: `⚙️ Running ${lang.language} code...`
      }, { quoted: msg })
      try {
        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: lang.language,
            version: lang.version,
            files: [{ content: code }],
            stdin: '',
            args: [],
            run_timeout: 5000,
            compile_timeout: 10000
          })
        })
        if (!res.ok) throw new Error(`Piston API error: ${res.status}`)
        const data = await res.json()
        const output = (data.run?.output || '').trim()
        const stderr = (data.run?.stderr || '').trim()
        const stdout = (data.run?.stdout || '').trim()
        const exitCode = data.run?.code ?? 0
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        const resultLines = [
          `⚙️ *Code Runner*`,
          `${'─'.repeat(28)}`,
          `🔤 Language: ${lang.language} ${lang.version}`,
          `📊 Exit Code: ${exitCode}`,
          ``
        ]
        if (stdout) {
          resultLines.push(`*Output:*`)
          resultLines.push('```')
          resultLines.push(stdout.length > 1500 ? stdout.slice(0, 1500) + '\n... (truncated)' : stdout)
          resultLines.push('```')
        }
        if (stderr) {
          resultLines.push(``)
          resultLines.push(`*Errors:*`)
          resultLines.push('```')
          resultLines.push(stderr.length > 500 ? stderr.slice(0, 500) + '\n...' : stderr)
          resultLines.push('```')
        }
        if (!stdout && !stderr) {
          resultLines.push(`_No output_`)
        }
        await sock.sendMessage(ctx.from, {
          text: resultLines.join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Execution failed: ${err.message}`
        })
      }
    }
  }
]
