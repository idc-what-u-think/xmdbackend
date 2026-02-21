const MENU_IMAGES = [
  'https://i.ibb.co/n81GNX2q/photo-1-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/jPSrqT0M/photo-2-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/1fFBtT8T/photo-3-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/TDbkbVM4/photo-4-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/V0Z67w1k/photo-5-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/Vcjtr25J/photo-6-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/Hf4vWL7Z/photo-7-2026-02-21-16-33-08.jpg'
]

const randomImage = () => MENU_IMAGES[Math.floor(Math.random() * MENU_IMAGES.length)]

const formatUptime = (s) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

const getMenuText = (prefix, botName) => `
🔥 *${botName}*
${'═'.repeat(30)}

🤖 *AI & CHAT*
${prefix}ai • ${prefix}gemini • ${prefix}gpt • ${prefix}deepseek • ${prefix}think
${prefix}debate • ${prefix}roast • ${prefix}story • ${prefix}poem • ${prefix}rap
${prefix}translate • ${prefix}summarize • ${prefix}fix • ${prefix}explain
${prefix}wormgpt • ${prefix}shion • ${prefix}spongebob • ${prefix}developer

🎵 *MUSIC & AUDIO*
${prefix}play • ${prefix}video • ${prefix}ytmp3 • ${prefix}ytmp4 • ${prefix}spotify
${prefix}shazam • ${prefix}lyrics • ${prefix}removevocal • ${prefix}bass
${prefix}nightcore • ${prefix}slow • ${prefix}deep • ${prefix}robot
${prefix}reverse • ${prefix}earrape • ${prefix}fat • ${prefix}squirrel

📥 *DOWNLOADERS*
${prefix}fb • ${prefix}ig • ${prefix}tt • ${prefix}twitter • ${prefix}pin
${prefix}snack • ${prefix}aio • ${prefix}apk • ${prefix}gdrive • ${prefix}mediafire

🎨 *IMAGE GENERATION (AI)*
${prefix}imagine • ${prefix}flux • ${prefix}fluxpro • ${prefix}anime
${prefix}pixar • ${prefix}cartoon • ${prefix}realistic • ${prefix}sketch

🖼️ *IMAGE EDITING*
${prefix}sticker • ${prefix}take • ${prefix}tgsticker • ${prefix}removebg
${prefix}remini • ${prefix}upscale • ${prefix}enhance • ${prefix}faceswap
${prefix}blur • ${prefix}greyscale • ${prefix}invert • ${prefix}filter

🎭 *PHOTO STYLES*
${prefix}toghibli • ${prefix}toanime • ${prefix}tocartoon • ${prefix}todisney
${prefix}tocyberpunk • ${prefix}togta • ${prefix}topixar • ${prefix}tosketch
${prefix}wanted • ${prefix}zombie • ${prefix}oldage • ${prefix}joker

✍️ *TEXT EFFECTS*
${prefix}neonlight • ${prefix}glitch • ${prefix}fire • ${prefix}matrix
${prefix}ice • ${prefix}blood • ${prefix}galaxy • ${prefix}rainbow
${prefix}metalic • ${prefix}graffiti • ${prefix}scifi • ${prefix}halloween

👥 *GROUP MANAGEMENT*
${prefix}add • ${prefix}kick • ${prefix}promote • ${prefix}demote
${prefix}everyone • ${prefix}hidetag • ${prefix}mute • ${prefix}unmute
${prefix}lock • ${prefix}unlock • ${prefix}invite • ${prefix}resetlink
${prefix}kickall • ${prefix}leavegc • ${prefix}groupname • ${prefix}groupdesc
${prefix}listmembers • ${prefix}admins • ${prefix}warn • ${prefix}warnlist
${prefix}poll • ${prefix}antidelete

🛡️ *ANTI / PROTECTION*
${prefix}antilink • ${prefix}antisticker • ${prefix}antinsfw • ${prefix}antimedia
${prefix}antibad • ${prefix}addbadword • ${prefix}delbadword • ${prefix}badwordlist
${prefix}antibug • ${prefix}anticall • ${prefix}floodblock • ${prefix}antitemu

⚡ *AUTOMATION*
${prefix}autotyping • ${prefix}autorecording • ${prefix}autoread • ${prefix}autoreact
${prefix}autoviewstatus • ${prefix}autoreactstatus • ${prefix}autobio
${prefix}alwaysonline • ${prefix}chatbot • ${prefix}autoforward

🌐 *WA CHANNELS*
${prefix}createchannel • ${prefix}channelinfo • ${prefix}newsearch
${prefix}followchannel • ${prefix}unfollowchannel • ${prefix}mutechannel
${prefix}unmutechannel • ${prefix}channelpost • ${prefix}deletechannel

🔍 *SEARCH & LOOKUP*
${prefix}google • ${prefix}image • ${prefix}youtube • ${prefix}imdb
${prefix}weather • ${prefix}wiki • ${prefix}define • ${prefix}news
${prefix}gsmarena • ${prefix}bible • ${prefix}quran

👤 *STALK / SOCIAL*
${prefix}gitstalk • ${prefix}igstalk • ${prefix}ttstalk • ${prefix}ytstalk
${prefix}wastalk • ${prefix}whoami • ${prefix}xstalk • ${prefix}tgstalk

🏆 *FOOTBALL / SPORTS*
${prefix}livescores • ${prefix}standings • ${prefix}matches • ${prefix}teaminfo
${prefix}player • ${prefix}sureodds • ${prefix}competitions

💰 *CRYPTO*
${prefix}price • ${prefix}topcrypto • ${prefix}cryptoindex • ${prefix}convert • ${prefix}cryptonews

🎮 *GAMES*
${prefix}truth • ${prefix}dare • ${prefix}8ball • ${prefix}rps • ${prefix}dice
${prefix}coinflip • ${prefix}trivia • ${prefix}riddle • ${prefix}guess
${prefix}wcg join/start/stop • ${prefix}ttt • ${prefix}slots • ${prefix}spin

🛠️ *TOOLS*
${prefix}tts • ${prefix}translate • ${prefix}qrcode • ${prefix}screenshot
${prefix}carbon • ${prefix}url • ${prefix}tempmail • ${prefix}tempnumber
${prefix}fakeid • ${prefix}fakecc • ${prefix}vv • ${prefix}emojimix
${prefix}ngl • ${prefix}bin • ${prefix}diff • ${prefix}sandbox

📄 *PDF TOOLS*
${prefix}pdfcreate • ${prefix}pdfmerge • ${prefix}pdfsplit • ${prefix}pdfread

🔊 *REACTIONS*
${prefix}hug • ${prefix}slap • ${prefix}kiss • ${prefix}pat • ${prefix}punch
${prefix}cry • ${prefix}dance • ${prefix}bonk • ${prefix}kill • ${prefix}wink

💰 *ECONOMY*
${prefix}daily • ${prefix}balance • ${prefix}give • ${prefix}leaderboard
${prefix}gamble • ${prefix}rob • ${prefix}work • ${prefix}crime • ${prefix}rank

🌍 *NIGERIA SPECIAL*
${prefix}pidgin • ${prefix}yoruba • ${prefix}igbo • ${prefix}hausa
${prefix}naijafact • ${prefix}naijaproverb • ${prefix}jollof • ${prefix}area
${prefix}sapa • ${prefix}hustle • ${prefix}genz9ja

🎭 *FUN / RANDOM*
${prefix}quotes • ${prefix}fact • ${prefix}meme • ${prefix}joke
${prefix}ship • ${prefix}iq • ${prefix}rate • ${prefix}howgay
${prefix}hack • ${prefix}animegirl • ${prefix}neko • ${prefix}waifu

👑 *OWNER ONLY*
${prefix}mode-public • ${prefix}mode-private • ${prefix}sudo • ${prefix}delsudo
${prefix}premium • ${prefix}block • ${prefix}ban • ${prefix}broadcast
${prefix}shutdown • ${prefix}restart • ${prefix}setpp • ${prefix}setbio
${prefix}addapikey • ${prefix}cleardata • ${prefix}report

⚙️ *SYSTEM / INFO*
${prefix}ping • ${prefix}alive • ${prefix}uptime • ${prefix}ram • ${prefix}cpu
${prefix}disk • ${prefix}platform • ${prefix}time • ${prefix}date
${prefix}about • ${prefix}owner • ${prefix}support • ${prefix}changelog

${'═'.repeat(30)}
_Type ${prefix}help <command> for details_
`.trim()

export default [
  {
    command: 'menu',
    aliases: ['help', 'commands', 'cmd'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const mem = process.memoryUsage()
      const ramMB = (mem.heapUsed / 1024 / 1024).toFixed(1)
      const uptime = formatUptime(process.uptime())
      const modeRes = await api.sessionGet('bot:mode')
      const mode = modeRes?.value?.toUpperCase() || 'PUBLIC'

      const headerCaption = [
        `🔥 *${ctx.botName}*`,
        `${'─'.repeat(28)}`,
        ``,
        `👤 User:   @${ctx.senderNumber}`,
        `⏱️  Uptime: *${uptime}*`,
        `💾 RAM:    *${ramMB}MB*`,
        `🤖 Mode:   *${mode}*`,
        ``,
        `_Scroll below for full command list_`
      ].join('\n')

      await sock.sendMessage(ctx.from, {
        image: { url: randomImage() },
        caption: headerCaption,
        mentions: [ctx.sender]
      }, { quoted: msg })

      await sock.sendMessage(ctx.from, {
        text: getMenuText(ctx.prefix, ctx.botName)
      }, { quoted: msg })
    }
  },

  {
    command: 'commandcount',
    aliases: ['totalcmds', 'cmdcount'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [`📊 *Command Count*`, ``, `🔥 *${ctx.botName}* has *500+* commands`, ``, `_Type ${ctx.prefix}menu to see all of them_`].join('\n')
      }, { quoted: msg })
    }
  }
]
