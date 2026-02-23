import { downloadMediaMessage } from '@whiskeysockets/baileys'
import os from 'os'

const formatBytes = (bytes) => {
  if (bytes === 0) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)}${sizes[i]}`
}

export default [
  {
    command: 'broadcast',
    aliases: ['bc', 'bcast'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a message to broadcast.\n📌 *Usage:* ${ctx.prefix}broadcast <message>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, { text: '📢 Fetching all groups...' }, { quoted: msg })

      try {
        const allGroups = await sock.groupFetchAllParticipating()
        const groupJids = Object.keys(allGroups)

        if (!groupJids.length) {
          return sock.sendMessage(ctx.from, { edit: placeholder.key, text: '❌ Bot is not in any groups.' })
        }

        const bcMsg = [
          `📢 *Broadcast from Bot Owner*`,
          `${'─'.repeat(28)}`,
          ``,
          ctx.query,
          ``,
          `_— ${ctx.botName}_`
        ].join('\n')

        let sent = 0, failed = 0

        for (const jid of groupJids) {
          try {
            await sock.sendMessage(jid, { text: bcMsg })
            sent++
            await new Promise(r => setTimeout(r, 500))
          } catch { failed++ }
        }

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [`📢 *Broadcast Complete!*`, ``, `✅ Sent:   *${sent}* groups`, `❌ Failed: *${failed}* groups`, `📊 Total:  *${groupJids.length}* groups`].join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Broadcast failed: ${err.message}` })
      }
    }
  },

  {
    command: 'shutdown',
    aliases: ['off', 'stop', 'kill'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [`⛔ *Shutting Down...*`, ``, `🔥 ${ctx.botName} is going offline.`, ``, `_Bot will stop processing messages until restarted._`].join('\n')
      }, { quoted: msg })
      setTimeout(() => process.exit(0), 2000)
    }
  },

  {
    command: 'restart',
    aliases: ['reboot', 'reload'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [`🔄 *Restarting Bot...*`, ``, `⚙️ ${ctx.botName} is restarting.`, ``, `_Bot will be back online in a few seconds._`].join('\n')
      }, { quoted: msg })
      setTimeout(() => process.exit(1), 2000)
    }
  },

  {
    command: 'cleardata',
    aliases: ['resetdata', 'wipedata'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const confirm = ctx.query?.toLowerCase().trim()

      if (confirm !== 'confirm') {
        return sock.sendMessage(ctx.from, {
          text: [
            `⚠️ *This will clear all bot settings.*`,
            ``,
            `This includes: sudo list, premium list, block list, ban list, bot mode, and all settings.`,
            ``,
            `To confirm, type: \`${ctx.prefix}cleardata confirm\``
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        const knownKeys = ['sudo_list', 'premium_list', 'block_list', 'ban_list', 'bot:mode', 'owner:jid', 'support:link']
        for (const key of knownKeys) {
          try { await api.sessionDelete(key) } catch {}
        }

        await sock.sendMessage(ctx.from, {
          text: `✅ *Bot data cleared.*\n\nAll settings reset to defaults.\n_Restart recommended: ${ctx.prefix}restart_`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'setpp',
    aliases: ['setpfp', 'changepp'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const hasQuotedImg = ctx.quoted && ctx.quotedType === 'imageMessage'
      const msgType = Object.keys(msg.message || {})[0]
      const hasDirectImg = msgType === 'imageMessage'

      if (!hasQuotedImg && !hasDirectImg) {
        return sock.sendMessage(ctx.from, { text: `❌ Reply to or send an image with ${ctx.prefix}setpp` }, { quoted: msg })
      }

      try {
        const targetMsg = hasQuotedImg ? ctx.quoted : msg
        const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
        await sock.updateProfilePicture(ctx.botId, buffer)
        await sock.sendMessage(ctx.from, { text: `✅ *Bot profile picture updated!*` }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed to update profile picture: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'getpp',
    aliases: ['botpp', 'botpfp'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      try {
        const ppUrl = await sock.profilePictureUrl(ctx.botId, 'image')
        await sock.sendMessage(ctx.from, { image: { url: ppUrl }, caption: `🤖 *${ctx.botName}'s Profile Picture*` }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Could not get bot profile picture.\n\n_Error: ${err.message}_` }, { quoted: msg })
      }
    }
  },

  {
    command: 'setbio',
    aliases: ['changebio', 'setstatus'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, { text: `❌ Provide a bio text.\n📌 *Usage:* ${ctx.prefix}setbio <text>` }, { quoted: msg })
      }
      if (ctx.query.length > 139) {
        return sock.sendMessage(ctx.from, { text: `❌ Bio must be 139 characters or less. Yours: ${ctx.query.length}` }, { quoted: msg })
      }
      try {
        await sock.updateProfileStatus(ctx.query)
        await sock.sendMessage(ctx.from, { text: [`✅ *Bot bio updated!*`, ``, `📝 New bio:`, `_"${ctx.query}"_`].join('\n') }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed to update bio: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'getbio',
    aliases: ['botbio', 'biostatus'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      try {
        const status = await sock.fetchStatus(ctx.botId)
        await sock.sendMessage(ctx.from, {
          text: [`📝 *Bot Bio/Status*`, ``, status?.status ? `"${status.status}"` : `_No bio set._`, ``, `_Change with ${ctx.prefix}setbio <text>_`].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Could not fetch bot bio: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── report — routes to your admin dashboard via Worker ───────────────────
  {
    command: 'report',
    aliases: ['bug', 'feedback'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, { text: `❌ Describe the issue.\n📌 *Usage:* ${ctx.prefix}report <message>` }, { quoted: msg })
      }

      const groupName = ctx.isGroup ? (ctx.groupMeta?.subject || ctx.from) : 'DM'

      try {
        await api.sendReport(ctx.senderNumber, ctx.from, ctx.isGroup, groupName, ctx.query)

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Report Sent!*`,
            ``,
            `Your report has been forwarded to the bot developer.`,
            ``,
            `_"${ctx.query.slice(0, 80)}${ctx.query.length > 80 ? '...' : ''}"_`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Could not send report: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'speedtest',
    aliases: ['netspeed', 'internet'],
    category: 'owner',
    handler: async (sock, msg, ctx, { api }) => {
      const placeholder = await sock.sendMessage(ctx.from, { text: '🌐 Testing server internet speed...' }, { quoted: msg })

      try {
        const TEST_URL = 'https://speed.cloudflare.com/__down?bytes=5000000'
        const startTime = Date.now()
        const res = await fetch(TEST_URL)
        if (!res.ok) throw new Error('Speed test server unavailable')

        const buffer = await res.arrayBuffer()
        const elapsed = (Date.now() - startTime) / 1000
        const bytes = buffer.byteLength
        const mbps = ((bytes * 8) / elapsed / 1_000_000).toFixed(2)

        let quality
        if (parseFloat(mbps) >= 100) quality = '🚀 Blazing Fast'
        else if (parseFloat(mbps) >= 50) quality = '⚡ Fast'
        else if (parseFloat(mbps) >= 20) quality = '✅ Good'
        else if (parseFloat(mbps) >= 5) quality = '🟡 Moderate'
        else quality = '🔴 Slow'

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [`🌐 *Speed Test Results*`, `${'─'.repeat(28)}`, ``, `📥 Download: *${mbps} Mbps*`, `📦 Data:     *${formatBytes(bytes)}*`, `⏱️  Duration: *${elapsed.toFixed(2)}s*`, ``, `Quality: *${quality}*`, ``, `_Tested via Cloudflare Edge_`].join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ Speed test failed: ${err.message}` })
      }
    }
  },


  // ── support — hardcoded group link ───────────────────────────────────────
  {
    command: 'support',
    aliases: ['helpgroup', 'community'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `🆘 *${ctx.botName} Support*`,
          `${'─'.repeat(28)}`,
          ``,
          `Join the official support group for:`,
          `  • Bug reports & feedback`,
          `  • Feature requests`,
          `  • General help`,
          `  • Bot updates & news`,
          ``,
          `*👥 Support Group:*`,
          `https://chat.whatsapp.com/HiZu3bsMQ2DAejOxBz1KgB?mode=gi_t`,
          ``,
          `*👨‍💻 Developer DM:*`,
          `wa.me/2348064610975`,
          ``,
          `_Response time: usually within 24 hours_`,
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── about — bot info ──────────────────────────────────────────────────────
  {
    command: 'about',
    aliases: ['botinfo', 'info'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `🔥 *About ${ctx.botName}*`,
          `${'─'.repeat(30)}`,
          ``,
          `${ctx.botName} is a next-generation WhatsApp bot built by *FireKid846* — packed with 500+ commands across AI, group management, economy, anti-spam, media downloads, automation, games and more.`,
          ``,
          `Running on Baileys + Cloudflare Workers with a full dashboard. Pair your number, manage your bot, and unlock premium features all in one place.`,
          ``,
          `*🛠 Built With:*`,
          `  Baileys (WhatsApp Web API)`,
          `  Node.js ESM`,
          `  Cloudflare Workers + D1 + KV`,
          ``,
          `*🌐 Dashboard:* https://firekidofficial.name.ng`,
          `*📦 Repo:* https://github.com/Firekid-is-him/Firekid-Dex-V1`,
          ``,
          `_Type ${ctx.prefix}menu to explore all commands_`,
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── repo — bot source code ────────────────────────────────────────────────
  {
    command: 'repo',
    aliases: ['source', 'github', 'code'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `📦 *${ctx.botName} Repository*`,
          `${'─'.repeat(28)}`,
          ``,
          `Here is the bot repo:`,
          ``,
          `https://github.com/Firekid-is-him/Firekid-Dex-V1`,
          ``,
          `⭐ Star the repo if you like the bot!`,
          `🐛 Found a bug? Use ${ctx.prefix}report <issue>`,
        ].join('\n')
      }, { quoted: msg })
    }
  },

]
