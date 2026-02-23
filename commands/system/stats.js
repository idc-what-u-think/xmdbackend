import os from 'os'

const formatBytes = (bytes) => {
  if (bytes === 0) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)}${sizes[i]}`
}

const bar = (used, total, width = 20) => {
  const pct  = Math.min(used / total, 1)
  const fill = Math.round(pct * width)
  return `[${'█'.repeat(fill)}${'░'.repeat(width - fill)}] ${(pct * 100).toFixed(1)}%`
}

export default [
  {
    command: 'ram',
    aliases: ['memory', 'mem'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const mem      = process.memoryUsage()
      const sysTotal = os.totalmem()
      const sysFree  = os.freemem()
      const sysUsed  = sysTotal - sysFree

      await sock.sendMessage(ctx.from, {
        text: [
          `*RAM Usage*`, `${'─'.repeat(30)}`, ``,
          `*Bot Process:*`,
          `  Heap Used:  ${formatBytes(mem.heapUsed)}`,
          `  Heap Total: ${formatBytes(mem.heapTotal)}`,
          `  RSS:        ${formatBytes(mem.rss)}`,
          `  ${bar(mem.heapUsed, mem.heapTotal)}`, ``,
          `*System RAM:*`,
          `  Used:  ${formatBytes(sysUsed)}`,
          `  Free:  ${formatBytes(sysFree)}`,
          `  Total: ${formatBytes(sysTotal)}`,
          `  ${bar(sysUsed, sysTotal)}`,
        ].join('\n'),
      }, { quoted: msg })
    },
  },

  {
    command: 'cpu',
    aliases: ['processor'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const cpus  = os.cpus()
      const load  = os.loadavg()
      const cpu0  = cpus[0] || {}
      const model = cpu0.model || 'Unknown CPU'
      const times = cpu0.times || {}
      const total = Object.values(times).reduce((a, b) => a + b, 0)
      const idle  = times.idle || 0
      const usage = total > 0 ? ((1 - idle / total) * 100).toFixed(1) : 'N/A'

      await sock.sendMessage(ctx.from, {
        text: [
          `*CPU Info*`, `${'─'.repeat(30)}`, ``,
          `Model:   ${model}`,
          `Cores:   ${cpus.length}`,
          `Speed:   ${cpu0.speed || 0}MHz`, ``,
          `*Load Averages:*`,
          `  1 min:   ${load[0].toFixed(2)}`,
          `  5 min:   ${load[1].toFixed(2)}`,
          `  15 min:  ${load[2].toFixed(2)}`, ``,
          `Core 0 Usage: ~${usage}%`,
          `Platform:     ${os.platform()} ${os.arch()}`,
        ].join('\n'),
      }, { quoted: msg })
    },
  },

  {
    command: 'disk',
    aliases: ['storage', 'space'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      try {
        const { execSync } = await import('child_process')
        const df    = execSync('df -h / 2>/dev/null || df -h . 2>/dev/null').toString().trim()
        const parts = df.split('\n')[1]?.split(/\s+/) || []
        const [, total, used, avail, usePct] = parts

        await sock.sendMessage(ctx.from, {
          text: [
            `*Disk / Storage*`, `${'─'.repeat(30)}`, ``,
            `Total:     ${total || 'N/A'}`,
            `Used:      ${used  || 'N/A'}`,
            `Available: ${avail || 'N/A'}`,
            `Usage:     ${usePct || 'N/A'}`, ``,
            `_Host: ${os.hostname()}_`,
          ].join('\n'),
        }, { quoted: msg })
      } catch {
        await sock.sendMessage(ctx.from, {
          text: `*Disk*\n\nCould not read disk info.\nHost: ${os.hostname()} | ${os.platform()} ${os.arch()}`,
        }, { quoted: msg })
      }
    },
  },

  {
    command: 'platform',
    aliases: ['server', 'host', 'sysinfo'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const up = os.uptime()
      const ud = Math.floor(up / 86400)
      const uh = Math.floor((up % 86400) / 3600)
      const um = Math.floor((up % 3600) / 60)

      await sock.sendMessage(ctx.from, {
        text: [
          `*Server Info*`, `${'─'.repeat(30)}`, ``,
          `Hostname:  ${os.hostname()}`,
          `OS:        ${os.type()} ${os.release()}`,
          `Platform:  ${os.platform()}`,
          `Arch:      ${os.arch()}`,
          `CPUs:      ${os.cpus().length} cores`,
          `RAM:       ${formatBytes(os.totalmem())} total`, ``,
          `System Uptime: ${ud}d ${uh}h ${um}m`, ``,
          `Node.js: ${process.version}`,
        ].join('\n'),
      }, { quoted: msg })
    },
  },

  {
    command: 'about',
    aliases: ['botinfo'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const ownerRes = await api.sessionGet('owner:jid')
      const ownerNum = ownerRes?.value?.split('@')[0] || ''

      await sock.sendMessage(ctx.from, {
        text: [
          `*About ${ctx.botName}*`, `${'─'.repeat(30)}`, ``,
          `${ctx.botName} is a powerful WhatsApp automation bot built on Baileys.`, ``,
          `*Features:*`,
          `  500+ commands across 17 categories`,
          `  AI responses (Groq, Gemini, DeepSeek)`,
          `  Full group management suite`,
          `  Economy system with FireCoins`,
          `  Anti-spam & protection tools`,
          `  Music & media downloads`,
          `  Newsletter/Channel management`, ``,
          `*Built With:*`,
          `  Baileys v6.7 (WhatsApp Web API)`,
          `  Node.js ESM`,
          `  Cloudflare Workers + D1 + KV`, ``,
          ownerNum ? `Owner: wa.me/${ownerNum}` : '',
          `_Type ${ctx.prefix}menu to see all commands_`,
        ].filter(Boolean).join('\n'),
      }, { quoted: msg })
    },
  },

  {
    command: 'owner',
    aliases: ['creator', 'dev', 'developer'],
    category: 'system',
    handler: async (sock, msg, ctx) => {
      const DEV_NUMBER = '2348064610975'

      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN:Firekid846 — Firekid Dex Developer',
        `TEL;type=CELL;type=VOICE;waid=${DEV_NUMBER}:+${DEV_NUMBER}`,
        'END:VCARD',
      ].join('\n')

      await sock.sendMessage(ctx.from, {
        contacts: { displayName: 'Firekid846', contacts: [{ vcard }] },
      }, { quoted: msg })

      await sock.sendMessage(ctx.from, {
        text: [
          `👨‍💻 *The Owner of Firekid Dex v1 is Firekid846*`,
          ``,
          `📛 Real Name: *Ayomide*`,
          `🎓 A Computer Engineering student from the`,
          `   University of Ilorin`,
          ``,
          `${'─'.repeat(32)}`,
          `🌐 *SOCIALS*`,
          `${'─'.repeat(32)}`,
          ``,
          `🎵 TikTok: @Firekid846`,
          `🎮 Discord: https://discord.gg/ZZcxafAXMV`,
          `📢 WhatsApp Channel 1: https://whatsapp.com/channel/0029Vb6RALu3gvWhLvAAa33Z`,
          `📢 WhatsApp Channel 2: https://whatsapp.com/channel/0029Vb6jFkgJf05TzF6Vv702`,
          `🐙 GitHub: https://github.com/Firekid-is-him`,
          `🌍 Portfolio: https://aboutayomide.vercel.app`,
          ``,
          `_Powered by Firekid Dex v1_`,
        ].join('\n'),
      }, { quoted: msg })
    },
  },

  {
    command: 'support',
    aliases: ['helpgroup', 'community'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      // Updated support link
      const supportLink = 'https://chat.whatsapp.com/HiZu3bsMQ2DAejOxBz1KgB?mode=gi_t'
      const ownerRes    = await api.sessionGet('owner:jid')
      const ownerNum    = ownerRes?.value?.split('@')[0] || ''

      await sock.sendMessage(ctx.from, {
        text: [
          `*${ctx.botName} Support*`, `${'─'.repeat(28)}`, ``,
          `Join our support group for:`,
          `  Bug reports`,
          `  Feature requests`,
          `  General help`,
          `  Bot updates & news`, ``,
          `*Support Group:*`,
          supportLink,
          ownerNum ? `\n*Owner DM:* wa.me/${ownerNum}` : '',
          ``,
          `_Response time: Usually within 24 hours_`,
        ].filter(Boolean).join('\n'),
      }, { quoted: msg })
    },
  },

  {
    command: 'changelog',
    aliases: ['updates', 'whatsnew'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `*${ctx.botName} Changelog*`, `${'─'.repeat(30)}`, ``,
          `*Latest*`,
          `  500+ commands loaded`,
          `  AI categories (Groq + Gemini)`,
          `  Full economy system`,
          `  Anti-protection suite`,
          `  Newsletter management`,
          `  Group management overhaul`,
          `  Automation toggles`,
          `  Improved menu system`, ``,
          `Released: ${new Date().toLocaleDateString('en-GB')}`, ``,
          `_More updates coming soon!_`,
        ].join('\n'),
      }, { quoted: msg })
    },
  },
]
