// commands/owner/control.js
// Commands: .broadcast | .shutdown | .restart | .cleardata | .setpp | .getpp | .setbio | .getbio
//           .addapikey | .removeapikey | .listapikeys | .setcurrentkey | .report

import { downloadMediaMessage } from '@whiskeysockets/baileys'

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

const BOT_ID     = () => process.env.BOT_ID || 'default'
const setSetting = (key, value) => w('/bot/settings', {
  method: 'POST',
  body:   JSON.stringify({ botId: BOT_ID(), key, value }),
})
const getSetting = (key) => w(`/bot/settings?botId=${BOT_ID()}&key=${key}`)

export default [

  // ── .broadcast ────────────────────────────────────────
  {
    command:  'broadcast',
    aliases:  ['bc', 'bcast'],
    category: 'owner',
    description: 'Send a message to all groups the bot is currently in',
    usage:    '.broadcast <message>',
    example:  '.broadcast Bot update: new features added!',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can broadcast messages.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a message to broadcast.\n📌 *Usage:* ${ctx.prefix}broadcast <message>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: '📢 Fetching all groups...'
      }, { quoted: msg })

      try {
        // Fetch all groups the bot is in
        const allGroups = await sock.groupFetchAllParticipating()
        const groupJids = Object.keys(allGroups)

        if (!groupJids.length) {
          return sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: '❌ Bot is not in any groups.'
          })
        }

        const bcMsg = [
          `📢 *Broadcast from Bot Owner*`,
          `${'─'.repeat(28)}`,
          ``,
          ctx.query,
          ``,
          `_— ${process.env.BOT_NAME || 'FireKid Dex'}_`
        ].join('\n')

        let sent    = 0
        let failed  = 0

        for (const jid of groupJids) {
          try {
            await sock.sendMessage(jid, { text: bcMsg })
            sent++
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500))
          } catch {
            failed++
          }
        }

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [
            `📢 *Broadcast Complete!*`,
            ``,
            `✅ Sent:   *${sent}* groups`,
            `❌ Failed: *${failed}* groups`,
            `📊 Total:  *${groupJids.length}* groups`
          ].join('\n')
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Broadcast failed: ${err.message}`
        })
      }
    }
  },

  // ── .shutdown ─────────────────────────────────────────
  {
    command:  'shutdown',
    aliases:  ['off', 'stop', 'kill'],
    category: 'owner',
    description: 'Shut down the bot process (owner only)',
    usage:    '.shutdown',
    example:  '.shutdown',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can shut down the bot.'
        }, { quoted: msg })
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `⛔ *Shutting Down...*`,
          ``,
          `🔥 ${process.env.BOT_NAME || 'FireKid Dex'} is going offline.`,
          ``,
          `_Bot will stop processing messages until restarted._`
        ].join('\n')
      }, { quoted: msg })

      // Give the message 2 seconds to send before shutting down
      setTimeout(() => {
        console.log('[Owner] Shutdown triggered by owner')
        process.exit(0)
      }, 2000)
    }
  },

  // ── .restart ──────────────────────────────────────────
  {
    command:  'restart',
    aliases:  ['reboot', 'reload'],
    category: 'owner',
    description: 'Restart the bot process (uses process manager like PM2/Render)',
    usage:    '.restart',
    example:  '.restart',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can restart the bot.'
        }, { quoted: msg })
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `🔄 *Restarting Bot...*`,
          ``,
          `⚙️ ${process.env.BOT_NAME || 'FireKid Dex'} is restarting.`,
          ``,
          `_Bot will be back online in a few seconds._`,
          `_If using Render/Railway, the service will auto-restart._`
        ].join('\n')
      }, { quoted: msg })

      setTimeout(() => {
        console.log('[Owner] Restart triggered by owner')
        // Exit with code 1 — process managers (PM2/Render) restart on non-zero exit
        process.exit(1)
      }, 2000)
    }
  },

  // ── .cleardata ────────────────────────────────────────
  {
    command:  'cleardata',
    aliases:  ['resetdata', 'wipedata'],
    category: 'owner',
    description: 'Clear bot settings and cached data from Worker KV',
    usage:    '.cleardata',
    example:  '.cleardata',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can clear bot data.'
        }, { quoted: msg })
      }

      const confirm = ctx.query?.toLowerCase().trim()

      if (confirm !== 'confirm') {
        return sock.sendMessage(ctx.from, {
          text: [
            `⚠️ *This will clear all bot settings from the Worker.*`,
            ``,
            `This includes: sudo list, premium list, block list, ban list, API keys, bot mode, and all settings.`,
            ``,
            `*Group-specific settings (antilink, antibad, etc.) are NOT affected.*`,
            ``,
            `To confirm, type: \`${ctx.prefix}cleardata confirm\``
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        const res = await w('/bot/settings/clear', {
          method: 'DELETE',
          body:   JSON.stringify({ botId: BOT_ID() }),
        })

        await sock.sendMessage(ctx.from, {
          text: res?.ok !== false
            ? `✅ *Bot data cleared.*\n\nAll settings reset to defaults.\n_Restart recommended: ${ctx.prefix}restart_`
            : `⚠️ Partial clear — Worker responded: ${res?.error || 'Unknown'}`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .setpp ────────────────────────────────────────────
  {
    command:  'setpp',
    aliases:  ['setpfp', 'changepp'],
    category: 'owner',
    description: 'Change the bot\'s WhatsApp profile picture',
    usage:    '.setpp (reply to an image)',
    example:  'Reply to any image with .setpp',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can change the bot profile picture.'
        }, { quoted: msg })
      }

      // Must quote an image or send with an image
      const hasQuotedImg = ctx.quoted && ctx.quotedType === 'imageMessage'
      const msgType      = Object.keys(msg.message || {})[0]
      const hasDirectImg = msgType === 'imageMessage'

      if (!hasQuotedImg && !hasDirectImg) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to or send an image with ${ctx.prefix}setpp`
        }, { quoted: msg })
      }

      try {
        const targetMsg = hasQuotedImg ? ctx.quoted : msg
        const buffer    = await downloadMediaMessage(
          targetMsg,
          'buffer',
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        )

        await sock.updateProfilePicture(ctx.botId, buffer)

        await sock.sendMessage(ctx.from, {
          text: `✅ *Bot profile picture updated!*`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to update profile picture: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .getpp ────────────────────────────────────────────
  {
    command:  'getpp',
    aliases:  ['botpp', 'botpfp'],
    category: 'owner',
    description: 'Get the bot\'s current profile picture',
    usage:    '.getpp',
    example:  '.getpp',

    handler: async (sock, msg, args, ctx) => {
      try {
        const ppUrl = await sock.profilePictureUrl(ctx.botId, 'image')

        await sock.sendMessage(ctx.from, {
          image: { url: ppUrl },
          caption: `🤖 *${process.env.BOT_NAME || 'FireKid Dex'}'s Profile Picture*`
        }, { quoted: msg })

      } catch (err) {
        // No profile picture set
        await sock.sendMessage(ctx.from, {
          text: `❌ Could not get bot profile picture.\nThe bot may not have one set yet.\n\n_Error: ${err.message}_`
        }, { quoted: msg })
      }
    }
  },

  // ── .setbio ───────────────────────────────────────────
  {
    command:  'setbio',
    aliases:  ['changebio', 'setstatus'],
    category: 'owner',
    description: 'Change the bot\'s WhatsApp bio/status text',
    usage:    '.setbio <text>',
    example:  '.setbio 🔥 FireKid Dex | Always Online',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can change the bot bio.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a bio text.\n📌 *Usage:* ${ctx.prefix}setbio <text>`
        }, { quoted: msg })
      }

      if (ctx.query.length > 139) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Bio must be 139 characters or less. Yours: ${ctx.query.length}`
        }, { quoted: msg })
      }

      try {
        await sock.updateProfileStatus(ctx.query)

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Bot bio updated!*`,
            ``,
            `📝 New bio:`,
            `_"${ctx.query}"_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to update bio: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .getbio ───────────────────────────────────────────
  {
    command:  'getbio',
    aliases:  ['botbio', 'biostatus'],
    category: 'owner',
    description: 'Get the bot\'s current WhatsApp bio/status',
    usage:    '.getbio',
    example:  '.getbio',

    handler: async (sock, msg, args, ctx) => {
      try {
        const status = await sock.fetchStatus(ctx.botId)

        await sock.sendMessage(ctx.from, {
          text: [
            `📝 *Bot Bio/Status*`,
            ``,
            status?.status
              ? `"${status.status}"`
              : `_No bio set._`,
            ``,
            `_Change with ${ctx.prefix}setbio <text>_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Could not fetch bot bio: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .addapikey ────────────────────────────────────────
  {
    command:  'addapikey',
    aliases:  ['setapikey', 'apikeyadd'],
    category: 'owner',
    description: 'Add an API key to the bot (groq, gemini, openrouter)',
    usage:    '.addapikey <type> <key>',
    example:  '.addapikey groq gsk_xxxxxxxxxxxxxxxxxxxx',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can manage API keys.'
        }, { quoted: msg })
      }

      const VALID_TYPES = ['groq', 'gemini', 'openrouter', 'openai', 'deepseek']

      if (!ctx.args[0] || !ctx.args[1]) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🔑 *Add API Key*`,
            ``,
            `*Usage:* ${ctx.prefix}addapikey <type> <key>`,
            ``,
            `*Supported types:*`,
            VALID_TYPES.map(t => `  • ${t}`).join('\n'),
            ``,
            `*Example:*`,
            `${ctx.prefix}addapikey groq gsk_xxx`
          ].join('\n')
        }, { quoted: msg })
      }

      const keyType = ctx.args[0].toLowerCase()
      const keyVal  = ctx.args[1]

      if (!VALID_TYPES.includes(keyType)) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid key type. Supported: ${VALID_TYPES.join(', ')}`
        }, { quoted: msg })
      }

      try {
        const res     = await getSetting(`apikeys_${keyType}`)
        const keyList = Array.isArray(res?.value) ? res.value : []

        if (keyList.includes(keyVal)) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ This key is already added for ${keyType}.`
          }, { quoted: msg })
        }

        keyList.push(keyVal)
        await setSetting(`apikeys_${keyType}`, keyList)

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *API Key Added*`,
            ``,
            `🔑 Type:  *${keyType.toUpperCase()}*`,
            `🔢 Keys:  *${keyList.length}* total`,
            ``,
            `_Key: ${keyVal.slice(0, 8)}...${keyVal.slice(-4)}_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .removeapikey ─────────────────────────────────────
  {
    command:  'removeapikey',
    aliases:  ['delapikey', 'rmapikey'],
    category: 'owner',
    description: 'Remove an API key from the bot',
    usage:    '.removeapikey <type> <key>',
    example:  '.removeapikey groq gsk_xxxxxxxxxxxxxxxxxxxx',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can manage API keys.'
        }, { quoted: msg })
      }

      if (!ctx.args[0] || !ctx.args[1]) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Usage: ${ctx.prefix}removeapikey <type> <key>`
        }, { quoted: msg })
      }

      const keyType = ctx.args[0].toLowerCase()
      const keyVal  = ctx.args[1]

      try {
        const res     = await getSetting(`apikeys_${keyType}`)
        const keyList = Array.isArray(res?.value) ? res.value : []

        if (!keyList.includes(keyVal)) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Key not found for ${keyType}.`
          }, { quoted: msg })
        }

        const updated = keyList.filter(k => k !== keyVal)
        await setSetting(`apikeys_${keyType}`, updated)

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *API Key Removed*`,
            ``,
            `🔑 Type: *${keyType.toUpperCase()}*`,
            `🔢 Remaining: *${updated.length}* key(s)`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .listapikeys ──────────────────────────────────────
  {
    command:  'listapikeys',
    aliases:  ['apikeys', 'showkeys'],
    category: 'owner',
    description: 'List all stored API keys (masked for security)',
    usage:    '.listapikeys',
    example:  '.listapikeys',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can view API keys.'
        }, { quoted: msg })
      }

      try {
        const TYPES = ['groq', 'gemini', 'openrouter', 'openai', 'deepseek']
        const lines = []

        for (const t of TYPES) {
          const res  = await getSetting(`apikeys_${t}`)
          const keys = Array.isArray(res?.value) ? res.value : []

          if (keys.length) {
            lines.push(`🔑 *${t.toUpperCase()}* (${keys.length}):`)
            keys.forEach((k, i) => {
              lines.push(`  ${i + 1}. ${k.slice(0, 8)}...${k.slice(-4)}`)
            })
          } else {
            lines.push(`🔑 *${t.toUpperCase()}*: _None_`)
          }
        }

        await sock.sendMessage(ctx.from, {
          text: [
            `🔑 *API Keys*`,
            `${'─'.repeat(26)}`,
            ``,
            ...lines,
            ``,
            `_Keys are masked for security_`,
            `_Add with ${ctx.prefix}addapikey <type> <key>_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .report ───────────────────────────────────────────
  {
    command:  'report',
    aliases:  ['bug', 'feedback'],
    category: 'owner',
    description: 'Send a bug report or feedback to the bot owner',
    usage:    '.report <message>',
    example:  '.report The .play command is broken',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Describe the issue.\n📌 *Usage:* ${ctx.prefix}report <message>`
        }, { quoted: msg })
      }

      const ownerJid = `${process.env.OWNER_NUMBER}@s.whatsapp.net`

      // Send to owner DM
      try {
        await sock.sendMessage(ownerJid, {
          text: [
            `🐛 *New Bug Report / Feedback*`,
            `${'─'.repeat(30)}`,
            ``,
            `👤 From:  @${ctx.senderNumber}`,
            `💬 Chat:  ${ctx.isGroup ? (ctx.groupMeta?.subject || ctx.from) : 'DM'}`,
            `📅 Time:  ${new Date().toLocaleString()}`,
            ``,
            `📝 *Message:*`,
            ctx.query
          ].join('\n'),
          mentions: [ctx.sender]
        })

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Report Sent!*`,
            ``,
            `Your report has been forwarded to the bot owner.`,
            ``,
            `_"${ctx.query.slice(0, 60)}${ctx.query.length > 60 ? '...' : ''}"_`,
            ``,
            `_Thank you for the feedback! 🙏_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Could not send report: ${err.message}\n\nContact owner directly: wa.me/${process.env.OWNER_NUMBER}`
        }, { quoted: msg })
      }
    }
  }

]
