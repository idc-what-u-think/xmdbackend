// commands/system/stats.js
// Commands: .ram | .cpu | .disk | .platform | .about | .owner | .support | .changelog | .speedtest

import os from 'os'

const BOT_NAME    = process.env.BOT_NAME    || 'FireKid Dex'
const BOT_VERSION = process.env.BOT_VERSION || 'v1'
const OWNER_NUM   = process.env.OWNER_NUMBER || ''

const formatBytes = (bytes) => {
  if (bytes === 0) return '0B'
  const k     = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i     = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)}${sizes[i]}`
}

const bar = (used, total, width = 20) => {
  const pct  = Math.min(used / total, 1)
  const fill = Math.round(pct * width)
  return `[${'█'.repeat(fill)}${'░'.repeat(width - fill)}] ${(pct * 100).toFixed(1)}%`
}

export default [

  // ── .ram ──────────────────────────────────────────────
  {
    command:  'ram',
    aliases:  ['memory', 'mem'],
    category: 'system',
    description: 'Show bot RAM / memory usage',
    usage:    '.ram',
    example:  '.ram',

    handler: async (sock, msg, args, ctx) => {
      const mem       = process.memoryUsage()
      const sysTotal  = os.totalmem()
      const sysFree   = os.freemem()
      const sysUsed   = sysTotal - sysFree

      await sock.sendMessage(ctx.from, {
        text: [
          `💾 *RAM Usage*`,
          `${'─'.repeat(30)}`,
          ``,
          `🤖 *Bot Process:*`,
          `  Heap Used:  *${formatBytes(mem.heapUsed)}*`,
          `  Heap Total: *${formatBytes(mem.heapTotal)}*`,
          `  RSS:        *${formatBytes(mem.rss)}*`,
          `  External:   *${formatBytes(mem.external)}*`,
          ``,
          `  ${bar(mem.heapUsed, mem.heapTotal)}`,
          ``,
          `🖥️ *System RAM:*`,
          `  Used:  *${formatBytes(sysUsed)}*`,
          `  Free:  *${formatBytes(sysFree)}*`,
          `  Total: *${formatBytes(sysTotal)}*`,
          ``,
          `  ${bar(sysUsed, sysTotal)}`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .cpu ──────────────────────────────────────────────
  {
    command:  'cpu',
    aliases:  ['processor'],
    category: 'system',
    description: 'Show CPU info and load averages',
    usage:    '.cpu',
    example:  '.cpu',

    handler: async (sock, msg, args, ctx) => {
      const cpus    = os.cpus()
      const load    = os.loadavg()
      const cpu0    = cpus[0] || {}
      const model   = cpu0.model || 'Unknown CPU'

      // Calculate usage from cpu times
      const times   = cpu0.times || {}
      const total   = Object.values(times).reduce((a, b) => a + b, 0)
      const idle    = times.idle || 0
      const usage   = total > 0 ? ((1 - idle / total) * 100).toFixed(1) : 'N/A'

      await sock.sendMessage(ctx.from, {
        text: [
          `🖥️ *CPU Info*`,
          `${'─'.repeat(30)}`,
          ``,
          `📌 Model:   *${model}*`,
          `📌 Cores:   *${cpus.length}*`,
          `📌 Speed:   *${cpu0.speed || 0}MHz*`,
          ``,
          `📊 *Load Averages:*`,
          `  1 min:   *${load[0].toFixed(2)}*`,
          `  5 min:   *${load[1].toFixed(2)}*`,
          `  15 min:  *${load[2].toFixed(2)}*`,
          ``,
          `⚡ Core 0 Usage: *~${usage}%*`,
          `🏗️ Platform:    *${os.platform()} ${os.arch()}*`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .disk ─────────────────────────────────────────────
  {
    command:  'disk',
    aliases:  ['storage', 'space'],
    category: 'system',
    description: 'Show server disk/storage usage',
    usage:    '.disk',
    example:  '.disk',

    handler: async (sock, msg, args, ctx) => {
      // Use df command via child_process for real disk info
      try {
        const { execSync } = await import('child_process')
        const df = execSync("df -h / 2>/dev/null || df -h . 2>/dev/null").toString().trim()
        const lines  = df.split('\n')
        const parts  = lines[1]?.split(/\s+/) || []

        const total  = parts[1] || 'N/A'
        const used   = parts[2] || 'N/A'
        const avail  = parts[3] || 'N/A'
        const usePct = parts[4] || 'N/A'

        await sock.sendMessage(ctx.from, {
          text: [
            `💿 *Disk / Storage*`,
            `${'─'.repeat(30)}`,
            ``,
            `📁 Total:     *${total}*`,
            `📊 Used:      *${used}*`,
            `✅ Available: *${avail}*`,
            `📈 Usage:     *${usePct}*`,
            ``,
            `_Hosting: ${os.hostname()}_`
          ].join('\n')
        }, { quoted: msg })

      } catch {
        // Fallback if df fails (e.g. Windows dev environment)
        await sock.sendMessage(ctx.from, {
          text: [
            `💿 *Disk / Storage*`,
            `${'─'.repeat(30)}`,
            ``,
            `⚠️ Could not read disk info on this platform.`,
            ``,
            `🏗️ Host: *${os.hostname()}*`,
            `🖥️ OS:   *${os.platform()} ${os.arch()}*`
          ].join('\n')
        }, { quoted: msg })
      }
    }
  },

  // ── .platform ─────────────────────────────────────────
  {
    command:  'platform',
    aliases:  ['server', 'host', 'sysinfo'],
    category: 'system',
    description: 'Show server/hosting platform information',
    usage:    '.platform',
    example:  '.platform',

    handler: async (sock, msg, args, ctx) => {
      const uptime = os.uptime()
      const ud = Math.floor(uptime / 86400)
      const uh = Math.floor((uptime % 86400) / 3600)
      const um = Math.floor((uptime % 3600) / 60)

      await sock.sendMessage(ctx.from, {
        text: [
          `🖥️ *Server Info*`,
          `${'─'.repeat(30)}`,
          ``,
          `📌 Hostname:  *${os.hostname()}*`,
          `📌 OS:        *${os.type()} ${os.release()}*`,
          `📌 Platform:  *${os.platform()}*`,
          `📌 Arch:      *${os.arch()}*`,
          `📌 CPUs:      *${os.cpus().length} cores*`,
          `📌 RAM:       *${formatBytes(os.totalmem())} total*`,
          ``,
          `🕐 System Uptime: *${ud}d ${uh}h ${um}m*`,
          ``,
          `📦 *Node.js:*   *${process.version}*`,
          `📦 *Platform:*  ${process.env.RENDER ? '☁️ Render' : process.env.RAILWAY ? '🚂 Railway' : process.env.HEROKU ? '💜 Heroku' : '🏠 Self-Hosted'}`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .speedtest ────────────────────────────────────────
  {
    command:  'speedtest',
    aliases:  ['netspeed', 'internet'],
    category: 'system',
    description: 'Test the bot server\'s internet download speed',
    usage:    '.speedtest',
    example:  '.speedtest',

    handler: async (sock, msg, args, ctx) => {
      const placeholder = await sock.sendMessage(ctx.from, {
        text: '🌐 Testing server internet speed...'
      }, { quoted: msg })

      try {
        // Simple speed test using a known test file
        const TEST_URL  = 'https://speed.cloudflare.com/__down?bytes=5000000'
        const startTime = Date.now()

        const res = await fetch(TEST_URL)
        if (!res.ok) throw new Error('Speed test server unavailable')

        const buffer = await res.arrayBuffer()
        const elapsed = (Date.now() - startTime) / 1000
        const bytes   = buffer.byteLength
        const mbps    = ((bytes * 8) / elapsed / 1_000_000).toFixed(2)

        let quality
        if (parseFloat(mbps) >= 100)     quality = '🚀 Blazing Fast'
        else if (parseFloat(mbps) >= 50) quality = '⚡ Fast'
        else if (parseFloat(mbps) >= 20) quality = '✅ Good'
        else if (parseFloat(mbps) >= 5)  quality = '🟡 Moderate'
        else                              quality = '🔴 Slow'

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [
            `🌐 *Speed Test Results*`,
            `${'─'.repeat(28)}`,
            ``,
            `📥 Download: *${mbps} Mbps*`,
            `📦 Data:     *${formatBytes(bytes)}*`,
            `⏱️  Duration: *${elapsed.toFixed(2)}s*`,
            ``,
            `Quality: *${quality}*`,
            ``,
            `_Tested via Cloudflare Edge_`
          ].join('\n')
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Speed test failed: ${err.message}`
        })
      }
    }
  },

  // ── .about ────────────────────────────────────────────
  {
    command:  'about',
    aliases:  ['botinfo', 'info'],
    category: 'system',
    description: 'Info about this bot — what it is, who made it',
    usage:    '.about',
    example:  '.about',

    handler: async (sock, msg, args, ctx) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `🔥 *About ${BOT_NAME}*`,
          `${'─'.repeat(30)}`,
          ``,
          `${BOT_NAME} ${BOT_VERSION} is a powerful WhatsApp automation bot`,
          `built on Baileys — the most advanced WA Web library.`,
          ``,
          `⚡ *Features:*`,
          `  • 500+ commands across 22 categories`,
          `  • AI-powered responses (Groq, Gemini)`,
          `  • Full group management suite`,
          `  • Economy system with FireCoins 🔥`,
          `  • Anti-spam & protection tools`,
          `  • Music & media downloads`,
          `  • Newsletter/Channel management`,
          `  • Nigerian-specific commands`,
          `  • And so much more...`,
          ``,
          `🛠️ *Built With:*`,
          `  • Baileys v6.7 (WhatsApp Web API)`,
          `  • Node.js ESM`,
          `  • Cloudflare Workers + D1 + KV`,
          `  • Render hosting`,
          ``,
          `👑 *Owner:* wa.me/${OWNER_NUM}`,
          ``,
          `_Type ${ctx.prefix}menu to see all commands_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .owner ────────────────────────────────────────────
  {
    command:  'owner',
    aliases:  ['creator', 'dev'],
    category: 'system',
    description: 'Get the bot owner\'s contact info',
    usage:    '.owner',
    example:  '.owner',

    handler: async (sock, msg, args, ctx) => {
      const ownerNum = OWNER_NUM

      if (!ownerNum) {
        return sock.sendMessage(ctx.from, {
          text: `👑 *Bot Owner*\n\nOwner info not configured.\nContact your bot admin directly.`
        }, { quoted: msg })
      }

      // Send as contact card
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${BOT_NAME} Owner`,
        `TEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}`,
        'END:VCARD'
      ].join('\n')

      await sock.sendMessage(ctx.from, {
        contacts: {
          displayName: `${BOT_NAME} Owner`,
          contacts:    [{ vcard }]
        }
      }, { quoted: msg })

      await sock.sendMessage(ctx.from, {
        text: [
          `👑 *Bot Owner*`,
          ``,
          `🔥 *${BOT_NAME} ${BOT_VERSION}*`,
          ``,
          `📞 Contact: wa.me/${ownerNum}`,
          ``,
          `_For bot issues, premium, sudo access, or business inquiries_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .support ──────────────────────────────────────────
  {
    command:  'support',
    aliases:  ['helpgroup', 'community'],
    category: 'system',
    description: 'Get the link to the bot support group',
    usage:    '.support',
    example:  '.support',

    handler: async (sock, msg, args, ctx) => {
      const supportLink = process.env.SUPPORT_LINK || 'https://chat.whatsapp.com/yourlink'

      await sock.sendMessage(ctx.from, {
        text: [
          `💬 *${BOT_NAME} Support*`,
          `${'─'.repeat(28)}`,
          ``,
          `Join our support group for:`,
          `  • Bug reports`,
          `  • Feature requests`,
          `  • General help`,
          `  • Bot updates & news`,
          ``,
          `🔗 *Support Group:*`,
          supportLink,
          ``,
          `👑 *Owner DM:* wa.me/${OWNER_NUM}`,
          ``,
          `_Response time: Usually within 24 hours_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── .changelog ────────────────────────────────────────
  {
    command:  'changelog',
    aliases:  ['updates', 'whatsnew'],
    category: 'system',
    description: 'See latest bot updates and version history',
    usage:    '.changelog',
    example:  '.changelog',

    handler: async (sock, msg, args, ctx) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `📋 *${BOT_NAME} Changelog*`,
          `${'─'.repeat(30)}`,
          ``,
          `🔥 *${BOT_VERSION} — Latest*`,
          `  ✅ 500+ commands loaded`,
          `  ✅ AI categories (Groq + Gemini)`,
          `  ✅ Full economy system`,
          `  ✅ Anti-protection suite`,
          `  ✅ Newsletter management`,
          `  ✅ Group management overhaul`,
          `  ✅ Automation toggles`,
          `  ✅ Nigeria-specific commands`,
          `  ✅ Improved menu system`,
          ``,
          `📅 Released: ${new Date().toLocaleDateString('en-GB')}`,
          ``,
          `_More updates coming soon! Stay tuned 🔥_`
        ].join('\n')
      }, { quoted: msg })
    }
  }

]
