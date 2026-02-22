import { downloadMediaMessage } from '@whiskeysockets/baileys'

export const confessionStore = new Map()
export const suggestionStore = new Map()

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
      try { ppUrl = await sock.profilePictureUrl(targetJid, 'image') } catch {}

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
        await sock.sendMessage(ctx.from, { image: { url: ppUrl }, caption: text, mentions: [targetJid] }, { quoted: msg })
      } else {
        await sock.sendMessage(ctx.from, { text, mentions: [targetJid] }, { quoted: msg })
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
            `📌 *Usage:* ${ctx.prefix}confession <your secret>`
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
        text: `✅ *Confession Sent!*\n\nYour confession #${confessId} has been posted anonymously.`
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
            ``,
            `📌 *Usage:* ${ctx.prefix}suggest <your idea>`
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
      await sock.sendMessage(ctx.from, { text: `✅ All suggestions cleared.` }, { quoted: msg })
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
        '3-6':  { year: 1957, event: 'Ghana became the first sub-Saharan African country to gain independence.' },
        '4-4':  { year: 1968, event: 'Martin Luther King Jr. was assassinated in Memphis, Tennessee.' },
        '7-20': { year: 1969, event: 'Apollo 11 landed on the moon. Neil Armstrong took his first steps.' },
        '10-1': { year: 1960, event: 'Nigeria gained independence from Britain. 🇳🇬' },
        '11-9': { year: 1989, event: 'The Berlin Wall fell, reuniting East and West Germany.' },
      }

      const key = `${month}-${day}`
      const entry = HISTORY[key]
      const FALLBACK = [
        `Many great things have happened on this day throughout history. Each day carries the weight of the past. 🌍`,
        `History is being made every single day — including today. Make it count. ⏳`,
      ]

      const eventText = entry
        ? `🗓️ *On this day, ${entry.year}:*\n\n${entry.event}`
        : `🗓️ *Today in History*\n\n${FALLBACK[day % FALLBACK.length]}`

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
    // FIXED: gcstatus now posts a WhatsApp status/story using status@broadcast
    // Admin replies to any message (text, image, video, audio) — bot posts it as a status
    command: 'gcstatus',
    aliases: ['poststatus', 'statuspost', 'gcpost'],
    category: 'social',
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {

      // Show usage if no quoted message and no text
      if (!ctx.quoted && !ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📢 *Post Group Status*`,
            `${'─'.repeat(28)}`,
            ``,
            `Post a WhatsApp status visible to group members.`,
            `Reply to any message with this command:`,
            ``,
            `  • Reply to a *text* message`,
            `  • Reply to an *image*`,
            `  • Reply to a *video*`,
            `  • Reply to an *audio/voice note*`,
            `  • Or just type: *${ctx.prefix}gcstatus <your text>*`,
            ``,
            `_Only group admins can use this._`
          ].join('\n')
        }, { quoted: msg })
      }

      // Get group members to include in statusJidList
      const parts = ctx.groupMeta?.participants || []
      const statusJidList = parts.map(p => p.id).filter(Boolean)

      const processing = await sock.sendMessage(ctx.from, { text: '📤 Posting status...' }, { quoted: msg })

      try {
        // ── Text only (no quoted message) ──────────────────
        if (!ctx.quoted && ctx.query) {
          await sock.sendMessage('status@broadcast', {
            text: ctx.query,
            backgroundColor: '#075E54',
            font: 0,
          }, {
            statusJidList,
            broadcast: true,
          })

          await sock.sendMessage(ctx.from, {
            edit: processing.key,
            text: `✅ *Status posted!*\n\n_"${ctx.query.slice(0, 60)}${ctx.query.length > 60 ? '...' : ''}"_`
          })
          return
        }

        // ── Quoted message — detect type and download ──────
        const quotedType = ctx.quotedType
        const buffer = await downloadMediaMessage(
          ctx.quoted, 'buffer', {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        )

        const caption = ctx.query || ''

        if (quotedType === 'imageMessage') {
          await sock.sendMessage('status@broadcast', {
            image: buffer,
            caption,
          }, { statusJidList, broadcast: true })

        } else if (quotedType === 'videoMessage') {
          await sock.sendMessage('status@broadcast', {
            video: buffer,
            caption,
            gifPlayback: false,
          }, { statusJidList, broadcast: true })

        } else if (quotedType === 'audioMessage') {
          await sock.sendMessage('status@broadcast', {
            audio: buffer,
            mimetype: 'audio/mp4',
            ptt: false,
          }, { statusJidList, broadcast: true })

        } else if (quotedType === 'conversation' || quotedType === 'extendedTextMessage') {
          const text = ctx.quotedBody || ctx.query
          if (!text) throw new Error('No text found in quoted message.')
          await sock.sendMessage('status@broadcast', {
            text,
            backgroundColor: '#075E54',
            font: 0,
          }, { statusJidList, broadcast: true })

        } else {
          // Fallback — forward whatever it is as text status
          const fallbackText = ctx.quotedBody || ctx.query
          if (!fallbackText) throw new Error('Unsupported message type for status.')
          await sock.sendMessage('status@broadcast', {
            text: fallbackText,
          }, { statusJidList, broadcast: true })
        }

        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: `✅ *Status posted successfully!*\n\n_Group members can now see it in the status tab._`
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: `❌ Failed to post status: ${err.message}`
        })
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
        '👻 Achieved ghost member levels never seen before',
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
