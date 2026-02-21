const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${d}d ${h}h ${m}m ${s}s`
}

export default [
  {
    command: 'ping',
    aliases: ['pong'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const start = Date.now()
      const sentMsg = await sock.sendMessage(ctx.from, { text: '🏓 Pinging...' }, { quoted: msg })
      const latency = Date.now() - start

      let quality
      if (latency < 300) quality = '🟢 Excellent'
      else if (latency < 700) quality = '🟡 Good'
      else if (latency < 1500) quality = '🟠 Fair'
      else quality = '🔴 Poor'

      await sock.sendMessage(ctx.from, {
        edit: sentMsg.key,
        text: [
          `🏓 *PONG!*`, ``,
          `⚡ Latency:  *${latency}ms*`,
          `📶 Quality:  *${quality}*`,
          `🤖 Status:   *Online ✅*`,
          `⏰ Time:     *${new Date().toLocaleTimeString()}*`
        ].join('\n')
      })
    }
  },

  {
    command: 'alive',
    aliases: ['status', 'running', 'online'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const mem = process.memoryUsage()
      const ramMB = (mem.heapUsed / 1024 / 1024).toFixed(1)
      const uptime = formatUptime(process.uptime())
      const now = new Date()
      const modeRes = await api.sessionGet('bot:mode')
      const mode = modeRes?.value?.toUpperCase() || 'PUBLIC'

      await sock.sendMessage(ctx.from, {
        text: [
          `🔥 *${ctx.botName} is Alive!*`, ``,
          `╔══════════════════════╗`,
          `║  STATUS: 🟢 ONLINE   ║`,
          `╚══════════════════════╝`, ``,
          `⏱️  Uptime:   *${uptime}*`,
          `💾 RAM:      *${ramMB}MB used*`,
          `📅 Date:     *${now.toLocaleDateString('en-GB')}*`,
          `🕐 Time:     *${now.toLocaleTimeString()}*`,
          `🤖 Mode:     *${mode}*`, ``,
          `_I'm always here for you! 🔥_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'uptime',
    aliases: ['runtime'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const seconds = process.uptime()
      const uptime = formatUptime(seconds)
      const d = Math.floor(seconds / 86400)
      const h = Math.floor((seconds % 86400) / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = Math.floor(seconds % 60)
      const pct = Math.min(seconds / (7 * 86400), 1)
      const bars = Math.round(pct * 20)
      const barStr = '█'.repeat(bars) + '░'.repeat(20 - bars)

      await sock.sendMessage(ctx.from, {
        text: [
          `⏱️ *Bot Uptime*`, `${'─'.repeat(28)}`, ``,
          `🔥 ${ctx.botName} has been running for:`, ``,
          `*${uptime}*`, ``,
          `[${barStr}]`, ``,
          `📊 Breakdown:`,
          `  Days:    *${d}*`,
          `  Hours:   *${h}*`,
          `  Minutes: *${m}*`,
          `  Seconds: *${s}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'time',
    aliases: ['clock', 'now'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const now = new Date()
      const zones = [
        { name: 'Lagos (WAT)', tz: 'Africa/Lagos' },
        { name: 'London (GMT)', tz: 'Europe/London' },
        { name: 'New York', tz: 'America/New_York' },
        { name: 'Dubai (GST)', tz: 'Asia/Dubai' }
      ]

      const timeLines = zones.map(z => {
        const t = new Date().toLocaleTimeString('en-US', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', hour12: true })
        return `  ${z.name.padEnd(16)} *${t}*`
      })

      await sock.sendMessage(ctx.from, {
        text: [
          `🕐 *Current Time*`, `${'─'.repeat(28)}`, ``,
          `*Server Time:* ${now.toLocaleTimeString()}`, ``,
          `🌍 *World Times:*`,
          ...timeLines, ``,
          `📅 Date: *${now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'date',
    aliases: ['today', 'calendar'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const now = new Date()
      const day = now.getDate()
      const month = now.toLocaleString('en-US', { month: 'long' })
      const year = now.getFullYear()
      const weekday = now.toLocaleString('en-US', { weekday: 'long' })
      const start = new Date(year, 0, 0)
      const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24))
      const daysLeft = 366 - dayOfYear
      const pct = dayOfYear / 365
      const bars = Math.round(pct * 20)
      const barStr = '█'.repeat(bars) + '░'.repeat(20 - bars)

      await sock.sendMessage(ctx.from, {
        text: [
          `📅 *Today's Date*`, `${'─'.repeat(28)}`, ``,
          `*${weekday}, ${month} ${day}, ${year}*`, ``,
          `📊 *Year Progress:*`,
          `[${barStr}] ${Math.round(pct * 100)}%`, ``,
          `  Day #${dayOfYear} of ${year}`,
          `  *${daysLeft} days* left in the year`, ``,
          `🕐 Time: *${now.toLocaleTimeString()}*`
        ].join('\n')
      }, { quoted: msg })
    }
  }
]
