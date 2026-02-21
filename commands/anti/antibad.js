// commands/anti/antibad.js
// Commands: .antibad | .addbadword | .delbadword | .badwordlist
//
// Bad words are stored per-group in the Worker.
// Worker endpoints:
//   GET    /bot/badwords?groupId=...     → list bad words for this group
//   POST   /bot/badwords                 → { groupId, word } add a word
//   DELETE /bot/badwords                 → { groupId, word } remove a word

// ── Worker helper ─────────────────────────────────────────
const w = async (path, opts = {}) => {
  try {
    const r = await fetch(`${process.env.WORKER_URL}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': process.env.BOT_SECRET,
        ...opts.headers,
      },
    })
    return await r.json()
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

const getGS     = (gid) => w(`/bot/gsettings?gid=${encodeURIComponent(gid)}`)
const setGS     = (gid, key, value) => w('/bot/gsettings', {
  method: 'POST',
  body:   JSON.stringify({ gid, key, value }),
})
const getBadWords = (groupId) => w(`/bot/badwords?groupId=${encodeURIComponent(groupId)}`)
const addBadWord  = (groupId, word) => w('/bot/badwords', {
  method: 'POST',
  body:   JSON.stringify({ groupId, word }),
})
const delBadWord  = (groupId, word) => w('/bot/badwords', {
  method: 'DELETE',
  body:   JSON.stringify({ groupId, word }),
})

export default [

  // ── .antibad ──────────────────────────────────────────
  {
    command:  'antibad',
    aliases:  ['antiswear', 'antiprofanity'],
    category: 'anti',
    description: 'Block messages containing bad words from your custom list',
    usage:    '.antibad on/off',
    example:  '.antibad on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure anti-bad-word.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const [gsRes, bwRes] = await Promise.all([
          getGS(ctx.from),
          getBadWords(ctx.from),
        ])

        const current = gsRes?.data?.antibad || gsRes?.antibad || 'off'
        const words   = bwRes?.data || bwRes?.words || []

        return sock.sendMessage(ctx.from, {
          text: [
            `🤐 *Anti-Bad-Word*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            `Bad words: *${Array.isArray(words) ? words.length : 0}*`,
            ``,
            `When ON, any message containing a banned word is automatically deleted.`,
            ``,
            `*Manage your word list:*`,
            `${ctx.prefix}addbadword <word>     — add a word`,
            `${ctx.prefix}delbadword <word>     — remove a word`,
            `${ctx.prefix}badwordlist           — see all words`,
            ``,
            `Usage: \`${ctx.prefix}antibad on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      if (input === 'on' && !ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to enforce this.'
        }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'antibad', input)

        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? [
                `🤐 *Anti-Bad-Word Enabled*`,
                ``,
                `Messages with banned words will be deleted.`,
                `Use \`${ctx.prefix}addbadword <word>\` to add words to the list.`
              ].join('\n')
            : `🤐 *Anti-Bad-Word Disabled*\n\nBad word filter is now off.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .addbadword ───────────────────────────────────────
  {
    command:  'addbadword',
    aliases:  ['badword', 'addword', 'banword'],
    category: 'anti',
    description: 'Add a word to the group\'s banned word list',
    usage:    '.addbadword <word>',
    example:  '.addbadword spam',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can manage the bad word list.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a word to ban.\n📌 *Usage:* ${ctx.prefix}addbadword <word>`
        }, { quoted: msg })
      }

      // Allow adding multiple words at once: .addbadword word1 word2 word3
      const words = ctx.query.toLowerCase().trim().split(/\s+/).filter(Boolean)

      if (words.some(w => w.length < 2)) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Words must be at least 2 characters long.'
        }, { quoted: msg })
      }

      if (words.some(w => w.length > 50)) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Words must be less than 50 characters.'
        }, { quoted: msg })
      }

      try {
        const bwRes     = await getBadWords(ctx.from)
        const existing  = bwRes?.data || bwRes?.words || []

        const alreadyIn = words.filter(wrd => existing.includes(wrd))
        const toAdd     = words.filter(wrd => !existing.includes(wrd))

        if (existing.length + toAdd.length > 100) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Bad word list is full (max 100 words). Remove some first with \`${ctx.prefix}delbadword\`.`
          }, { quoted: msg })
        }

        if (!toAdd.length) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ ${words.length === 1 ? `"${words[0]}" is` : 'All those words are'} already in the list.`
          }, { quoted: msg })
        }

        // Add each new word
        await Promise.all(toAdd.map(wrd => addBadWord(ctx.from, wrd)))

        const addedStr    = toAdd.map(wrd => `"${wrd}"`).join(', ')
        const skippedStr  = alreadyIn.length
          ? `\n⚠️ Already in list: ${alreadyIn.map(wrd => `"${wrd}"`).join(', ')}`
          : ''

        await sock.sendMessage(ctx.from, {
          text: `✅ Added ${toAdd.length} word(s) to the ban list: ${addedStr}${skippedStr}\n\nMake sure \`${ctx.prefix}antibad on\` is enabled.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .delbadword ───────────────────────────────────────
  {
    command:  'delbadword',
    aliases:  ['removebadword', 'unbanword', 'delword'],
    category: 'anti',
    description: 'Remove a word from the group\'s banned word list',
    usage:    '.delbadword <word>',
    example:  '.delbadword spam',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can manage the bad word list.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a word to remove.\n📌 *Usage:* ${ctx.prefix}delbadword <word>`
        }, { quoted: msg })
      }

      const words = ctx.query.toLowerCase().trim().split(/\s+/).filter(Boolean)

      try {
        const bwRes    = await getBadWords(ctx.from)
        const existing = bwRes?.data || bwRes?.words || []

        const toRemove  = words.filter(wrd => existing.includes(wrd))
        const notFound  = words.filter(wrd => !existing.includes(wrd))

        if (!toRemove.length) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ ${words.length === 1 ? `"${words[0]}" is` : 'None of those words are'} in the ban list.`
          }, { quoted: msg })
        }

        await Promise.all(toRemove.map(wrd => delBadWord(ctx.from, wrd)))

        const removedStr = toRemove.map(wrd => `"${wrd}"`).join(', ')
        const notFoundStr = notFound.length
          ? `\n⚠️ Not in list: ${notFound.map(wrd => `"${wrd}"`).join(', ')}`
          : ''

        await sock.sendMessage(ctx.from, {
          text: `✅ Removed ${toRemove.length} word(s): ${removedStr}${notFoundStr}`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .badwordlist ──────────────────────────────────────
  {
    command:  'badwordlist',
    aliases:  ['bannedwords', 'wordlist'],
    category: 'anti',
    description: 'Show all banned words in this group',
    usage:    '.badwordlist',
    example:  '.badwordlist',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can view the bad word list.'
        }, { quoted: msg })
      }

      try {
        const [bwRes, gsRes] = await Promise.all([
          getBadWords(ctx.from),
          getGS(ctx.from),
        ])

        const words   = bwRes?.data || bwRes?.words || []
        const enabled = gsRes?.data?.antibad || gsRes?.antibad || 'off'

        if (!Array.isArray(words) || !words.length) {
          return sock.sendMessage(ctx.from, {
            text: [
              `📋 *Bad Word List — Empty*`,
              ``,
              `No banned words yet.`,
              `Add words with \`${ctx.prefix}addbadword <word>\``,
            ].join('\n')
          }, { quoted: msg })
        }

        // Sort alphabetically
        const sorted = [...words].sort()

        const lines  = sorted.map((wrd, i) => `${String(i + 1).padStart(2, '0')}. ${wrd}`)
        const status = enabled === 'on' ? '✅ Active' : '❌ Inactive'

        // Send in DM to admin if list is long (sensitive info)
        const text = [
          `📋 *Bad Word List*`,
          `🔒 Filter: *${status}*`,
          `${'─'.repeat(26)}`,
          ``,
          ...lines,
          ``,
          `${'─'.repeat(26)}`,
          `Total: *${words.length}/100* words`
        ].join('\n')

        // Try to DM the admin
        try {
          await sock.sendMessage(ctx.sender, {
            text: `📋 *Bad Word List — ${ctx.groupMeta?.subject || ctx.from}*\n\n` + text
          })
          await sock.sendMessage(ctx.from, {
            text: `✅ Bad word list sent to your DM (to keep it private from members).`
          }, { quoted: msg })
        } catch {
          // If DM fails (blocked), send in group
          await sock.sendMessage(ctx.from, { text }, { quoted: msg })
        }

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  }

]
