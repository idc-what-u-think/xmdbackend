// commands/anti/antilink.js
// Commands: .antilink | .linkwhitelist
//
// Modes:
//   off     → disabled
//   delete  → silently delete the link
//   warn    → delete + warn the sender
//   kick    → delete + kick the sender
//
// The ENFORCEMENT (actually deleting messages) happens in index.js.
// This command just sets the mode in Worker KV per group.
//
// Worker:
//   GET  /bot/gsettings?gid=...          → read settings
//   POST /bot/gsettings                  → { gid, key, value }

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

const getGS = (gid) => w(`/bot/gsettings?gid=${encodeURIComponent(gid)}`)
const setGS = (gid, key, value) => w('/bot/gsettings', {
  method: 'POST',
  body:   JSON.stringify({ gid, key, value }),
})

const VALID_MODES = ['off', 'delete', 'warn', 'kick']

export default [

  // ── .antilink ─────────────────────────────────────────
  {
    command:  'antilink',
    aliases:  ['antilinkmode'],
    category: 'anti',
    description: 'Block WhatsApp/group invite links in the group. Modes: off | delete | warn | kick',
    usage:    '.antilink <off|delete|warn|kick>',
    example:  '.antilink warn',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure antilink.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      // No arg — show current status
      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.antilink || res?.antilink || 'off'
        const white   = res?.data?.antilink_whitelist || res?.antilink_whitelist || []

        return sock.sendMessage(ctx.from, {
          text: [
            `🔗 *Anti-Link Settings*`,
            ``,
            `Current mode: *${current.toUpperCase()}*`,
            ``,
            `📋 *Available modes:*`,
            `• \`off\`    — disabled`,
            `• \`delete\` — silently delete the link`,
            `• \`warn\`   — delete + warn sender (auto-kick at 3 warns)`,
            `• \`kick\`   — delete + immediately kick sender`,
            ``,
            white.length
              ? `✅ Whitelisted links:\n${white.map(u => `  • ${u}`).join('\n')}`
              : `_No whitelisted links. Use ${ctx.prefix}linkwhitelist <domain> to add._`,
            ``,
            `Usage: \`${ctx.prefix}antilink <mode>\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!VALID_MODES.includes(input)) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid mode. Choose: \`off\` | \`delete\` | \`warn\` | \`kick\``
        }, { quoted: msg })
      }

      if (input !== 'off' && !ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to enforce antilink.'
        }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'antilink', input)

        const descriptions = {
          off:    `Anti-link has been *disabled*. Links are allowed.`,
          delete: `Anti-link set to *DELETE*. All links will be silently removed.`,
          warn:   `Anti-link set to *WARN*. Links deleted + sender warned. At 3 warnings they get kicked.`,
          kick:   `Anti-link set to *KICK*. Anyone who sends a link gets immediately kicked.`,
        }

        await sock.sendMessage(ctx.from, {
          text: `🔗 *Anti-Link Updated*\n\n${descriptions[input]}`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .linkwhitelist ────────────────────────────────────
  {
    command:  'linkwhitelist',
    aliases:  ['whitelistlink', 'allowlink'],
    category: 'anti',
    description: 'Whitelist a domain so antilink ignores it (e.g. your own group links)',
    usage:    '.linkwhitelist <domain>  or  .linkwhitelist remove <domain>',
    example:  '.linkwhitelist chat.whatsapp.com',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can manage the link whitelist.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `✅ *Link Whitelist*`,
            ``,
            `Add:    \`${ctx.prefix}linkwhitelist <domain>\``,
            `Remove: \`${ctx.prefix}linkwhitelist remove <domain>\``,
            `List:   \`${ctx.prefix}linkwhitelist list\``,
            ``,
            `Example: \`${ctx.prefix}linkwhitelist chat.whatsapp.com\``
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        const res     = await getGS(ctx.from)
        const settings = res?.data || res || {}
        let   whitelist = Array.isArray(settings.antilink_whitelist)
          ? settings.antilink_whitelist
          : []

        const subCmd = ctx.args[0]?.toLowerCase()

        if (subCmd === 'list') {
          if (!whitelist.length) {
            return sock.sendMessage(ctx.from, {
              text: '📋 No whitelisted domains yet.'
            }, { quoted: msg })
          }
          return sock.sendMessage(ctx.from, {
            text: `✅ *Whitelisted Domains:*\n\n${whitelist.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
          }, { quoted: msg })
        }

        if (subCmd === 'remove') {
          const domain = ctx.args[1]?.toLowerCase().trim()
          if (!domain) {
            return sock.sendMessage(ctx.from, {
              text: `❌ Provide a domain to remove.\n${ctx.prefix}linkwhitelist remove <domain>`
            }, { quoted: msg })
          }

          if (!whitelist.includes(domain)) {
            return sock.sendMessage(ctx.from, {
              text: `❌ *${domain}* is not in the whitelist.`
            }, { quoted: msg })
          }

          whitelist = whitelist.filter(d => d !== domain)
          await setGS(ctx.from, 'antilink_whitelist', whitelist)

          return sock.sendMessage(ctx.from, {
            text: `✅ Removed *${domain}* from the link whitelist.`
          }, { quoted: msg })
        }

        // Add new domain
        const domain = ctx.query.toLowerCase().trim()
          .replace(/^https?:\/\//, '')
          .split('/')[0]

        if (!domain || domain.length < 3) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Invalid domain. Example: \`chat.whatsapp.com\``
          }, { quoted: msg })
        }

        if (whitelist.includes(domain)) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ *${domain}* is already whitelisted.`
          }, { quoted: msg })
        }

        if (whitelist.length >= 20) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Maximum 20 whitelisted domains. Remove one first.`
          }, { quoted: msg })
        }

        whitelist.push(domain)
        await setGS(ctx.from, 'antilink_whitelist', whitelist)

        await sock.sendMessage(ctx.from, {
          text: `✅ *${domain}* added to link whitelist.\n\nLinks from this domain will be allowed even when antilink is active.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
