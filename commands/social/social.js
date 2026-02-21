export const confessionStore = new Map()
export const suggestionStore = new Map()

const BORDERS = [
  '═', '━', '─', '▬', '⋯'
]

const announce = (title, body, emoji = '📢') => {
  const border = '═'.repeat(30)
  return [
    `${emoji} *${title}*`,
    border,
    ``,
    body,
    ``,
    border
  ].join('\n')
}

export default [
  {
    command: 'gcannounce',
    aliases: ['announce', 'pinmsg', 'announcement'],
    category: 'social',
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide announcement text.\n📌 *Usage:* ${ctx.prefix}gcannounce <message>`
        }, { quoted: msg })
      }

      const groupName = ctx.groupMeta?.subject || 'Group'
      const time = new Date().toLocaleString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `📣 *ANNOUNCEMENT*`,
          `${'═'.repeat(30)}`,
          ``,
          ctx.query,
          ``,
          `${'═'.repeat(30)}`,
          `📍 *${groupName}*`,
          `🕐 ${time}`,
          ``,
          `_— Admin Notice_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'spotlight',
    aliases: ['memberofday', 'feature', 'highlight'],
    category: 'social',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || (() => {
        const parts = ctx.groupMeta?.participants || []
        const nonBots = parts.filter(p => p.id !== ctx.botId)
        return nonBots[Math.floor(Math.random() * nonBots.length)]?.id
      })()

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ No member found.\n📌 *Usage:* ${ctx.prefix}spotlight @user`
        }, { quoted: msg })
      }

      const num = targetJid.split('@')[0]
      const parts = ctx.groupMeta?.participants || []
      const memberInfo = parts.find(p => p.id === targetJid)
      const role = memberInfo?.admin === 'superadmin' ? '👑 Owner' :
                   memberInfo?.admin === 'admin' ? '⭐ Admin' : '👤 Member'

      let ppUrl
      try {
        ppUrl = await sock.profilePictureUrl(targetJid, 'image')
      } catch {}

      const text = [
        `🌟 *MEMBER SPOTLIGHT*`,
        `${'═'.repeat(28)}`,
        ``,
        `👤 @${num}`,
        `🏷️  Role:    ${role}`,
        `📱 Number:  +${num}`,
        ``,
        `✨ This member is appreciated in *${ctx.groupMeta?.subject || 'this group'}*!`,
        ``,
        `Give them some love 💙`
      ].join('\n')

      if (ppUrl) {
        await sock.sendMessage(ctx.from, {
          image: { url: ppUrl },
          caption: text,
          mentions: [targetJid]
        }, { quoted: msg })
      } else {
        await sock.sendMessage(ctx.from, {
          text,
          mentions: [targetJid]
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'groupmood',
    aliases: ['mood', 'vibe'],
    category: 'social',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const parts = ctx.groupMeta?.participants || []
      const admins = parts.filter(p => p.admin)
      const memberCount = parts.length

      const MOODS = [
        { mood: '💀 DEAD', desc: `This group hasn't moved in days. Someone say something. Anything.` },
        { mood: '🔥 ON FIRE', desc: `Messages flying in every direction. Pure chaos. We love to see it.` },
        { mood: '😂 COMEDY HOUR', desc: `Someone dropped a banger joke and now everyone's a comedian.` },
        { mood: '👻 GHOST TOWN', desc: `${memberCount} members. Zero conversation. The silence is LOUD.` },
        { mood: '☕ DRAMA BREWING', desc: `Something is simmering beneath the surface. Choose your words carefully.` },
        { mood: '😴 SLEEP MODE', desc: `The group is in sleep mode. Do not disturb.` },
        { mood: '🤯 UNHINGED', desc: `Nobody knows what's happening and nobody is in control. Beautiful.` },
        { mood: '📚 STUDIOUS', desc: `Everyone is sharing knowledge. Very rare. Screenshot this.` },
        { mood: '💬 CHATTY', desc: `People are actually talking! Look at them! Communicating! Wild!` },
        { mood: '🐸 CHAOTIC NEUTRAL', desc: `Completely unpredictable. Expect anything from this group today.` },
        { mood: '🥶 ICY', desc: `The vibes in here are COLD. Someone say something warm.` },
        { mood: '🎉 FESTIVE', desc: `Good energy! People are hyped. Whatever's happening, keep it going.` },
      ]

      const selected = MOODS[Math.floor(Math.random() * MOODS.length)]

      await sock.sendMessage(ctx.from, {
        text: [
          `🌡️ *Group Mood Analysis*`,
          `${'─'.repeat(28)}`,
          ``,
          `📊 *Group:* ${ctx.groupMeta?.subject || 'This Group'}`,
          `👥 *Members:* ${memberCount}`,
          `⭐ *Admins:* ${admins.length}`,
          ``,
          `Current mood: *${selected.mood}*`,
          ``,
          selected.desc
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'confession',
    aliases: ['confess', 'anonymous'],
    category: 'social',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🙈 *Anonymous Confession*`,
            ``,
            `Post a confession to the group — nobody will know it's you.`,
            ``,
            `📌 *Usage:* ${ctx.prefix}confession <your secret>`,
            ``,
            `_Example: ${ctx.prefix}confession I actually like the pineapple pizza_`
          ].join('\n')
        }, { quoted: msg })
      }

      if (ctx.query.length > 500) {
        return sock.sendMessage(ctx.from, { text: `❌ Confession too long. Max 500 characters.` }, { quoted: msg })
      }

      const confessId = Date.now().toString(36).toUpperCase()

      const confessions = confessionStore.get(ctx.from) || []
      confessions.push({ id: confessId, text: ctx.query, senderJid: ctx.sender, timestamp: Date.now() })
      if (confessions.length > 50) confessions.shift()
      confessionStore.set(ctx.from, confessions)

      await sock.sendMessage(ctx.sender, {
        text: [
          `✅ *Confession Sent!*`,
          ``,
          `Your confession #${confessId} has been posted anonymously.`,
          `Nobody can trace it back to you.`
        ].join('\n')
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `🙈 *Anonymous Confession #${confessId}*`,
          `${'═'.repeat(28)}`,
          ``,
          ctx.query,
          ``,
          `${'═'.repeat(28)}`,
          `_Post yours: ${ctx.prefix}confession <text>_`
        ].join('\n')
      })
    }
  },

  {
    command: 'suggest',
    aliases: ['suggestion', 'idea'],
    category: 'social',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `💡 *Anonymous Suggestion Box*`,
            ``,
            `Drop ideas for the group anonymously.`,
            `Admins can review with ${ctx.prefix}suggestions`,
            ``,
            `📌 *Usage:* ${ctx.prefix}suggest <your idea>`,
            ``,
            `_Example: ${ctx.prefix}suggest We should do a group game night_`
          ].join('\n')
        }, { quoted: msg })
      }

      if (ctx.query.length > 300) {
        return sock.sendMessage(ctx.from, { text: `❌ Suggestion too long. Max 300 characters.` }, { quoted: msg })
      }

      const suggId = Date.now().toString(36).toUpperCase()

      const suggestions = suggestionStore.get(ctx.from) || []
      suggestions.push({ id: suggId, text: ctx.query, senderJid: ctx.sender, timestamp: Date.now() })
      if (suggestions.length > 50) suggestions.shift()
      suggestionStore.set(ctx.from, suggestions)

      await sock.sendMessage(ctx.sender, {
        text: `✅ *Suggestion submitted!*\n\nYour suggestion #${suggId} is now pending admin review. It was posted anonymously.`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `💡 *New Suggestion #${suggId}*`,
          `${'─'.repeat(28)}`,
          ``,
          ctx.query,
          ``,
          `_Admins: use ${ctx.prefix}suggestions to view all_`
        ].join('\n')
      })
    }
  },

  {
    command: 'suggestions',
    aliases: ['viewsuggestions', 'suggestionlist'],
    category: 'social',
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const suggestions = suggestionStore.get(ctx.from) || []

      if (!suggestions.length) {
        return sock.sendMessage(ctx.from, {
          text: `💡 *Suggestion Box — Empty*\n\nNo pending suggestions.\n_Members can submit: ${ctx.prefix}suggest <text>_`
        }, { quoted: msg })
      }

      const lines = suggestions.map((s, i) => {
        const date = new Date(s.timestamp).toLocaleDateString('en-GB')
        return `${i + 1}. *#${s.id}* — ${date}\n    "${s.text}"`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `💡 *Suggestions (${suggestions.length})*`,
          `${'─'.repeat(28)}`,
          ``,
          lines.join('\n\n'),
          ``,
          `_Clear: ${ctx.prefix}clearsuggestions_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'clearsuggestions',
    aliases: ['deletesuggestions'],
    category: 'social',
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      suggestionStore.delete(ctx.from)
      await sock.sendMessage(ctx.from, {
        text: `✅ All suggestions cleared.`
      }, { quoted: msg })
    }
  },

  {
    command: 'todayinhistory',
    aliases: ['onthisday', 'history'],
    category: 'social',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const now = new Date()
      const month = now.getMonth() + 1
      const day = now.getDate()

      const HISTORY = {
        '1-1':  { year: 1863, event: 'The Emancipation Proclamation went into effect in the United States.' },
        '2-14': { year: 1929, event: 'The St. Valentine\'s Day Massacre took place in Chicago.' },
        '3-6':  { year: 1957, event: 'Ghana became the first sub-Saharan African country to gain independence from colonial rule.' },
        '4-4':  { year: 1968, event: 'Martin Luther King Jr. was assassinated in Memphis, Tennessee.' },
        '4-23': { year: 1564, event: 'William Shakespeare was born in Stratford-upon-Avon, England.' },
        '5-25': { year: 1977, event: 'Star Wars: A New Hope was first released in cinemas.' },
        '6-1':  { year: 1980, event: 'CNN launched as the world\'s first 24-hour television news network.' },
        '7-20': { year: 1969, event: 'Apollo 11 landed on the moon. Neil Armstrong took his first steps.' },
        '8-6':  { year: 1945, event: 'The atomic bomb was dropped on Hiroshima, Japan.' },
        '9-1':  { year: 1939, event: 'Germany invaded Poland, beginning World War II.' },
        '10-1': { year: 1960, event: 'Nigeria gained independence from Britain. 🇳🇬' },
        '11-9': { year: 1989, event: 'The Berlin Wall fell, reuniting East and West Germany.' },
        '12-25': { year: 336,  event: 'The first recorded celebration of Christmas took place in Rome.' },
      }

      const key = `${month}-${day}`
      const entry = HISTORY[key]

      let eventText
      if (entry) {
        eventText = `🗓️ *On this day, ${entry.year}:*\n\n${entry.event}`
      } else {
        const FALLBACK = [
          `Many great things have happened on ${now.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })} throughout history. Each day carries the weight of the past and the promise of tomorrow. 🌍`,
          `History is being made every single day — including today. Whatever you do today might be remembered tomorrow. Make it count. ⏳`,
          `On this date in history, ordinary people made extraordinary decisions. You never know which moment defines an era. 📖`,
        ]
        eventText = `🗓️ *Today in History*\n\n${FALLBACK[day % FALLBACK.length]}`
      }

      await sock.sendMessage(ctx.from, {
        text: [
          eventText,
          ``,
          `📅 *${now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'gcstatus',
    aliases: ['groupstatus', 'channelpost', 'gcpost'],
    category: 'social',
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const sub = ctx.args[0]?.toLowerCase()

      if (sub === 'on' || sub === 'off') {
        await api.sessionSet(`gcstatus_mode_${ctx.from}`, sub)
        return sock.sendMessage(ctx.from, {
          text: `${sub === 'on' ? '✅' : '❌'} Group status posting: *${sub.toUpperCase()}*\n\n_${sub === 'on' ? 'Admins can now post to linked channel' : 'Channel posting disabled'}_`
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📢 *Group Channel Post*`,
            ``,
            `Post to this group\'s linked WA Channel/Newsletter.`,
            ``,
            `📌 *Usage:* ${ctx.prefix}gcstatus <message>`,
            ``,
            `*Toggle:*`,
            `  ${ctx.prefix}gcstatus on  — Enable`,
            `  ${ctx.prefix}gcstatus off — Disable`,
            ``,
            `_Note: Group must have a linked newsletter_`
          ].join('\n')
        }, { quoted: msg })
      }

      const modeRes = await api.sessionGet(`gcstatus_mode_${ctx.from}`)
      const mode = modeRes?.value || 'on'
      if (mode === 'off') {
        return sock.sendMessage(ctx.from, { text: `❌ Group status posting is currently OFF.\n_Enable with ${ctx.prefix}gcstatus on_` }, { quoted: msg })
      }

      try {
        const groupInfo = await sock.groupMetadata(ctx.from)
        const linkedJid = groupInfo?.linkedParent || groupInfo?.linkedNewsletterJid

        if (!linkedJid) {
          return sock.sendMessage(ctx.from, {
            text: [
              `❌ *No linked channel found*`,
              ``,
              `This group has no linked WhatsApp Channel/Newsletter.`,
              ``,
              `To link one:`,
              `  1. Open group settings`,
              `  2. Tap "Link a channel"`,
              `  3. Select your channel`
            ].join('\n')
          }, { quoted: msg })
        }

        await sock.newsletterSendMessage(linkedJid, {
          text: [
            ctx.query,
            ``,
            `— *${ctx.groupMeta?.subject || 'Group Update'}*`,
            `📅 ${new Date().toLocaleDateString('en-GB')}`
          ].join('\n')
        })

        await sock.sendMessage(ctx.from, {
          text: `✅ *Posted to linked channel!*\n\n_"${ctx.query.slice(0, 60)}${ctx.query.length > 60 ? '...' : ''}"_`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to post to channel: ${err.message}\n_Make sure a channel is linked to this group_`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'groupwrap',
    aliases: ['yearwrap', 'groupreview', 'wrapped'],
    category: 'social',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const parts = ctx.groupMeta?.participants || []
      const admins = parts.filter(p => p.admin)
      const memberCount = parts.length
      const groupName = ctx.groupMeta?.subject || 'This Group'
      const groupCreated = ctx.groupMeta?.creation
        ? new Date(ctx.groupMeta.creation * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
        : 'Unknown'

      const randomMember = parts[Math.floor(Math.random() * parts.length)]
      const randomAdmin = admins[Math.floor(Math.random() * admins.length)]

      const ACHIEVEMENTS = [
        '🏆 Survived another year without group drama (mostly)',
        '🔥 Broke the record for most back-to-back ignored messages',
        '😂 Generated enough memes to fill a hard drive',
        '🌍 Kept ${memberCount} people from being productive at work',
        '👻 Achieved ghost member levels never seen before',
        '📣 Held unofficial debates about things that don\'t matter',
        '💬 Sent 10,000+ messages while saying nothing useful',
        '🎲 Survived at least 3 "this group is dying" periods',
      ]

      const randomAchievement = ACHIEVEMENTS[Math.floor(Math.random() * ACHIEVEMENTS.length)]

      await sock.sendMessage(ctx.from, {
        text: [
          `🎁 *${groupName} — Year Wrapped*`,
          `${'═'.repeat(28)}`,
          ``,
          `📊 *Group Stats:*`,
          `  👥 Total Members:   ${memberCount}`,
          `  ⭐ Admins:         ${admins.length}`,
          `  📅 Group Since:    ${groupCreated}`,
          ``,
          `🌟 *Spotlight:*`,
          `  🏅 Random MVP:    @${randomMember?.id?.split('@')[0] || 'Unknown'}`,
          randomAdmin ? `  👑 Top Admin:     @${randomAdmin.id.split('@')[0]}` : '',
          ``,
          `🏆 *Achievement Unlocked:*`,
          randomAchievement,
          ``,
          `Here's to another year together! 🥂`,
          `${'═'.repeat(28)}`
        ].filter(l => l !== '').join('\n'),
        mentions: [randomMember?.id, randomAdmin?.id].filter(Boolean)
      }, { quoted: msg })
    }
  }
]
