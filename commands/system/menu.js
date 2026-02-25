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

const HARDCODED_OWNER = '2348064610975'

const planBadge = (plan, isOwner, senderNumber) => {
  if (isOwner || senderNumber === HARDCODED_OWNER) return '👑 OWNER'
  if (plan === 'sudo')    return '🔐 SUDO'
  if (plan === 'premium') return '⭐ PREMIUM'
  return '🆓 FREE'
}

const buildMenu = (prefix, botName, uptime, ram, ping, mode, name, cmdCount, plan, isOwner, senderNumber) => {
  const now   = new Date()
  const date  = now.toLocaleDateString('en-GB')
  const time  = now.toLocaleTimeString()
  const badge = planBadge(plan, isOwner, senderNumber)

  const header = [
    `╔═══════════════════════╗`,
    `║    *${botName}*`,
    `╚═══════════════════════╝`,
    ``,
    `| 👤 User:    ${name}`,
    `| 🎖️  Plan:    ${badge}`,
    `| 🤖 Mode:    ${mode}`,
    `| 📦 Plugins: ${cmdCount}`,
    `| ⏱️  Uptime:  ${uptime}`,
    `| 📅 Date:    ${date}`,
    `| 🕐 Time:    ${time}`,
    `| 💾 RAM:     ${ram}`,
    `| 📶 Ping:    ${ping}ms`,
    ``,
    `*Command List*`,
  ].join('\n')

  const menu = [
    header,

    // ── Tools / Fake
    section('TOOLS / FAKE', ['opay','fakecall','fakefb','fakeinsta','fakecc','fakeid','ngl','cc','iphone'], prefix),

    // ── AI & Chat
    section('AI & CHAT', ['ai','groq','gemini','gpt','deepseek','think','debate','roast','story','poem','rap','translate','summarize','fix','explain'], prefix),

    // ── Downloaders
    section('DOWNLOADER', ['play','video','ytmp3','ytmp4','fb','ig','tt','twitter','pin','spotify','apk','gdrive'], prefix),

    // ── Search & Lookup
    section('SEARCH & LOOKUP', ['google','wiki','define','news','weather','imdb','lyrics','gsmarena','ytsearch','bing'], prefix),

    // ── Lookup Advanced
    section('LOOKUP ADVANCED', ['bible','quran','cryptoprice','ipinfo','whois','dnslookup','imgsearch'], prefix),

    // ── Photo Styles
    section('PHOTO STYLES', ['toghibli','toanime','tocartoon','todisney','tocyberpunk','tocomic','togta','tomanga','topixar','tooilpainting','tosketch','tovintage','towatercolor'], prefix),

    // ── Photo Effects
    section('PHOTO EFFECTS', ['zombie','oldage','spirit','satan','punk','hijab','wanted','drip','joker','polaroid','gun','clown','mirror','partner','nanobanana'], prefix),

    // ── Sticker
    section('STICKER', ['sticker','take','tgsticker','removebg'], prefix),

    // ── Audio FX
    section('AUDIO FX', ['bass','nightcore','slow','deep','robot','reverse','earrape','fat','squirrel','shazam'], prefix),

    // ── Gaming (NEW)
    section('GAMING', ['sensitivity'], prefix),

    // ── Group
    section('GROUP', ['add','kick','promote','demote','tagall','hidetag','mute','unmute','lock','unlock','invite','revoke','kickall','leavegc','groupname','groupdesc','listmembers','admins','warn','resetwarn','warnlist','poll'], prefix),

    // ── Anti / Protection
    section('ANTI / PROTECT', ['antilink','antisticker','antinsfw','antimedia','antibad','addbadword','delbadword','badwordlist','antibug','anticall','floodblock','antitemu','antidelete'], prefix),

    // ── Automation
    section('AUTOMATION', ['autotyping','autorecording','autoread','autoreact','autoviewstatus','autoreactstatus','autobio','alwaysonline','chatbot','schedmsg'], prefix),

    // ── Smart Modes
    section('MODES', ['nightmode','slowmode','newbiemode','lockdown','safezone'], prefix),

    // ── Economy
    section('ECONOMY', ['daily','balance','work','crime','gamble','slots','give','leaderboard','rank'], prefix),

    // ── Games
    section('GAMES', ['truth','dare','8ball','rps','dice','coinflip','trivia','riddle','guess','wcg'], prefix),

    // ── Tools (extra)
    section('TOOLS', ['tts','vv','vv2','tempmail','tempmail-inbox','url','qrcode','screenshot','carbon','obfuscate','sandbox','readmore','emojimix','sendstatus'], prefix),

    // ── Profile
    section('PROFILE', ['jid','gjid','setmyname','updatebio','getprivacy','setonline','setlastseen','groupsprivacy','setppall','savecontact'], prefix),

    // ── Social
    section('SOCIAL', ['gcannounce','spotlight','groupmood','confession','suggest','suggestions','todayinhistory','groupwrap'], prefix),

    // ── Conversation
    section('CONVERSATION', ['unsend','recall','vanish','whisper','forwardnuke','seen','lastseen','callout','overthink'], prefix),

    // ── System
    section('SYSTEM', ['ping','alive','uptime','time','date','ram','cpu','disk','platform','about','owner','support','repo','changelog'], prefix),

    // ── Owner
    section('OWNER', ['mode-public','mode-private','sudo','delsudo','listsudo','premium','delpremium','ban','unban','block','unblock','broadcast','shutdown','restart','setpp','setbio','cleardata','report'], prefix),

    ``,
    `_Type ${prefix}help <command> for details_`,
    plan === 'free'
      ? `_⭐ Upgrade to Premium: https://firekidofficial.name.ng_`
      : `_🔥 Thanks for supporting Firekid XMD!_`,
  ].join('\n')

  return menu
}

export default [
  {
    command: 'menu',
    aliases: ['commands', 'cmd'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const mem    = process.memoryUsage()
      const ramMB  = (mem.heapUsed / 1024 / 1024).toFixed(1)
      const uptime = formatUptime(process.uptime())
      const modeRes = await api.sessionGet('bot:mode')
      const mode   = (modeRes?.value || 'public').toUpperCase()
      const ping   = Date.now() - Date.now()

      const menuText = buildMenu(
        ctx.prefix,
        ctx.botName,
        uptime,
        `${ramMB}MB`,
        ping,
        mode,
        ctx.pushName || ctx.senderNumber,
        '500+',
        ctx.plan || 'free',
        ctx.isOwner,
        ctx.senderNumber,
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
    handler: async (sock, msg, ctx) => {
      await sock.sendMessage(ctx.from, {
        text: `*${ctx.botName}* has *500+* commands\n\n_Type ${ctx.prefix}menu to see them all_`,
      }, { quoted: msg })
    },
  },
]
