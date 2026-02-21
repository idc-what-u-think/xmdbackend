// commands/group/poll.js
// Commands: .poll

// Format: .poll Question | Option1 | Option2 | Option3
// Or:     .poll Question           ← defaults to Yes / No

export default {
  command:  'poll',
  aliases:  ['vote', 'survey'],
  category: 'group',
  description: 'Create a group poll. Separate options with |',
  usage:    '.poll <Question> | <Option1> | <Option2> ...',
  example:  '.poll Who is the GOAT? | Messi | Ronaldo | Neither',

  handler: async (sock, msg, args, ctx) => {
    if (!ctx.isGroup) {
      return sock.sendMessage(ctx.from, {
        text: '❌ This command only works in groups.'
      }, { quoted: msg })
    }

    if (!ctx.isAdmin && !ctx.isOwner) {
      return sock.sendMessage(ctx.from, {
        text: '❌ Only group admins can create polls.'
      }, { quoted: msg })
    }

    if (!ctx.query) {
      return sock.sendMessage(ctx.from, {
        text: [
          `❌ Provide a question and options.`,
          ``,
          `📌 *Usage:*`,
          `${ctx.prefix}poll <Question> | <Option1> | <Option2>`,
          ``,
          `📌 *Example:*`,
          `${ctx.prefix}poll Who is the GOAT? | Messi | Ronaldo | Neither`,
          ``,
          `_Tip: If you only provide a question with no options, the poll defaults to Yes / No._`
        ].join('\n')
      }, { quoted: msg })
    }

    // Split by | to separate question from options
    const parts = ctx.query.split('|').map(s => s.trim()).filter(Boolean)

    if (!parts.length) {
      return sock.sendMessage(ctx.from, {
        text: '❌ Could not parse your poll. Use | to separate options.'
      }, { quoted: msg })
    }

    const question = parts[0]
    let   options  = parts.slice(1)

    // Validate question length
    if (question.length > 255) {
      return sock.sendMessage(ctx.from, {
        text: '❌ Question is too long (max 255 characters).'
      }, { quoted: msg })
    }

    // Default to Yes/No if no options given
    if (options.length === 0) {
      options = ['Yes ✅', 'No ❌']
    }

    // WhatsApp polls support max 12 options
    if (options.length < 2) {
      return sock.sendMessage(ctx.from, {
        text: '❌ A poll needs at least 2 options.'
      }, { quoted: msg })
    }

    if (options.length > 12) {
      return sock.sendMessage(ctx.from, {
        text: `❌ Too many options — WhatsApp polls support a maximum of 12 options. You provided ${options.length}.`
      }, { quoted: msg })
    }

    // Check each option length
    const longOpt = options.find(o => o.length > 100)
    if (longOpt) {
      return sock.sendMessage(ctx.from, {
        text: `❌ Option too long: "${longOpt.slice(0, 30)}..." — max 100 characters per option.`
      }, { quoted: msg })
    }

    try {
      await sock.sendMessage(ctx.from, {
        poll: {
          name:               question,
          values:             options,
          selectableCount:    1,              // single-choice poll
          toAnnouncementGroup: false
        }
      }, { quoted: msg })
    } catch (err) {
      await sock.sendMessage(ctx.from, {
        text: `❌ Failed to create poll: ${err.message}`
      }, { quoted: msg })
    }
  }
}
