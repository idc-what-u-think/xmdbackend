const MENU_IMAGES = [
  'https://i.ibb.co/n81GNX2q/photo-1-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/jPSrqT0M/photo-2-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/1fFBtT8T/photo-3-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/TDbkbVM4/photo-4-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/V0Z67w1k/photo-5-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/Vcjtr25J/photo-6-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/Hf4vWL7Z/photo-7-2026-02-21-16-33-08.jpg',
]

const randomImage = () => MENU_IMAGES[Math.floor(Math.random() * MENU_IMAGES.length)]

const formatUptime = (s) => {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

const section = (title, cmds, prefix) => {
  const lines = cmds.map(c => `| ⌬ ${prefix}${c}`)
  return [`\n.————< ${title} >————.`, ...lines, `'————————————————'`].join('\n')
}

const buildMenu = (prefix, botName, uptime, ram, ping, mode, name, cmdCount) => {
  const now = new Date()
  const date = now.toLocaleDateString('en-GB')
  const time = now.toLocaleTimeString()

  const header = [
    `*${botName}*`,
    ``,
    `| Mode:    ${mode}`,
    `| User:    ${name}`,
    `| Plugins: ${cmdCount}`,
    `| Uptime:  ${uptime}`,
    `| Date:    ${date}`,
    `| Time:    ${time}`,
    `| RAM:     ${ram}`,
    `| Ping:    ${ping}ms`,
    ``,
    `Command List`,
  ].join('\n')

  const menu = [
    header,
    section('AI & CHAT', ['ai', 'gemini', 'gpt', 'deepseek', 'think', 'debate', 'roast', 'story', 'poem', 'rap', 'translate', 'summarize', 'fix', 'explain'], prefix),
    section('DOWNLOADER', ['play', 'video', 'ytmp3', 'ytmp4', 'fb', 'ig', 'tt', 'twitter', 'pin', 'spotify', 'apk', 'gdrive'], prefix),
    section('STICKER', ['sticker', 'take', 'tgsticker', 'removebg'], prefix),
    section('AUDIO FX', ['bass', 'nightcore', 'slow', 'deep', 'robot', 'reverse', 'earrape', 'fat', 'squirrel', 'shazam'], prefix),
    section('GROUP', ['add', 'kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'lock', 'unlock', 'invite', 'revoke', 'kickall', 'leavegc', 'groupname', 'groupdesc', 'listmembers', 'admins', 'warn', 'resetwarn', 'warnlist', 'poll'], prefix),
    section('ANTI / PROTECT', ['antilink', 'antisticker', 'antinsfw', 'antimedia', 'antibad', 'addbadword', 'delbadword', 'badwordlist', 'antibug', 'anticall', 'floodblock', 'antitemu', 'antidelete'], prefix),
    section('AUTOMATION', ['autotyping', 'autorecording', 'autoread', 'autoreact', 'autoviewstatus', 'autoreactstatus', 'autobio', 'alwaysonline', 'chatbot', 'schedmsg'], prefix),
    section('MODES', ['nightmode', 'slowmode', 'newbiemode', 'lockdown', 'safezone'], prefix),
    section('CHANNELS', ['createchannel', 'channelinfo', 'newsearch', 'followchannel', 'unfollowchannel', 'mutechannel', 'unmutechannel'], prefix),
    section('ECONOMY', ['daily', 'balance', 'work', 'crime', 'gamble', 'slots', 'give', 'leaderboard', 'rank'], prefix),
    section('GAMES', ['truth', 'dare', '8ball', 'rps', 'dice', 'coinflip', 'trivia', 'riddle', 'guess', 'wcg'], prefix),
    section('PROFILE', ['jid', 'gjid', 'setmyname', 'updatebio', 'getprivacy', 'setonline', 'setlastseen', 'groupsprivacy', 'setppall', 'setreadreceipts', 'savecontact'], prefix),
    section('SOCIAL', ['gcannounce', 'spotlight', 'groupmood', 'confession', 'suggest', 'suggestions', 'todayinhistory', 'groupwrap'], prefix),
    section('CONVERSATION', ['unsend', 'recall', 'vanish', 'whisper', 'forwardnuke', 'seen', 'lastseen', 'callout', 'overthink'], prefix),
    section('SYSTEM', ['ping', 'alive', 'uptime', 'time', 'date', 'ram', 'cpu', 'disk', 'platform', 'about', 'owner', 'support', 'changelog'], prefix),
    section('OWNER', ['mode-public', 'mode-private', 'sudo', 'delsudo', 'listsudo', 'premium', 'delpremium', 'block', 'unblock', 'ban', 'unban', 'broadcast', 'shutdown', 'restart', 'setpp', 'setbio', 'addapikey', 'listapikeys', 'cleardata', 'report'], prefix),
    `\n_Type ${prefix}help <command> for more info_`,
  ].join('\n')

  return menu
}

export default [
  {
    command: 'menu',
    aliases: ['help', 'commands', 'cmd'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const mem    = process.memoryUsage()
      const ramMB  = (mem.heapUsed / 1024 / 1024).toFixed(1)
      const uptime = formatUptime(process.uptime())
      const modeRes = await api.sessionGet('bot:mode')
      const mode   = (modeRes?.value || 'public').toUpperCase()

      const pingStart = Date.now()
      const ping = Date.now() - pingStart

      const menuText = buildMenu(
        ctx.prefix,
        ctx.botName,
        uptime,
        `${ramMB}MB`,
        ping,
        mode,
        ctx.pushName || ctx.senderNumber,
        '500+',
      )

      await sock.sendMessage(ctx.from, {
        image:    { url: randomImage() },
        caption:  menuText,
        mentions: [ctx.sender],
      }, { quoted: msg })
    },
  },

  {
    command: 'commandcount',
    aliases: ['totalcmds', 'cmdcount'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: `*${ctx.botName}* has *500+* commands\n\n_Type ${ctx.prefix}menu to see them all_`,
      }, { quoted: msg })
    },
  },
]
