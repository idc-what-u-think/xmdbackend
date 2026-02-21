// commands/system/info.js
// Commands: .ping | .alive | .uptime | .runtime | .time | .date

const BOT_NAME    = process.env.BOT_NAME    || 'FireKid Dex'
const BOT_VERSION = process.env.BOT_VERSION || 'v1'

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${d}d ${h}h ${m}m ${s}s`
}

export default [

  // ── .ping ─────────────────────────────────────────────
  {
    command:  'ping',
    aliases:  ['pong', 'speed'],
    category: 'system',
    description: 'Check bot response speed and latency',
    usage:    '.ping',
    example:  '.ping',

    handler: async (sock, msg, args, ctx) => {
      const start  = Date.now()
      const sentMsg = await sock.sendMessage(ctx.from, {
        text: '🏓 Pinging...'
      }, { quoted: msg })

      const latency = Date.now() - start

      // Determine quality label
      let quality
      if (latency < 300)       quality = '🟢 Excellent'
      else if (latency < 700)  quality = '🟡 Good'
      else if (latency < 1500) quality = '🟠 Fair'
      else                     quality = '🔴 Poor'

      await sock.sendMessage(ctx.from, {
        edit: sentMsg.key,
        text: [
          `🏓 *PONG!*`,
          ``,
          `⚡ Latency:  *${latency}ms*`,
          `📶 Quality:  *${quality}*`,
          `🤖 Status:   *Online ✅*`,
          `⏰ Time:     *${new Date().toLocaleTimeString()}*`
        ].join('\n')
      })
    }
  },

  // ── .alive ────────────────────────────────────────────
  {
    command:  'alive',
    aliases:  ['status', 'running', 'online'],
    category: 'system',
    description: 'Check if the bot is running and show basic stats',
    usage:    '.alive',
    example:  '.alive',

    handler: async (sock, msg, args, ctx) => {
      const mem     = process.memoryUsage()
      const ramMB   = (mem.heapUsed / 1024 / 1024).toFixed(1)
      const uptime  = formatUptime(process.uptime())
      const now     = new Date()

      await sock.sendMessage(ctx.from, {
        text: [
          `🔥 *${BOT_NAME} ${BOT_VERSION} is Alive!*`,
          ``,
          `╔══════════════════════╗`,
          `║  STATUS: 🟢 ONLINE   ║`,
          `╚══════════════════════╝`,
          ``,
          `⏱️  Uptime:   *${uptime}*`,
          `💾 RAM:      *${ramMB}MB used*`,
          `📅 Date:     *${now.toLocaleDateString('en-GB')}*`,
          `🕐 Time:     *${now.toLocaleTimeString()}*`,
          `🤖 Mode:     *${process.env.BOT_MODE || 'PUBLIC'}*`,
          ``,
          `_I'm always here for you! 🔥_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .uptime ───────────────────────────────────────────
  {
    command:  'uptime',
    aliases:  ['runtime'],
    category: 'system',
    description: 'Show how long the bot has been running without restart',
    usage:    '.uptime',
    example:  '.uptime',

    handler: async (sock, msg, args, ctx) => {
      const seconds = process.uptime()
      const uptime  = formatUptime(seconds)

      const d = Math.floor(seconds / 86400)
      const h = Math.floor((seconds % 86400) / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = Math.floor(seconds % 60)

      // Bar to visualize uptime (max visual = 7 days)
      const pct   = Math.min(seconds / (7 * 86400), 1)
      const bars  = Math.round(pct * 20)
      const bar   = '█'.repeat(bars) + '░'.repeat(20 - bars)

      await sock.sendMessage(ctx.from, {
        text: [
          `⏱️ *Bot Uptime*`,
          `${'─'.repeat(28)}`,
          ``,
          `🔥 ${BOT_NAME} has been running for:`,
          ``,
          `*${uptime}*`,
          ``,
          `[${bar}]`,
          ``,
          `📊 Breakdown:`,
          `  Days:    *${d}*`,
          `  Hours:   *${h}*`,
          `  Minutes: *${m}*`,
          `  Seconds: *${s}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .time ─────────────────────────────────────────────
  {
    command:  'time',
    aliases:  ['clock', 'now'],
    category: 'system',
    description: 'Get the current time from the bot server',
    usage:    '.time',
    example:  '.time',

    handler: async (sock, msg, args, ctx) => {
      const now = new Date()

      // Multiple timezone display
      const zones = [
        { name: 'Lagos (WAT)',  tz: 'Africa/Lagos'    },
        { name: 'London (GMT)', tz: 'Europe/London'   },
        { name: 'New York',     tz: 'America/New_York' },
        { name: 'Dubai (GST)',  tz: 'Asia/Dubai'      },
      ]

      const timeLines = zones.map(z => {
        const t = new Date().toLocaleTimeString('en-US', {
          timeZone: z.tz,
          hour:   '2-digit',
          minute: '2-digit',
          hour12: true
        })
        return `  ${z.name.padEnd(16)} *${t}*`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `🕐 *Current Time*`,
          `${'─'.repeat(28)}`,
          ``,
          `*Server Time:* ${now.toLocaleTimeString()}`,
          ``,
          `🌍 *World Times:*`,
          ...timeLines,
          ``,
          `📅 Date: *${now.toLocaleDateString('en-GB', {
            weekday: 'long',
            year:    'numeric',
            month:   'long',
            day:     'numeric'
          })}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .date ─────────────────────────────────────────────
  {
    command:  'date',
    aliases:  ['today', 'calendar'],
    category: 'system',
    description: 'Show today\'s date with a fun fact about this day',
    usage:    '.date',
    example:  '.date',

    handler: async (sock, msg, args, ctx) => {
      const now      = new Date()
      const day      = now.getDate()
      const month    = now.toLocaleString('en-US', { month: 'long' })
      const year     = now.getFullYear()
      const weekday  = now.toLocaleString('en-US', { weekday: 'long' })

      // Day of year
      const start    = new Date(year, 0, 0)
      const diff     = now - start
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
      const daysLeft  = 366 - dayOfYear

      // Progress bar for year
      const pct  = dayOfYear / 365
      const bars = Math.round(pct * 20)
      const bar  = '█'.repeat(bars) + '░'.repeat(20 - bars)

      await sock.sendMessage(ctx.from, {
        text: [
          `📅 *Today's Date*`,
          `${'─'.repeat(28)}`,
          ``,
          `*${weekday}, ${month} ${day}, ${year}*`,
          ``,
          `📊 *Year Progress:*`,
          `[${bar}] ${Math.round(pct * 100)}%`,
          ``,
          `  Day #${dayOfYear} of ${year}`,
          `  *${daysLeft} days* left in the year`,
          ``,
          `🕐 Time: *${now.toLocaleTimeString()}*`
        ].join('\n')
      }, { quoted: msg })
    }
  }

]
