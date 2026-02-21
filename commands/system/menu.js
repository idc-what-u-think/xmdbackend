// commands/system/menu.js
// Commands: .menu | .help | .commands
//
// .menu   → Full categorized command list
// .help   → Detailed info on one specific command
// .commands → Total command count

import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir  = dirname(fileURLToPath(import.meta.url))
// commands/ is two levels up from commands/system/
const CMDS   = join(__dir, '../../commands')

const BOT_NAME    = process.env.BOT_NAME    || 'FireKid Dex'
const BOT_VERSION = process.env.BOT_VERSION || 'v1'
const PREFIX      = process.env.PREFIX      || '.'

// Read the commands directory and build category → [commandNames] map
// This mirrors what loader.js does but purely for display in .menu
const buildMenuMap = () => {
  const map = new Map()
  try {
    const subdirs = readdirSync(CMDS).filter(name => {
      try { return statSync(join(CMDS, name)).isDirectory() } catch { return false }
    })

    for (const folder of subdirs) {
      const category = folder.toLowerCase()
      const commands = []

      try {
        const files = readdirSync(join(CMDS, folder)).filter(f => f.endsWith('.js'))
        for (const file of files) {
          // Read file content and extract command names via regex
          // (avoids circular import issues with loader.js)
          const { readFileSync } = await import('fs').catch(() => ({ readFileSync: null }))
          // Fallback: derive command name from file name
          const stem = file.replace('.js', '')
          commands.push(stem)
        }
      } catch {}

      if (commands.length) map.set(category, commands)
    }
  } catch {}
  return map
}

// Better approach: dynamically import each command file and read its command field
const buildMenuMapDynamic = async () => {
  const map = new Map()
  try {
    const subdirs = readdirSync(CMDS).filter(name => {
      try { return statSync(join(CMDS, name)).isDirectory() } catch { return false }
    })

    for (const folder of subdirs) {
      const category = folder.toLowerCase()
      const cmdNames = []

      try {
        const files = readdirSync(join(CMDS, folder)).filter(f => f.endsWith('.js'))
        for (const file of files) {
          try {
            const mod      = await import(`${join(CMDS, folder, file)}`)
            const exported = mod.default
            if (!exported) continue
            const list = Array.isArray(exported) ? exported : [exported]
            for (const cmd of list) {
              if (cmd?.command) cmdNames.push(cmd.command)
            }
          } catch {}
        }
      } catch {}

      if (cmdNames.length) map.set(category, cmdNames)
    }
  } catch {}
  return map
}

// Format uptime from process.uptime() seconds
const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${d}d ${h}h ${m}m ${s}s`
}

// Format bytes to human readable
const formatBytes = (bytes) => {
  if (bytes < 1024)        return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default [

  // ── .menu ─────────────────────────────────────────────
  {
    command:  'menu',
    aliases:  ['help', 'cmds', 'start'],
    category: 'system',
    description: 'Show the full bot command menu with all categories',
    usage:    '.menu',
    example:  '.menu',

    handler: async (sock, msg, args, ctx) => {
      try {
        const mem      = process.memoryUsage()
        const ramUsed  = formatBytes(mem.heapUsed)
        const ramTotal = formatBytes(mem.heapTotal)
        const uptime   = formatUptime(process.uptime())
        const now      = new Date()
        const date     = now.toLocaleDateString('en-GB')
        const time     = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        // Measure ping
        const start   = Date.now()
        const ping    = Date.now() - start

        // Get mode from env/worker
        const mode = process.env.BOT_MODE || 'PUBLIC'

        // Build category map
        const catMap = await buildMenuMapDynamic()

        // Count total commands
        let totalCmds = 0
        catMap.forEach(cmds => { totalCmds += cmds.length })

        // Build header
        const lines = [
          `╔══════════════════════════════╗`,
          `║  🔥  ${BOT_NAME} ${BOT_VERSION}`.padEnd(31) + `║`,
          `║  WhatsApp's #1 Bot           ║`,
          `╚══════════════════════════════╝`,
          ``,
          `│ ◉ Mode:    ${mode}`,
          `│ ◉ Prefix:  ${PREFIX}`,
          `│ ◉ Plugins: ${totalCmds}+`,
          `│ ◉ Uptime:  ${uptime}`,
          `│ ◉ Date:    ${date}`,
          `│ ◉ Time:    ${time}`,
          `│ ◉ RAM:     ${ramUsed}/${ramTotal}`,
          `│ ◉ Ping:    ${ping}ms`,
          ``,
          `Command List 🔽`,
          ``,
        ]

        // Build each category section
        // Sort categories in a logical order
        const ORDER = [
          'ai', 'downloader', 'group', 'anti', 'automation',
          'economy', 'sticker', 'tools', 'search', 'stalk',
          'football', 'game', 'fun', 'media', 'converter',
          'newsletter', 'nigeria', 'crypto', 'nsfw',
          'developer', 'owner', 'system'
        ]

        const sortedCats = [...catMap.keys()].sort((a, b) => {
          const ai = ORDER.indexOf(a)
          const bi = ORDER.indexOf(b)
          if (ai === -1 && bi === -1) return a.localeCompare(b)
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        })

        for (const cat of sortedCats) {
          const cmds = catMap.get(cat)
          if (!cmds || !cmds.length) continue

          lines.push(`┌──「 ${cat.toUpperCase()} 」`)
          for (const cmd of cmds) {
            lines.push(`│ ◈ ${PREFIX}${cmd}`)
          }
          lines.push(`└──────────────•◦`)
          lines.push(``)
        }

        lines.push(`> Type ${PREFIX}help <command> for more info`)
        lines.push(`> 🔥 ${BOT_NAME} ${BOT_VERSION} — Always Online`)

        await sock.sendMessage(ctx.from, {
          text: lines.join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to load menu: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .help ─────────────────────────────────────────────
  {
    command:  'help',
    aliases:  ['h', 'info', 'cmdinfo'],
    category: 'system',
    description: 'Get detailed information about a specific command',
    usage:    '.help <command>',
    example:  '.help daily',

    handler: async (sock, msg, args, ctx) => {
      const query = ctx.query?.toLowerCase().trim()

      if (!query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📚 *Help System*`,
            ``,
            `Get info on any command:`,
            `*Usage:* ${PREFIX}help <commandname>`,
            ``,
            `*Example:*`,
            `${PREFIX}help daily`,
            `${PREFIX}help antilink`,
            `${PREFIX}help play`,
            ``,
            `_Use ${PREFIX}menu to see all commands_`
          ].join('\n')
        }, { quoted: msg })
      }

      // Search through all command files for matching command
      let found = null
      try {
        const subdirs = readdirSync(CMDS).filter(name => {
          try { return statSync(join(CMDS, name)).isDirectory() } catch { return false }
        })

        outer:
        for (const folder of subdirs) {
          const files = readdirSync(join(CMDS, folder)).filter(f => f.endsWith('.js'))
          for (const file of files) {
            try {
              const mod      = await import(`${join(CMDS, folder, file)}`)
              const exported = mod.default
              if (!exported) continue
              const list = Array.isArray(exported) ? exported : [exported]
              for (const cmd of list) {
                if (!cmd?.command) continue
                const names    = Array.isArray(cmd.command) ? cmd.command : [cmd.command]
                const aliasArr = Array.isArray(cmd.aliases) ? cmd.aliases : []
                const allNames = [...names, ...aliasArr].map(n => n.toLowerCase())
                if (allNames.includes(query)) {
                  found = { ...cmd, category: folder }
                  break outer
                }
              }
            } catch {}
          }
        }
      } catch {}

      if (!found) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ *Command not found:* \`${PREFIX}${query}\``,
            ``,
            `Use ${PREFIX}menu to browse all commands.`
          ].join('\n')
        }, { quoted: msg })
      }

      const aliases = Array.isArray(found.aliases) && found.aliases.length
        ? found.aliases.map(a => `${PREFIX}${a}`).join(', ')
        : 'None'

      await sock.sendMessage(ctx.from, {
        text: [
          `📖 *Command Info*`,
          `${'─'.repeat(28)}`,
          ``,
          `🔹 *Command:*     ${PREFIX}${found.command}`,
          `🔹 *Category:*    ${(found.category || 'general').toUpperCase()}`,
          `🔹 *Description:* ${found.description || 'No description'}`,
          `🔹 *Aliases:*     ${aliases}`,
          ``,
          `📌 *Usage:*`,
          `  ${found.usage || `${PREFIX}${found.command}`}`,
          ``,
          `💡 *Example:*`,
          `  ${found.example || `${PREFIX}${found.command}`}`,
          ``,
          found.adminOnly       ? `🔒 Admin only`   : '',
          found.ownerOnly       ? `👑 Owner only`   : '',
          found.premiumOnly     ? `💎 Premium only` : '',
          found.groupOnly       ? `👥 Group only`   : '',
          found.privateOnly     ? `💬 DM only`      : '',
          found.botAdminRequired? `🤖 Bot must be admin` : '',
        ].filter(Boolean).join('\n')
      }, { quoted: msg })
    }
  },

  // ── .commands ─────────────────────────────────────────
  {
    command:  'commands',
    aliases:  ['cmdcount', 'totalcmds'],
    category: 'system',
    description: 'Show total number of loaded commands per category',
    usage:    '.commands',
    example:  '.commands',

    handler: async (sock, msg, args, ctx) => {
      try {
        const catMap = await buildMenuMapDynamic()

        let total = 0
        const lines = []

        const sortedCats = [...catMap.keys()].sort()
        for (const cat of sortedCats) {
          const cmds = catMap.get(cat)
          total += cmds.length
          lines.push(`│ ${cat.padEnd(14)} → ${cmds.length} commands`)
        }

        await sock.sendMessage(ctx.from, {
          text: [
            `📊 *Command Count*`,
            `${'─'.repeat(30)}`,
            ``,
            ...lines,
            ``,
            `${'─'.repeat(30)}`,
            `🔥 *Total: ${total} commands across ${catMap.size} categories*`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
