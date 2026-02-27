// commands/system/help.js
// .help          → shows all categories
// .help <cat>    → shows commands in that category
// .help <cmd>    → shows full help for that command

const HELP = {
  // ── TOOLS / FAKE ──────────────────────────────────────────────────────────
  opay: {
    category: 'Tools / Fake',
    desc: 'Generate a realistic fake OPay transaction receipt.',
    usage: '.opay <amount> | <receiver name> | <receiver bank> | <receiver account> | <sender name> | <sender bank>',
    example: '.opay 1650 | Firekid846 | MONIE POINT | 1234567890 | Firekid | OPay',
    note: 'For entertainment purposes only.',
  },
  fakecall: {
    category: 'Tools / Fake',
    desc: 'Generate a fake incoming call screen.',
    usage: '.fakecall <name or number>',
    example: '.fakecall +2348012345678',
  },
  fakefb: {
    category: 'Tools / Fake',
    desc: 'Generate a fake Facebook post.',
    usage: '.fakefb <name> | <post text>',
    example: '.fakefb John Doe | Just had the best jollof rice ever! 🍚🔥',
  },
  fakeinsta: {
    category: 'Tools / Fake',
    desc: 'Generate a fake Instagram post.',
    usage: '.fakeinsta <username> | <caption>',
    example: '.fakeinsta firekid_ng | Living my best life ✨🔥',
  },
  fakecc: {
    category: 'Tools / Fake',
    desc: 'Generate a fake test credit card number (for dev/testing only).',
    usage: '.fakecc <visa|mastercard|amex|discover> [count]',
    example: '.fakecc visa 3',
    note: 'For development/testing only. Not a real card.',
  },
  fakeid: {
    category: 'Tools / Fake',
    desc: 'Generate a random fake identity (name, address, credentials).',
    usage: '.fakeid [country code]',
    example: '.fakeid NG',
    note: 'Supports: US GB CA AU FR DE NG ZA BR IN JP KR and more.',
  },
  ngl: {
    category: 'Tools / Fake',
    desc: 'Generate an anonymous NGL link for a username.',
    usage: '.ngl <username>',
    example: '.ngl yourname',
  },
  cc: {
    category: 'Tools / Fake',
    desc: 'Look up a bank BIN (first 6-8 digits of a card number).',
    usage: '.cc <BIN>',
    example: '.cc 411111',
  },
  iphone: {
    category: 'Tools / Fake',
    desc: 'Frame an image inside an iPhone mockup.',
    usage: 'Reply to an image + .iphone',
  },

  // ── AI & CHAT ─────────────────────────────────────────────────────────────
  ai: {
    category: 'AI & Chat',
    desc: 'Chat with the bot using AI (Groq Llama 3.3 70B).',
    usage: '.ai <your message>',
    example: '.ai explain quantum physics simply',
    note: 'Replies in the same language you write in.',
  },
  groq: {
    category: 'AI & Chat',
    desc: 'Explicitly use Groq AI (ultra-fast Llama 3.3 70B).',
    usage: '.groq <your message>',
    example: '.groq write me a cover letter',
  },
  gemini: {
    category: 'AI & Chat',
    desc: 'Chat with Google Gemini 1.5 Flash AI.',
    usage: '.gemini <your message>',
    example: '.gemini write me a professional email',
  },
  gpt: {
    category: 'AI & Chat',
    desc: 'GPT-style response using Groq Llama.',
    usage: '.gpt <your message>',
    example: '.gpt what is the meaning of life',
  },
  deepseek: {
    category: 'AI & Chat',
    desc: 'Deep analytical AI using Mixtral 8x7B for complex reasoning.',
    usage: '.deepseek <your message>',
    example: '.deepseek debug this code for me',
  },
  think: {
    category: 'AI & Chat',
    desc: 'Step-by-step reasoning on any problem or question.',
    usage: '.think <problem or question>',
    example: '.think should I learn Python or JavaScript first',
  },
  translate: {
    category: 'AI & Chat',
    desc: 'Translate text to another language.',
    usage: '.translate <language> <text>',
    example: '.translate yoruba how are you',
  },
  roast: {
    category: 'AI & Chat',
    desc: 'Get roasted by the AI. Reply to someone to roast them.',
    usage: '.roast [@user or reply]',
    example: '.roast @john',
  },
  story: {
    category: 'AI & Chat',
    desc: 'Generate a short creative story based on your prompt.',
    usage: '.story <prompt>',
    example: '.story a boy who discovers he can talk to plants',
  },
  poem: {
    category: 'AI & Chat',
    desc: 'Write a poem on any topic.',
    usage: '.poem <topic>',
    example: '.poem the beauty of Lagos at night',
  },
  rap: {
    category: 'AI & Chat',
    desc: 'Generate rap bars/lyrics on any topic.',
    usage: '.rap <topic>',
    example: '.rap coding life',
  },
  debate: {
    category: 'AI & Chat',
    desc: 'See both sides of any debate topic.',
    usage: '.debate <topic>',
    example: '.debate is remote work better than office',
  },
  summarize: {
    category: 'AI & Chat',
    desc: 'Summarize any long text or article.',
    usage: '.summarize <text> OR reply to a message',
    example: '.summarize [paste article here]',
  },
  fix: {
    category: 'AI & Chat',
    desc: 'Fix grammar, spelling, and improve any text.',
    usage: '.fix <text> OR reply to a message',
    example: '.fix i am going to the market yesterday',
  },
  explain: {
    category: 'AI & Chat',
    desc: 'Get a clear, simple explanation of any concept.',
    usage: '.explain <topic>',
    example: '.explain how blockchain works',
  },

  // ── GROUP MANAGEMENT ──────────────────────────────────────────────────────
  kick: {
    category: 'Group',
    desc: 'Remove a member from the group.',
    usage: '.kick @user',
    example: '.kick @john',
    note: 'Bot must be admin. Cannot kick another admin.',
    flags: 'adminOnly, botAdmin',
  },
  add: {
    category: 'Group',
    desc: 'Add a phone number to the group.',
    usage: '.add <number>',
    example: '.add 2348012345678',
    note: 'Use the full number without + sign.',
    flags: 'adminOnly, botAdmin',
  },
  promote: {
    category: 'Group',
    desc: 'Promote a member to admin.',
    usage: '.promote @user',
    example: '.promote @jane',
    flags: 'adminOnly, botAdmin',
  },
  demote: {
    category: 'Group',
    desc: 'Remove admin status from a member.',
    usage: '.demote @user',
    example: '.demote @jane',
    note: 'Cannot demote the group creator.',
    flags: 'adminOnly, botAdmin',
  },
  tagall: {
    category: 'Group',
    desc: 'Tag all group members at once.',
    usage: '.tagall [optional message]',
    example: '.tagall Meeting starts now!',
    flags: 'adminOnly',
  },
  hidetag: {
    category: 'Group',
    desc: 'Tag all members silently — no visible @mentions.',
    usage: '.hidetag <message>',
    example: '.hidetag Read the pinned message.',
    flags: 'adminOnly',
  },
  mute: { category: 'Group', desc: 'Mute the group so only admins can send messages.', usage: '.mute', flags: 'adminOnly, botAdmin' },
  unmute: { category: 'Group', desc: 'Unmute the group.', usage: '.unmute', flags: 'adminOnly, botAdmin' },
  lock: { category: 'Group', desc: 'Lock group settings (only admins can edit info).', usage: '.lock', flags: 'adminOnly, botAdmin' },
  unlock: { category: 'Group', desc: 'Unlock group settings.', usage: '.unlock', flags: 'adminOnly, botAdmin' },
  invite: { category: 'Group', desc: 'Get the group invite link.', usage: '.invite', flags: 'adminOnly' },
  revoke: { category: 'Group', desc: 'Reset the group invite link.', usage: '.revoke', flags: 'adminOnly, botAdmin' },
  kickall: { category: 'Group', desc: 'Remove all non-admin members.', usage: '.kickall', note: 'Irreversible.', flags: 'ownerOnly, botAdmin' },
  groupname: { category: 'Group', desc: 'Change the group name.', usage: '.groupname <new name>', flags: 'adminOnly, botAdmin' },
  groupdesc: { category: 'Group', desc: 'Change the group description.', usage: '.groupdesc <text> | .groupdesc clear', flags: 'adminOnly, botAdmin' },
  warn: { category: 'Group', desc: 'Warn a member. 3 warnings = auto-remove.', usage: '.warn @user [reason]', flags: 'adminOnly' },
  resetwarn: { category: 'Group', desc: 'Clear all warnings from a member.', usage: '.resetwarn @user', flags: 'adminOnly' },
  warnlist: { category: 'Group', desc: 'View warned members.', usage: '.warnlist [@user]', flags: 'adminOnly' },
  poll: { category: 'Group', desc: 'Create a poll.', usage: '.poll Question | Option1 | Option2', note: 'Max 12 options.', flags: 'groupOnly' },
  listmembers: { category: 'Group', desc: 'List all group members with roles.', usage: '.listmembers', flags: 'groupOnly' },
  admins: { category: 'Group', desc: 'List all admins.', usage: '.admins', flags: 'groupOnly' },

  // ── ANTI / PROTECTION ─────────────────────────────────────────────────────
  antilink: { category: 'Anti / Protect', desc: 'Control how the bot handles links.', usage: '.antilink <off|delete|warn|kick>', flags: 'adminOnly' },
  antibad: { category: 'Anti / Protect', desc: 'Toggle bad word filter.', usage: '.antibad on/off', flags: 'adminOnly' },
  addbadword: { category: 'Anti / Protect', desc: 'Add words to the ban list.', usage: '.addbadword <word> [word2]', flags: 'adminOnly' },
  delbadword: { category: 'Anti / Protect', desc: 'Remove a banned word.', usage: '.delbadword <word>', flags: 'adminOnly' },
  badwordlist: { category: 'Anti / Protect', desc: 'See all banned words (sent to DM).', usage: '.badwordlist', flags: 'adminOnly' },
  antisticker: { category: 'Anti / Protect', desc: 'Block stickers in the group.', usage: '.antisticker on/off', flags: 'adminOnly' },
  antinsfw: { category: 'Anti / Protect', desc: 'Block NSFW content.', usage: '.antinsfw on/off', flags: 'adminOnly' },
  antimedia: { category: 'Anti / Protect', desc: 'Block all media in the group.', usage: '.antimedia on/off', flags: 'adminOnly' },
  anticall: { category: 'Anti / Protect', desc: 'Auto-reject calls to the bot.', usage: '.anticall on/off', flags: 'ownerOnly' },
  antibug: { category: 'Anti / Protect', desc: 'Protect against crash messages.', usage: '.antibug on/off', flags: 'adminOnly' },
  antidelete: {
    category: 'Anti / Protect',
    desc: 'Forward deleted messages to your self-chat (chat with yourself). Works for DMs and groups.',
    usage: '.antidelete p | g | set | off | all off',
    example: '.antidelete p — watch DMs\n.antidelete g — watch all groups\n.antidelete set — watch only this chat (run it there)\n.antidelete off — stop watching this chat\n.antidelete all off — turn off entirely',
    note: 'The command message is silently deleted. All replies go to your self-chat.',
  },
  floodblock: { category: 'Anti / Protect', desc: 'Limit message speed to prevent spam.', usage: '.floodblock on [limit] | off', note: 'Default limit: 5 msgs/5s', flags: 'adminOnly, botAdmin' },

  // ── AUTOMATION ────────────────────────────────────────────────────────────
  autoread: { category: 'Automation', desc: 'Auto-mark all messages as read.', usage: '.autoread on/off', flags: 'ownerOnly' },
  autotyping: { category: 'Automation', desc: 'Show typing indicator while processing.', usage: '.autotyping on/off', flags: 'ownerOnly' },
  autorecording: { category: 'Automation', desc: 'Show recording indicator on voice messages.', usage: '.autorecording on/off', flags: 'ownerOnly' },
  autoreact: { category: 'Automation', desc: 'Auto-react to messages.', usage: '.autoreact on/off', flags: 'ownerOnly' },
  autoviewstatus: { category: 'Automation', desc: "Auto-view everyone's status.", usage: '.autoviewstatus on/off', flags: 'ownerOnly' },
  autobio: { category: 'Automation', desc: "Auto-rotate the bot's bio every hour.", usage: '.autobio on/off', flags: 'ownerOnly' },
  alwaysonline: { category: 'Automation', desc: "Keep bot's status showing as online.", usage: '.alwaysonline on/off', flags: 'ownerOnly' },
  chatbot: { category: 'Automation', desc: 'Toggle AI auto-reply to every message.', usage: '.chatbot on/off' },
  schedmsg: { category: 'Automation', desc: 'Schedule a message to send later.', usage: '.schedmsg <delay> <message>', example: '.schedmsg 30m Good night everyone!', note: 'Delay: 30s | 10m | 2h | 1d' },

  // ── GROUP MODES ───────────────────────────────────────────────────────────
  nightmode: { category: 'Modes', desc: 'Auto-mute at midnight, unmute at 6am.', usage: '.nightmode on/off', flags: 'adminOnly, botAdmin' },
  slowmode: { category: 'Modes', desc: 'Set cooldown between messages.', usage: '.slowmode <seconds> | off', note: 'Min: 5s Max: 3600s', flags: 'adminOnly, botAdmin' },
  lockdown: { category: 'Modes', desc: 'Emergency group mute. Run again to lift.', usage: '.lockdown', flags: 'adminOnly, botAdmin' },
  safezone: { category: 'Modes', desc: 'Exempt members from anti-protection.', usage: '.safezone @user | remove @user | list', flags: 'adminOnly' },

  // ── STICKER ───────────────────────────────────────────────────────────────
  sticker: { category: 'Sticker', desc: 'Convert image/video to sticker.', usage: 'Send/reply to image or video + .sticker', note: 'Videos capped at 6 seconds.' },
  take: { category: 'Sticker', desc: 'Steal a sticker with your own pack name.', usage: 'Reply to sticker + .take [name] | [author]' },
  tgsticker: { category: 'Sticker', desc: 'Convert sticker back to image/GIF.', usage: 'Reply to sticker + .tgsticker' },

  // ── AUDIO FX ──────────────────────────────────────────────────────────────
  bass: { category: 'Audio FX', desc: 'Add bass boost to audio.', usage: 'Reply to audio + .bass' },
  nightcore: { category: 'Audio FX', desc: 'Speed up to nightcore style.', usage: 'Reply to audio + .nightcore' },
  slow: { category: 'Audio FX', desc: 'Slow down audio.', usage: 'Reply to audio + .slow' },
  robot: { category: 'Audio FX', desc: 'Robotic voice effect.', usage: 'Reply to audio + .robot' },
  reverse: { category: 'Audio FX', desc: 'Play audio backwards.', usage: 'Reply to audio + .reverse' },
  earrape: { category: 'Audio FX', desc: 'Extremely loud distorted audio.', usage: 'Reply to audio + .earrape' },
  squirrel: { category: 'Audio FX', desc: 'Chipmunk high-pitched effect.', usage: 'Reply to audio + .squirrel' },
  deep: { category: 'Audio FX', desc: 'Deep slow pitch effect.', usage: 'Reply to audio + .deep' },
  shazam: { category: 'Audio FX', desc: 'Identify a song from audio/video.', usage: 'Reply to audio/video + .shazam', note: 'Works best with 10+ seconds of clear audio.' },

  // ── ECONOMY ───────────────────────────────────────────────────────────────
  daily: { category: 'Economy', desc: 'Claim daily FireCoins. Resets every 24h.', usage: '.daily', note: 'Premium users get +50% bonus.' },
  balance: { category: 'Economy', desc: 'Check your or another member\'s balance.', usage: '.balance [@user]' },
  work: { category: 'Economy', desc: 'Do a random job and earn coins. Cooldown: 1h.', usage: '.work' },
  crime: { category: 'Economy', desc: 'Risky crime for big rewards. Cooldown: 2h.', usage: '.crime' },
  gamble: { category: 'Economy', desc: 'Bet your coins on the slot machine.', usage: '.gamble <amount>', example: '.gamble 500' },
  give: { category: 'Economy', desc: 'Transfer coins to another member.', usage: '.give @user <amount>', example: '.give @jane 1000' },
  leaderboard: { category: 'Economy', desc: 'View top 10 richest users.', usage: '.leaderboard' },

  // ── ANIME CARDS ───────────────────────────────────────────────────────────
  acard: {
    category: 'Anime Cards',
    desc: 'Anime card collection system. Spin packs, collect characters, trade in the marketplace.',
    usage: '.acard <list|view|dups|top|packs|spin|spin10|release|market|buy|showcase>',
    example: '.acard spin Naruto Pack\n.acard list\n.acard buy 3\n.acard showcase @user',
    note: 'Cards are stored to your account via FK key — survive reconnects and number changes.',
  },

  // ── FOOTBALL CARDS ────────────────────────────────────────────────────────
  fcard: {
    category: 'Football Cards',
    desc: 'Football card collection system. Spin packs, collect players, trade in the marketplace.',
    usage: '.fcard <list|view|dups|top|packs|spin|spin10|release|market|buy|showcase>',
    example: '.fcard spin World Class Pack\n.fcard list\n.fcard buy 2\n.fcard showcase @user',
    note: 'Tiers: Bronze / Silver / Gold / Icon. Cards persist to your dashboard account.',
  },

  // ── GAMING PROFILES ───────────────────────────────────────────────────────
  minecraft: { category: 'Gaming Profiles', desc: 'Look up a Minecraft player — UUID, skin, NameMC link.', usage: '.minecraft <username>', example: '.minecraft Notch' },
  xbox: { category: 'Gaming Profiles', desc: 'Look up an Xbox Live gamertag — gamerscore, tier, avatar.', usage: '.xbox <gamertag>', example: '.xbox Major Nelson' },
  steam: { category: 'Gaming Profiles', desc: 'Look up a Steam profile by vanity URL or SteamID64.', usage: '.steam <vanity URL or SteamID64>', example: '.steam gaben' },
  roblox: { category: 'Gaming Profiles', desc: 'Look up a Roblox profile — join date, followers, friends.', usage: '.roblox <username>', example: '.roblox Builderman' },
  psn: { category: 'Gaming Profiles', desc: 'Look up a PSN profile — level, trophy counts.', usage: '.psn <PSN ID>', example: '.psn Ninja' },
  fortnite: {
    category: 'Gaming Profiles',
    desc: 'Look up Fortnite BR lifetime stats — wins, K/D, matches, hours.',
    usage: '.fortnite <username>',
    example: '.fortnite Ninja',
    note: 'Requires FORTNITE_API_KEY env variable. Free key at dash.fortnite-api.com (login with Discord).',
  },
  valorant: {
    category: 'Gaming Profiles',
    desc: 'Look up a Valorant account — rank, RR, peak rank, level.',
    usage: '.valorant <name#tag>',
    example: '.valorant Ninja#NA1',
    note: 'Requires HENRIK_API_KEY env variable. Free key at henrikdev.xyz.',
  },
  chess: { category: 'Gaming Profiles', desc: 'Look up a Chess.com profile — bullet/blitz/rapid ratings and W/L/D record.', usage: '.chess <username>', example: '.chess MagnusCarlsen' },
  github: { category: 'Gaming Profiles', desc: 'Look up a GitHub profile — repos, followers, stars, top repos.', usage: '.github <username>', example: '.github torvalds' },

  // ── GITHUB TOOLS ──────────────────────────────────────────────────────────
  downloadrepo: {
    category: 'Tools',
    desc: 'Download any GitHub repository as a ZIP file and send it in the chat.',
    usage: '.downloadrepo <github URL or owner/repo>',
    example: '.downloadrepo https://github.com/WhiskeySockets/Baileys\n.downloadrepo torvalds/linux',
    note: 'Repos over ~150MB may fail. Large repos take longer to download.',
  },

  // ── OSINT / LOOKUP ────────────────────────────────────────────────────────
  emailcheck: {
    category: 'OSINT',
    desc: 'Check if an email was found in a known data breach using HaveIBeenPwned.',
    usage: '.emailcheck <email>',
    example: '.emailcheck test@gmail.com',
    note: 'Requires HIBP_API_KEY ($3.50/month at haveibeenpwned.com).',
  },
  phonelookup: {
    category: 'OSINT',
    desc: 'Look up a phone number — carrier, country, line type (mobile/landline/VoIP).',
    usage: '.phonelookup <number>',
    example: '.phonelookup +2348012345678',
    note: 'Use international format. Requires VERIPHONE_KEY (free at veriphone.io — 1000 lookups/month).',
  },
  usercheck: {
    category: 'OSINT',
    desc: 'Check if a username exists across 30+ platforms (GitHub, Instagram, TikTok, Twitter, Reddit, etc.)',
    usage: '.usercheck <username>',
    example: '.usercheck firekid',
    note: 'Takes 10–15 seconds to check all platforms.',
  },

  // ── FUN ───────────────────────────────────────────────────────────────────
  meme: {
    category: 'Tools',
    desc: 'Generate a meme from 30+ popular templates using the Imgflip API.',
    usage: '.meme <template> | <top text> | <bottom text>',
    example: '.meme Drake | Studying | Scrolling TikTok\n.meme list — see all templates',
    note: 'Requires IMGFLIP_USERNAME and IMGFLIP_PASSWORD (free account at imgflip.com).',
  },
  roastme: {
    category: 'Tools',
    desc: 'Get the AI to roast YOU — brutal, funny, uses your name.',
    usage: '.roastme',
    note: 'Cannot be undone. You asked for it.',
  },

  // ── NAIJA ─────────────────────────────────────────────────────────────────
  naija: {
    category: 'Tools',
    desc: 'Get a random Nigerian proverb with its meaning explained.',
    usage: '.naija',
    note: '50+ authentic Nigerian/African proverbs built in.',
  },

  // ── GAMES ─────────────────────────────────────────────────────────────────
  truth: { category: 'Games', desc: 'Get a random Truth question.', usage: '.truth' },
  dare: { category: 'Games', desc: 'Get a random Dare challenge.', usage: '.dare' },
  '8ball': { category: 'Games', desc: 'Ask the magic 8-ball a question.', usage: '.8ball <question>' },
  rps: { category: 'Games', desc: 'Play Rock Paper Scissors.', usage: '.rps rock | paper | scissors' },
  dice: { category: 'Games', desc: 'Roll a dice.', usage: '.dice [sides]', example: '.dice 20' },
  coinflip: { category: 'Games', desc: 'Flip a coin — heads or tails.', usage: '.coinflip' },
  trivia: { category: 'Games', desc: 'Answer a trivia question. 60 seconds.', usage: '.trivia | .trivia hint | .trivia skip' },
  riddle: { category: 'Games', desc: 'Solve a riddle. 90 seconds.', usage: '.riddle | .riddle hint | .riddle skip' },
  guess: { category: 'Games', desc: 'Guess a number between 1-100. 7 attempts.', usage: '.guess start → .guess <number>' },
  wcg: { category: 'Games', desc: 'Word Chain Game — chain words by last letter.', usage: '.wcg join | start | stop | skip', flags: 'groupOnly' },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  gcannounce: { category: 'Social', desc: 'Post a formatted announcement.', usage: '.gcannounce <message>', flags: 'adminOnly, groupOnly' },
  confession: { category: 'Social', desc: 'Post anonymous confession to group.', usage: '.confession <your secret>', flags: 'groupOnly' },
  suggest: { category: 'Social', desc: 'Submit anonymous suggestion for admins.', usage: '.suggest <idea>', flags: 'groupOnly' },
  suggestions: { category: 'Social', desc: 'View all pending suggestions.', usage: '.suggestions', flags: 'adminOnly, groupOnly' },
  spotlight: { category: 'Social', desc: 'Feature a random or specific member.', usage: '.spotlight [@user]', flags: 'groupOnly' },
  groupmood: { category: 'Social', desc: 'Get a mood reading for the group vibe.', usage: '.groupmood', flags: 'groupOnly' },

  // ── PROFILE / PRIVACY ─────────────────────────────────────────────────────
  jid: { category: 'Profile', desc: 'Get your WhatsApp JID.', usage: '.jid' },
  getprivacy: { category: 'Profile', desc: 'View all your WhatsApp privacy settings.', usage: '.getprivacy' },
  setlastseen: { category: 'Profile', desc: 'Control who sees your last seen.', usage: '.setlastseen <all|contacts|none>' },
  setonline: { category: 'Profile', desc: 'Control who sees when you\'re online.', usage: '.setonline <all|match_last_seen>' },
  setreadreceipts: { category: 'Profile', desc: 'Toggle blue read ticks.', usage: '.setreadreceipts all | none' },

  // ── CONVERSATION ──────────────────────────────────────────────────────────
  unsend: { category: 'Conversation', desc: 'Delete the last bot message in this chat.', usage: '.unsend' },
  recall: { category: 'Conversation', desc: 'Delete any quoted message.', usage: 'Reply to message + .recall' },
  vanish: { category: 'Conversation', desc: 'Send a message that disappears after 7 days.', usage: '.vanish <message>' },
  whisper: { category: 'Conversation', desc: 'Silently DM someone from the group.', usage: '.whisper @user <message>', flags: 'groupOnly' },
  lastseen: { category: 'Conversation', desc: 'Check someone\'s last seen info and bio.', usage: '.lastseen @user | reply to someone' },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  ping: { category: 'System', desc: 'Check bot response latency.', usage: '.ping' },
  alive: { category: 'System', desc: 'Full bot status — uptime, RAM, mode.', usage: '.alive' },
  uptime: { category: 'System', desc: 'How long the bot has been running.', usage: '.uptime' },
  ram: { category: 'System', desc: 'View RAM usage for bot and server.', usage: '.ram' },
  menu: { category: 'System', desc: 'Show full command list.', usage: '.menu' },
  support: { category: 'System', desc: 'Get the link to the support group.', usage: '.support' },
  repo: { category: 'System', desc: 'Get the bot\'s GitHub repository link.', usage: '.repo' },
  about: { category: 'System', desc: 'About Firekid XMD and its developer.', usage: '.about' },
  owner: { category: 'System', desc: 'Get the developer\'s contact info.', usage: '.owner' },

  // ── OWNER ─────────────────────────────────────────────────────────────────
  broadcast: { category: 'Owner', desc: 'Send a message to all groups.', usage: '.broadcast <message>', flags: 'ownerOnly' },
  shutdown: { category: 'Owner', desc: 'Shut the bot down.', usage: '.shutdown', flags: 'ownerOnly' },
  restart: { category: 'Owner', desc: 'Restart the bot.', usage: '.restart', flags: 'ownerOnly' },
  sudo: { category: 'Owner', desc: 'Grant sudo access to a user.', usage: '.sudo @user', flags: 'ownerOnly' },
  delsudo: { category: 'Owner', desc: 'Remove sudo access.', usage: '.delsudo @user', flags: 'ownerOnly' },
  ban: { category: 'Owner', desc: 'Permanently ban a user.', usage: '.ban @user [reason]', flags: 'ownerOnly' },
  unban: { category: 'Owner', desc: 'Lift a ban.', usage: '.unban @user', flags: 'ownerOnly' },
  block: { category: 'Owner', desc: 'Block a user from the bot.', usage: '.block @user', flags: 'sudoOnly' },
  setpp: { category: 'Owner', desc: "Change the bot's profile picture.", usage: 'Reply to image + .setpp', flags: 'sudoOnly' },
  setbio: { category: 'Owner', desc: "Change the bot's bio. Max 139 chars.", usage: '.setbio <text>', flags: 'sudoOnly' },
  'mode-public': { category: 'Owner', desc: 'Open bot to all users.', usage: '.mode-public', flags: 'ownerOnly' },
  'mode-private': { category: 'Owner', desc: 'Restrict bot to owner only.', usage: '.mode-private', flags: 'ownerOnly' },

  // ── SEARCH & LOOKUP ───────────────────────────────────────────────────────
  google:       { category: 'Search', desc: 'Google/DuckDuckGo instant search results.', usage: '.google <query>', example: '.google latest AI news 2025' },
  wiki:         { category: 'Search', desc: 'Search Wikipedia for any topic.', usage: '.wiki <topic>', example: '.wiki Elon Musk' },
  define:       { category: 'Search', desc: 'Dictionary definition of any word.', usage: '.define <word>', example: '.define serendipity' },
  news:         { category: 'Search', desc: 'Latest news headlines on any topic.', usage: '.news [topic]', example: '.news Nigeria', note: 'Defaults to Nigeria/Africa news if no topic given.' },
  weather:      { category: 'Search', desc: 'Current weather and tomorrow forecast for any city.', usage: '.weather <city>', example: '.weather Lagos' },
  imgsearch:    { category: 'Search', desc: 'Generate an AI image from a search query.', usage: '.imgsearch <query>', example: '.imgsearch sunset beach Nigeria' },
  imdb:         { category: 'Search', desc: 'Movie or TV series info from IMDB/OMDB.', usage: '.imdb <title>', example: '.imdb Breaking Bad' },
  lyrics:       { category: 'Search', desc: 'Get song lyrics by song name or artist.', usage: '.lyrics <song> [- artist]', example: '.lyrics Essence - Wizkid' },
  gsmarena:     { category: 'Search', desc: 'Phone specs lookup from GSMArena.', usage: '.gsmarena <phone name>', example: '.gsmarena iPhone 15 Pro' },
  ytsearch:     { category: 'Search', desc: 'Search YouTube and get top video results with links.', usage: '.ytsearch <query>', example: '.ytsearch Burna Boy live concert 2025' },
  bing:         { category: 'Search', desc: 'Bing/DuckDuckGo search results.', usage: '.bing <query>', example: '.bing best phones under 50k naira' },
  bible:        { category: 'Search', desc: 'Look up a Bible verse or get a random one.', usage: '.bible [reference]', example: '.bible John 3:16', note: 'Use just .bible for a random verse' },
  quran:        { category: 'Search', desc: 'Look up a Quran verse (Arabic + English translation).', usage: '.quran [surah:ayah]', example: '.quran 2:255', note: 'Use just .quran for a random verse. Also try surah names like .quran Al-Fatiha' },
  cryptoprice:  { category: 'Search', desc: 'Live crypto price in USD and NGN.', usage: '.cryptoprice <coin>', example: '.cryptoprice bitcoin', note: 'Also try: ethereum, solana, dogecoin, bnb' },
  ipinfo:       { category: 'Search', desc: 'IP address geolocation and ISP info.', usage: '.ipinfo [IP address]', example: '.ipinfo 8.8.8.8', note: 'Leave blank to check the server IP' },
  whois:        { category: 'Search', desc: 'Domain WHOIS lookup — registrar, dates, nameservers.', usage: '.whois <domain>', example: '.whois google.com' },
  dnslookup:    { category: 'Search', desc: 'DNS record lookup for any domain (A, MX, NS, TXT).', usage: '.dnslookup <domain>', example: '.dnslookup facebook.com' },

  // ── PHOTO STYLES ──────────────────────────────────────────────────────────
  toghibli:     { category: 'Photo Styles', desc: 'Convert photo to Studio Ghibli anime style.', usage: 'Reply to image + .toghibli' },
  toanime:      { category: 'Photo Styles', desc: 'Convert photo to anime illustration style.', usage: 'Reply to image + .toanime' },
  tocartoon:    { category: 'Photo Styles', desc: 'Convert photo to cartoon/comic style.', usage: 'Reply to image + .tocartoon' },
  todisney:     { category: 'Photo Styles', desc: 'Convert photo to Disney character style.', usage: 'Reply to image + .todisney' },
  tocyberpunk:  { category: 'Photo Styles', desc: 'Convert photo to cyberpunk neon style.', usage: 'Reply to image + .tocyberpunk' },
  tocomic:      { category: 'Photo Styles', desc: 'Convert photo to Marvel/DC comic book style.', usage: 'Reply to image + .tocomic' },
  togta:        { category: 'Photo Styles', desc: 'Convert photo to GTA V loading screen art style.', usage: 'Reply to image + .togta' },
  tomanga:      { category: 'Photo Styles', desc: 'Convert photo to black and white manga style.', usage: 'Reply to image + .tomanga' },
  topixar:      { category: 'Photo Styles', desc: 'Convert photo to Pixar 3D movie character style.', usage: 'Reply to image + .topixar' },
  tooilpainting:{ category: 'Photo Styles', desc: 'Convert photo to classic oil painting style.', usage: 'Reply to image + .tooilpainting' },
  tosketch:     { category: 'Photo Styles', desc: 'Convert photo to detailed pencil sketch.', usage: 'Reply to image + .tosketch' },
  tovintage:    { category: 'Photo Styles', desc: 'Convert photo to vintage/retro photo style.', usage: 'Reply to image + .tovintage' },
  towatercolor: { category: 'Photo Styles', desc: 'Convert photo to watercolor painting style.', usage: 'Reply to image + .towatercolor' },

  // ── PHOTO EFFECTS ─────────────────────────────────────────────────────────
  zombie:       { category: 'Photo Effects', desc: 'Apply zombie horror effect to a photo.', usage: 'Reply to image + .zombie' },
  oldage:       { category: 'Photo Effects', desc: 'Age progression — see what someone looks like at 70+.', usage: 'Reply to image + .oldage' },
  spirit:       { category: 'Photo Effects', desc: 'Apply ethereal spirit/ghost aura effect.', usage: 'Reply to image + .spirit' },
  satan:        { category: 'Photo Effects', desc: 'Apply dark demonic horror edit.', usage: 'Reply to image + .satan' },
  punk:         { category: 'Photo Effects', desc: 'Apply punk rock aesthetic style.', usage: 'Reply to image + .punk' },
  hijab:        { category: 'Photo Effects', desc: 'AI hijab overlay on a photo.', usage: 'Reply to image + .hijab' },
  wanted:       { category: 'Photo Effects', desc: 'Wild West wanted poster effect.', usage: 'Reply to image + .wanted' },
  drip:         { category: 'Photo Effects', desc: 'Dripping paint art effect.', usage: 'Reply to image + .drip' },
  joker:        { category: 'Photo Effects', desc: 'Joker villain makeup effect.', usage: 'Reply to image + .joker' },
  polaroid:     { category: 'Photo Effects', desc: 'Vintage polaroid frame effect.', usage: 'Reply to image + .polaroid' },
  gun:          { category: 'Photo Effects', desc: 'Holding gun action movie effect.', usage: 'Reply to image + .gun' },
  clown:        { category: 'Photo Effects', desc: 'Clown face paint makeup overlay.', usage: 'Reply to image + .clown' },
  mirror:       { category: 'Photo Effects', desc: 'Mirror/symmetrical reflection effect.', usage: 'Reply to image + .mirror' },
  partner:      { category: 'Photo Effects', desc: 'Romantic couple collage effect.', usage: 'Reply to image + .partner' },
  nanobanana:   { category: 'Photo Effects', desc: 'Creative AI art style — provide your own prompt.', usage: 'Reply to image + .nanobanana [style prompt]', example: '.nanobanana cyberpunk warrior' },

  // ── VIEW ONCE & DOWNLOADER ────────────────────────────────────────────────
  vv: {
    category: 'Tools',
    desc: 'Reveal a view once photo or video and send it in the same chat.',
    usage: 'Reply to a view once + .vv',
  },
  vv2: {
    category: 'Tools',
    desc: 'Reveal a view once silently — sends it to your self-chat and deletes the .vv2 command. Nothing is sent in the current chat.',
    usage: 'Reply to a view once + .vv2',
    note: 'Completely silent — no trace left in the chat.',
  },
  save: {
    category: 'Tools',
    desc: 'Reply to someone\'s WhatsApp status to download it and send it in the current chat.',
    usage: 'Reply to a status + .save',
    example: '.save (replied to a status photo/video)',
    note: 'Supports photos, videos, audio, and text statuses.',
  },
  play: {
    category: 'Downloader',
    desc: 'Search YouTube by song name and download it as an MP3 audio file in one command.',
    usage: '.play <song name>',
    example: '.play Essence Wizkid\n.play Blinding Lights The Weeknd',
    note: 'No link needed — just the song name. Downloads the top YouTube result.',
  },
  searchmusic: {
    category: 'Downloader',
    desc: 'Search YouTube for a song and see up to 6 results with title, channel, duration, views and link. Info only — no download.',
    usage: '.searchmusic <song name>',
    example: '.searchmusic Burna Boy Last Last\n.searchmusic Afrobeats 2025 mix',
    note: 'Use .play to actually download a result.',
  },

  // ── TOOLS (new) ───────────────────────────────────────────────────────────
  sendstatus:   {
    category: 'Tools',
    desc: 'Post any message (text/image/video/audio) as your WhatsApp status.',
    usage: `Reply to a message + .sendstatus  OR  .sendstatus <text>`,
    example: '.sendstatus Just woke up and chose chaos 🔥',
    note: 'Videos must be ≤30 seconds. Status is visible to your WA contacts.',
  },
  sensitivity:  {
    category: 'Tools',
    desc: 'Calculate optimized gaming sensitivity for Free Fire or CODM based on your device.',
    usage: '.sensitivity <ff|codm> <device name> [| play_style | experience]',
    example: '.sensitivity ff iPhone X\n.sensitivity codm Samsung Galaxy S22 | 4fingers\n.sensitivity ff Tecno Spark 10 | aggressive | advanced',
    note: 'Play styles: aggressive, rusher, precise, sniper, balanced, versatile, defensive\nExperience: beginner, intermediate, advanced, professional, expert',
  },
}

const getCategories = () => {
  const cats = {}
  for (const [cmd, info] of Object.entries(HELP)) {
    const cat = info.category
    if (!cats[cat]) cats[cat] = []
    cats[cat].push(cmd)
  }
  return cats
}

const flagLabel = (flags) => {
  if (!flags) return null
  return flags.split(', ').map(f => {
    if (f === 'ownerOnly')  return '👑 Owner only'
    if (f === 'sudoOnly')   return '🔐 Sudo only'
    if (f === 'adminOnly')  return '⭐ Admins only'
    if (f === 'botAdmin')   return '🤖 Bot must be admin'
    if (f === 'groupOnly')  return '👥 Groups only'
    return f
  }).join(' · ')
}

export default [
  {
    command: 'help',          // FIXED: was 'helpme', now 'help'
    aliases: ['helpme', 'guide', 'howto'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const p   = ctx.prefix
      const arg = ctx.args[0]?.toLowerCase()

      if (!arg) {
        const cats = getCategories()
        const lines = Object.entries(cats).map(([cat, cmds]) =>
          `┌─ *${cat}* (${cmds.length})\n│  ${p}help ${cat.split(' ')[0].toLowerCase()}\n└─ ${cmds.slice(0, 4).map(c => `${p}${c}`).join(', ')}${cmds.length > 4 ? ` +${cmds.length - 4} more` : ''}`
        )

        return sock.sendMessage(ctx.from, {
          text: [
            `*${ctx.botName} Help Guide*`,
            `${'═'.repeat(30)}`,
            ``,
            `Type *${p}help <category>* to see commands in a category.`,
            `Type *${p}help <command>* to get full details on any command.`,
            ``,
            `*Categories:*`,
            ``,
            lines.join('\n\n'),
            ``,
            `${'─'.repeat(30)}`,
            `_${Object.keys(HELP).length} commands documented_`,
          ].join('\n')
        }, { quoted: msg })
      }

      const cats = getCategories()
      const matchedCat = Object.keys(cats).find(
        c => c.toLowerCase().replace(/[^a-z]/g, '').startsWith(arg.replace(/[^a-z]/g, ''))
      )

      if (matchedCat) {
        const cmds = cats[matchedCat]
        const lines = cmds.map(cmd => {
          const info = HELP[cmd]
          return [
            `┌ *${p}${cmd}*`,
            `│ ${info.desc}`,
            `│ Usage: \`${info.usage}\``,
            info.flags ? `└ ${flagLabel(info.flags)}` : `└──────────`
          ].join('\n')
        })

        return sock.sendMessage(ctx.from, {
          text: [
            `*${matchedCat} Commands*`,
            `${'═'.repeat(30)}`,
            ``,
            lines.join('\n\n'),
            ``,
            `_Type ${p}help <command> for full details_`,
          ].join('\n')
        }, { quoted: msg })
      }

      const info = HELP[arg]
      if (info) {
        const lines = [
          `*${p}${arg}*`,
          `${'═'.repeat(30)}`,
          ``,
          `📋 *Description*`,
          `   ${info.desc}`,
          ``,
          `📌 *Usage*`,
          `   \`${info.usage}\``,
        ]

        if (info.example) lines.push(``, `💡 *Example*`, `   ${info.example}`)
        if (info.note)    lines.push(``, `⚠️  *Note*`, `   ${info.note}`)
        if (info.flags)   lines.push(``, `🔒 *Restrictions*`, `   ${flagLabel(info.flags)}`)
        lines.push(``, `📂 *Category:* ${info.category}`)

        return sock.sendMessage(ctx.from, { text: lines.join('\n') }, { quoted: msg })
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `❌ No help found for *"${arg}"*`,
          ``,
          `Try:`,
          `  ${p}help — see all categories`,
          `  ${p}help ai — AI commands`,
          `  ${p}help group — group commands`,
          `  ${p}help economy — economy commands`,
        ].join('\n')
      }, { quoted: msg })
    }
  }
]
