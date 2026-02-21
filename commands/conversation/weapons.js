import { generateForwardMessageContent, generateWAMessageFromContent, generateMessageID, proto } from '@whiskeysockets/baileys'

export const lastBotMessages = new Map()

const storeBotMsg = (jid, sentMsg) => {
  if (!sentMsg?.key) return
  const list = lastBotMessages.get(jid) || []
  list.push(sentMsg.key)
  if (list.length > 20) list.shift()
  lastBotMessages.set(jid, list)
}

export default [
  {
    command: 'unsend',
    aliases: ['deletelast', 'delbotmsg'],
    category: 'conversation',
    handler: async (sock, msg, ctx, { api }) => {
      const msgList = lastBotMessages.get(ctx.from)
      if (!msgList || !msgList.length) {
        return sock.sendMessage(ctx.from, {
          text: `❌ No recent bot messages found to delete.`
        }, { quoted: msg })
      }

      const keyToDelete = msgList.pop()
      lastBotMessages.set(ctx.from, msgList)

      try {
        await sock.sendMessage(ctx.from, { delete: keyToDelete })
        await sock.sendMessage(ctx.from, { text: `🗑️ Last bot message deleted.` }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Could not delete: ${err.message}\n_Bot may no longer have permission to delete this message._`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'recall',
    aliases: ['deletemsg', 'unsendquoted'],
    category: 'conversation',
    adminOnly: false,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.quoted) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to a message to delete it.\n📌 *Usage:* Reply to any message + ${ctx.prefix}recall`
        }, { quoted: msg })
      }

      const isOwnMessage = ctx.quotedSender === ctx.botId || ctx.quotedSender === ctx.sender

      if (!isOwnMessage && !ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: `❌ You can only recall your own messages.\n_Admins can recall anyone's messages._`
        }, { quoted: msg })
      }

      try {
        await sock.sendMessage(ctx.from, { delete: ctx.quoted.key })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to delete: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'vanish',
    aliases: ['disappear', 'selfdelete'],
    category: 'conversation',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a message.\n📌 *Usage:* ${ctx.prefix}vanish <text>\n_Message will disappear after 7 days (ephemeral)_`
        }, { quoted: msg })
      }

      const WA_DEFAULT_EPHEMERAL = 604800

      try {
        const sent = await sock.sendMessage(ctx.from, {
          text: ctx.query
        }, {
          quoted: msg,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        storeBotMsg(ctx.from, sent)
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to send vanish message: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'whisper',
    aliases: ['dm', 'secretdm'],
    category: 'conversation',
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0]

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🤫 *Whisper / DM*`,
            ``,
            `Silently DM someone from the group.`,
            ``,
            `📌 *Usage:* ${ctx.prefix}whisper @user <message>`,
            ``,
            `_Example: ${ctx.prefix}whisper @john Hey! check this out_`
          ].join('\n')
        }, { quoted: msg })
      }

      const textParts = ctx.query.replace(/@\d+/g, '').trim()
      if (!textParts) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Include a message after the mention.\n📌 *Usage:* ${ctx.prefix}whisper @user <message>`
        }, { quoted: msg })
      }

      try {
        const sent = await sock.sendMessage(targetJid, {
          text: [
            `💬 *Message from ${ctx.groupMeta?.subject || 'a group'}*`,
            ``,
            textParts
          ].join('\n')
        })

        storeBotMsg(ctx.from, sent)

        await sock.sendMessage(ctx.from, {
          text: `✅ Whisper delivered to @${targetJid.split('@')[0]}`,
          mentions: [targetJid]
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to send: ${err.message}\n_User may have the bot blocked_`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'forwardnuke',
    aliases: ['nuke', 'maxforward'],
    category: 'conversation',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.quoted) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📤 *Forward Nuke*`,
            ``,
            `Reply to any message then use this command.`,
            `It sends it with maximum forward count (appears as "Forwarded many times").`,
            ``,
            `📌 *Usage:* Reply to a message + ${ctx.prefix}forwardnuke`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        const forwardContent = generateForwardMessageContent(ctx.quoted, true)

        const msgType = Object.keys(forwardContent)[0]
        if (forwardContent[msgType]?.contextInfo) {
          forwardContent[msgType].contextInfo.forwardingScore = 9999
          forwardContent[msgType].contextInfo.isForwarded = true
        }

        const waMsg = generateWAMessageFromContent(ctx.from, forwardContent, {
          userJid: ctx.botId,
          quoted: msg,
          timestamp: new Date()
        })

        await sock.relayMessage(ctx.from, waMsg.message, { messageId: waMsg.key.id })
        storeBotMsg(ctx.from, waMsg)
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Forward nuke failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'seen',
    aliases: ['readreceipt', 'didtheyread'],
    category: 'conversation',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.quoted) {
        return sock.sendMessage(ctx.from, {
          text: [
            `👁️ *Read Receipt Check*`,
            ``,
            `Reply to a message to check if it was read.`,
            `📌 *Usage:* Reply to message + ${ctx.prefix}seen`,
            ``,
            `_Note: Only works if the sender has read receipts enabled._`
          ].join('\n')
        }, { quoted: msg })
      }

      const quotedMsg = ctx.quoted
      const msgTimestamp = quotedMsg.messageTimestamp || Math.floor(Date.now() / 1000)
      const sentTime = new Date(msgTimestamp * 1000)
      const sentBy = ctx.quotedSender ? `@${ctx.quotedSender.split('@')[0]}` : 'Unknown'

      const readInfo = quotedMsg.status

      const statusMap = {
        0: '📤 Pending (clock)',
        1: '📤 Sent (single tick)',
        2: '📨 Delivered (double tick)',
        3: '👁️ Read (blue ticks)',
        4: '🎵 Played (audio read)',
      }

      const statusText = statusMap[readInfo] || `❓ Unknown (${readInfo})`

      await sock.sendMessage(ctx.from, {
        text: [
          `👁️ *Message Status*`,
          `${'─'.repeat(26)}`,
          ``,
          `📨 From:   ${sentBy}`,
          `📅 Sent:   ${sentTime.toLocaleString('en-GB')}`,
          ``,
          `Status: *${statusText}*`,
          ``,
          `_Read receipts depend on sender's privacy settings_`
        ].join('\n'),
        mentions: ctx.quotedSender ? [ctx.quotedSender] : []
      }, { quoted: msg })
    }
  },

  {
    command: 'lastseen',
    aliases: ['lastactive', 'lasttime'],
    category: 'conversation',
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to someone.\n📌 *Usage:* ${ctx.prefix}lastseen @user`
        }, { quoted: msg })
      }

      const processing = await sock.sendMessage(ctx.from, { text: '🔍 Checking last seen...' }, { quoted: msg })

      try {
        const status = await sock.fetchStatus(targetJid)
        const num = targetJid.split('@')[0]
        let ppUrl

        try {
          ppUrl = await sock.profilePictureUrl(targetJid, 'image')
        } catch {}

        const bio = status?.status || 'No status set'
        const updatedAt = status?.setAt ? new Date(status.setAt).toLocaleString('en-GB') : 'Unknown'

        if (ppUrl) {
          await sock.sendMessage(ctx.from, {
            image: { url: ppUrl },
            caption: [
              `👁️ *Last Seen Info*`,
              `${'─'.repeat(26)}`,
              ``,
              `👤 *Number:* +${num}`,
              `📝 *Bio:*    ${bio}`,
              `📅 *Bio Set:* ${updatedAt}`,
              ``,
              `_Last seen time depends on their privacy settings._`,
              `_If they have it set to "Nobody", it won't be visible._`
            ].join('\n'),
            mentions: [targetJid]
          }, { quoted: msg })
          await sock.sendMessage(ctx.from, { delete: processing.key })
        } else {
          await sock.sendMessage(ctx.from, {
            edit: processing.key,
            text: [
              `👁️ *Last Seen Info*`,
              `${'─'.repeat(26)}`,
              ``,
              `👤 *Number:* +${num}`,
              `📝 *Bio:*    ${bio}`,
              `📅 *Bio Set:* ${updatedAt}`,
              ``,
              `_Last seen time depends on their privacy settings._`
            ].join('\n')
          })
        }
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: `❌ Could not fetch info: ${err.message}\n_User may have privacy set to "Nobody"_`
        })
      }
    }
  },

  {
    command: 'callout',
    aliases: ['expose', 'blast'],
    category: 'conversation',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to someone.\n📌 *Usage:* ${ctx.prefix}callout @user`
        }, { quoted: msg })
      }

      const num = targetJid.split('@')[0]
      const name = `@${num}`

      const CALLOUTS = [
        `${name} has been suspiciously quiet in this group lately... 👀`,
        `${name} reads every message but never replies. We see you. 🙄`,
        `${name} just left us on read AGAIN. Investigation ongoing. 🔍`,
        `${name} has been online for 3 hours but won't reply to a single message. 🕵️`,
        `BREAKING NEWS: ${name} was spotted typing... then stopped. Three times. 💀`,
        `${name} will react with 😂 to everything but will NEVER type a response. 🤡`,
        `PSA: ${name} told 5 different people "they'd be there" and then went offline. 🏃`,
        `${name} has been "in a meeting" for 7 hours straight. 📊`,
        `Sources confirm ${name} has seen your message and simply chosen violence. ☠️`,
        `${name} be liking other people's status but ignoring this group chat. Noted. 😒`,
      ]

      const callout = CALLOUTS[Math.floor(Math.random() * CALLOUTS.length)]

      const sent = await sock.sendMessage(ctx.from, {
        text: [
          `📢 *PUBLIC CALLOUT*`,
          `${'─'.repeat(28)}`,
          ``,
          callout,
          ``,
          `_This has been a public service announcement._`
        ].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })

      storeBotMsg(ctx.from, sent)
    }
  },

  {
    command: 'overthink',
    aliases: ['overanalyze', 'spiral'],
    category: 'conversation',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Give me something to overthink.\n📌 *Usage:* ${ctx.prefix}overthink <topic>`
        }, { quoted: msg })
      }

      const SPIRALS = [
        [
          `You asked: *"${ctx.query}"*`,
          ``,
          `Okay but like... what does that even MEAN? Are we talking surface level "${ctx.query}" or the deeper existential implications of "${ctx.query}"? Because if we're going deep, we need to unpack a LOT.`,
          ``,
          `First of all — who decided this was a valid thing to ask? Was it you? Was it society? Was it the simulation? Because I've been thinking and none of us really chose to be here, including "${ctx.query}".`,
          ``,
          `And if "${ctx.query}" is real, does it have feelings? Does it matter? Does ANYTHING matter? Or are we just atoms pretending to have opinions about "${ctx.query}" while hurtling through space on a rock?`,
          ``,
          `Anyway I've been staring at the ceiling for 40 minutes and I think I need water. 🚿`
        ],
        [
          `*"${ctx.query}"* you say...`,
          ``,
          `I started thinking about it. Then I thought about what thinking IS. Then I thought about whether MY thoughts are even real or just patterns. Then I thought maybe I should text someone. But what if they're busy? What if they're not busy and they're just ignoring me because of the ${ctx.query} situation?`,
          ``,
          `Actually let me make a pros and cons list. *Pros:* ${ctx.query} might be fine. *Cons:* everything else.`,
          ``,
          `I asked three people for advice. Two said yes. One said no. I'm now MORE confused. What does it mean? Is the odd one out wrong or is the odd one out RIGHT because they're seeing something others can't?`,
          ``,
          `It's 3am. I'm fine. 😐`
        ],
        [
          `Okay so "${ctx.query}"...`,
          ``,
          `Step 1: Google it. Step 2: Get 47 conflicting answers. Step 3: Convince myself the worst answer is probably correct.`,
          ``,
          `Step 4: Think about all the times in my life this topic came up and whether I handled them correctly. Conclude: no.`,
          ``,
          `Step 5: Wonder if everyone else also overthinks "${ctx.query}" or if I'm the only one. Step 6: Convince myself I'm the only one. Step 7: Overthink that.`,
          ``,
          `Conclusion: "${ctx.query}" is complicated and I'm going to need at least one more week to process this. Maybe two. 🧠💥`
        ]
      ]

      const spiral = SPIRALS[Math.floor(Math.random() * SPIRALS.length)]
      const sent = await sock.sendMessage(ctx.from, {
        text: spiral.join('\n')
      }, { quoted: msg })

      storeBotMsg(ctx.from, sent)
    }
  }
]
