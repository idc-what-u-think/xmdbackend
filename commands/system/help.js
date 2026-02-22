// commands/system/help.js
// .help          → shows all categories
// .help <cat>    → shows commands in that category
// .help <cmd>    → shows full help for that command

const HELP = {
  // ── AI & CHAT ─────────────────────────────────────────────────────────────
  ai: {
    category: 'AI & Chat',
    desc: 'Chat with the bot using AI.',
    usage: '.ai <your message>',
    example: '.ai explain quantum physics simply',
    note: 'Uses Groq by default. Replies in the same language you write in.',
  },
  gemini: {
    category: 'AI & Chat',
    desc: 'Chat with Google Gemini AI.',
    usage: '.gemini <your message>',
    example: '.gemini write me a professional email',
  },
  gpt: {
    category: 'AI & Chat',
    desc: 'Chat with OpenAI GPT.',
    usage: '.gpt <your message>',
    example: '.gpt what is the meaning of life',
  },
  deepseek: {
    category: 'AI & Chat',
    desc: 'Chat with DeepSeek AI.',
    usage: '.deepseek <your message>',
    example: '.deepseek debug this code for me',
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
    desc: 'Tag all members silently — no visible @mentions in the message.',
    usage: '.hidetag <message>',
    example: '.hidetag Read the pinned message.',
    flags: 'adminOnly',
  },
  mute: {
    category: 'Group',
    desc: 'Mute the group so only admins can send messages.',
    usage: '.mute',
    flags: 'adminOnly, botAdmin',
  },
  unmute: {
    category: 'Group',
    desc: 'Unmute the group so all members can send messages.',
    usage: '.unmute',
    flags: 'adminOnly, botAdmin',
  },
  lock: {
    category: 'Group',
    desc: 'Lock group settings so only admins can edit group info.',
    usage: '.lock',
    flags: 'adminOnly, botAdmin',
  },
  unlock: {
    category: 'Group',
    desc: 'Unlock group settings so all members can edit group info.',
    usage: '.unlock',
    flags: 'adminOnly, botAdmin',
  },
  invite: {
    category: 'Group',
    desc: 'Get the group invite link.',
    usage: '.invite',
    flags: 'adminOnly',
  },
  revoke: {
    category: 'Group',
    desc: 'Reset the group invite link. The old link will stop working.',
    usage: '.revoke',
    flags: 'adminOnly, botAdmin',
  },
  kickall: {
    category: 'Group',
    desc: 'Remove all non-admin members from the group.',
    usage: '.kickall',
    note: 'This is irreversible. Owner only.',
    flags: 'ownerOnly, botAdmin',
  },
  groupname: {
    category: 'Group',
    desc: 'Change the group name.',
    usage: '.groupname <new name>',
    example: '.groupname Firekid Community',
    flags: 'adminOnly, botAdmin',
  },
  groupdesc: {
    category: 'Group',
    desc: 'Change the group description. Use "clear" to remove it.',
    usage: '.groupdesc <text> | .groupdesc clear',
    example: '.groupdesc Welcome to our group!',
    flags: 'adminOnly, botAdmin',
  },
  warn: {
    category: 'Group',
    desc: 'Warn a member. At 3 warnings they are automatically removed.',
    usage: '.warn @user [reason]',
    example: '.warn @john Spamming the group',
    flags: 'adminOnly',
  },
  resetwarn: {
    category: 'Group',
    desc: 'Clear all warnings from a member.',
    usage: '.resetwarn @user',
    example: '.resetwarn @john',
    flags: 'adminOnly',
  },
  warnlist: {
    category: 'Group',
    desc: 'View all warned members in the group, or check a specific member.',
    usage: '.warnlist [@user]',
    example: '.warnlist | .warnlist @john',
    flags: 'adminOnly',
  },
  poll: {
    category: 'Group',
    desc: 'Create a poll in the group.',
    usage: '.poll Question | Option1 | Option2 | ...',
    example: '.poll Best meal? | Rice | Yam | Bread',
    note: 'Separate question and options with | pipes. Max 12 options.',
    flags: 'groupOnly',
  },
  listmembers: {
    category: 'Group',
    desc: 'List all group members with their roles.',
    usage: '.listmembers',
    flags: 'groupOnly',
  },
  admins: {
    category: 'Group',
    desc: 'List all admins in the group.',
    usage: '.admins',
    flags: 'groupOnly',
  },

  // ── ANTI / PROTECTION ─────────────────────────────────────────────────────
  antilink: {
    category: 'Anti / Protect',
    desc: 'Control how the bot handles links sent in the group.',
    usage: '.antilink <mode>',
    example: '.antilink warn',
    note: 'Modes: off | delete | warn | kick',
    flags: 'adminOnly',
  },
  antibad: {
    category: 'Anti / Protect',
    desc: 'Toggle bad word filter. Works with your custom word list.',
    usage: '.antibad on/off',
    flags: 'adminOnly',
  },
  addbadword: {
    category: 'Anti / Protect',
    desc: 'Add words to the banned words list.',
    usage: '.addbadword <word> [word2] [word3]',
    example: '.addbadword spam idiot',
    flags: 'adminOnly',
  },
  delbadword: {
    category: 'Anti / Protect',
    desc: 'Remove words from the banned words list.',
    usage: '.delbadword <word>',
    example: '.delbadword spam',
    flags: 'adminOnly',
  },
  badwordlist: {
    category: 'Anti / Protect',
    desc: 'See all banned words in the group. Sent to your DM.',
    usage: '.badwordlist',
    flags: 'adminOnly',
  },
  antisticker: {
    category: 'Anti / Protect',
    desc: 'Block stickers from being sent in the group.',
    usage: '.antisticker on/off',
    flags: 'adminOnly',
  },
  antinsfw: {
    category: 'Anti / Protect',
    desc: 'Block NSFW (adult) content from the group.',
    usage: '.antinsfw on/off',
    flags: 'adminOnly',
  },
  antimedia: {
    category: 'Anti / Protect',
    desc: 'Block all media (images, videos, documents) in the group.',
    usage: '.antimedia on/off',
    flags: 'adminOnly',
  },
  anticall: {
    category: 'Anti / Protect',
    desc: 'Automatically reject calls to the bot number.',
    usage: '.anticall on/off',
    flags: 'ownerOnly',
  },
  antibug: {
    category: 'Anti / Protect',
    desc: 'Protect the group against crash/bug messages.',
    usage: '.antibug on/off',
    flags: 'adminOnly',
  },
  antidelete: {
    category: 'Anti / Protect',
    desc: 'Resend deleted messages in the group so nothing disappears.',
    usage: '.antidelete on/off',
    flags: 'adminOnly',
  },
  floodblock: {
    category: 'Anti / Protect',
    desc: 'Limit how fast members can send messages to prevent spam.',
    usage: '.floodblock on [limit] | .floodblock off',
    example: '.floodblock on 5',
    note: 'Limit = max messages per 5 seconds. Default is 5.',
    flags: 'adminOnly, botAdmin',
  },

  // ── AUTOMATION ────────────────────────────────────────────────────────────
  autoread: {
    category: 'Automation',
    desc: 'Bot automatically marks all messages as read.',
    usage: '.autoread on/off',
    flags: 'ownerOnly',
  },
  autotyping: {
    category: 'Automation',
    desc: 'Bot shows "typing..." indicator while processing.',
    usage: '.autotyping on/off',
    flags: 'ownerOnly',
  },
  autorecording: {
    category: 'Automation',
    desc: 'Bot shows "recording..." indicator on voice messages.',
    usage: '.autorecording on/off',
    flags: 'ownerOnly',
  },
  autoreact: {
    category: 'Automation',
    desc: 'Bot automatically reacts to messages with an emoji.',
    usage: '.autoreact on/off',
    flags: 'ownerOnly',
  },
  autoviewstatus: {
    category: 'Automation',
    desc: 'Bot automatically views everyone\'s WhatsApp status.',
    usage: '.autoviewstatus on/off',
    flags: 'ownerOnly',
  },
  autobio: {
    category: 'Automation',
    desc: 'Auto-rotates the bot\'s bio every hour with different messages.',
    usage: '.autobio on/off',
    flags: 'ownerOnly',
  },
  alwaysonline: {
    category: 'Automation',
    desc: 'Keep the bot\'s status showing as online at all times.',
    usage: '.alwaysonline on/off',
    flags: 'ownerOnly',
  },
  chatbot: {
    category: 'Automation',
    desc: 'Toggle AI auto-reply. When on, bot replies to every message.',
    usage: '.chatbot on/off',
    note: 'In groups, only admins can toggle. In DMs, only owner.',
  },

  // ── GROUP MODES ───────────────────────────────────────────────────────────
  nightmode: {
    category: 'Modes',
    desc: 'Auto-mutes the group at midnight and unmutes at 6am daily.',
    usage: '.nightmode on/off',
    flags: 'adminOnly, botAdmin',
  },
  slowmode: {
    category: 'Modes',
    desc: 'Set a cooldown between messages to reduce spam.',
    usage: '.slowmode <seconds> | .slowmode off',
    example: '.slowmode 30',
    note: 'Minimum 5s, maximum 3600s (1 hour).',
    flags: 'adminOnly, botAdmin',
  },
  lockdown: {
    category: 'Modes',
    desc: 'Instantly mute the entire group in an emergency. Run again to lift.',
    usage: '.lockdown',
    flags: 'adminOnly, botAdmin',
  },
  safezone: {
    category: 'Modes',
    desc: 'Exempt specific members from all anti-protection actions.',
    usage: '.safezone @user | .safezone remove @user | .safezone list',
    example: '.safezone @john',
    flags: 'adminOnly',
  },

  // ── STICKER ───────────────────────────────────────────────────────────────
  sticker: {
    category: 'Sticker',
    desc: 'Convert an image or video into a WhatsApp sticker.',
    usage: 'Send/reply to image or video + .sticker',
    note: 'Videos are capped at 6 seconds. Animated stickers supported.',
  },
  take: {
    category: 'Sticker',
    desc: 'Steal a sticker and re-save it with your own pack name.',
    usage: 'Reply to sticker + .take [pack name] | [author]',
    example: '.take Firekid Pack | Ahmed',
  },
  tgsticker: {
    category: 'Sticker',
    desc: 'Convert a sticker back into an image or GIF.',
    usage: 'Reply to sticker + .tgsticker',
  },

  // ── AUDIO FX ──────────────────────────────────────────────────────────────
  bass: {
    category: 'Audio FX',
    desc: 'Add heavy bass boost to an audio message.',
    usage: 'Reply to audio + .bass',
  },
  nightcore: {
    category: 'Audio FX',
    desc: 'Speed up audio to nightcore style.',
    usage: 'Reply to audio + .nightcore',
  },
  slow: {
    category: 'Audio FX',
    desc: 'Slow down an audio message.',
    usage: 'Reply to audio + .slow',
  },
  robot: {
    category: 'Audio FX',
    desc: 'Add a robotic voice effect to audio.',
    usage: 'Reply to audio + .robot',
  },
  reverse: {
    category: 'Audio FX',
    desc: 'Play an audio message backwards.',
    usage: 'Reply to audio + .reverse',
  },
  earrape: {
    category: 'Audio FX',
    desc: 'Make audio extremely loud and distorted.',
    usage: 'Reply to audio + .earrape',
  },
  squirrel: {
    category: 'Audio FX',
    desc: 'High-pitched chipmunk voice effect.',
    usage: 'Reply to audio + .squirrel',
  },
  deep: {
    category: 'Audio FX',
    desc: 'Lower the pitch for a deep, slow voice effect.',
    usage: 'Reply to audio + .deep',
  },
  shazam: {
    category: 'Audio FX',
    desc: 'Identify a song from an audio or video message.',
    usage: 'Reply to audio/video + .shazam',
    note: 'Works best with 10+ seconds of clear audio.',
  },

  // ── ECONOMY ───────────────────────────────────────────────────────────────
  daily: {
    category: 'Economy',
    desc: 'Claim your daily FireCoins reward. Resets every 24 hours.',
    usage: '.daily',
    note: 'Premium users get +50% bonus on top of the base reward.',
  },
  balance: {
    category: 'Economy',
    desc: 'Check your FireCoin balance or another member\'s balance.',
    usage: '.balance [@user]',
    example: '.balance | .balance @john',
  },
  work: {
    category: 'Economy',
    desc: 'Do a random job and earn FireCoins. Cooldown: 1 hour.',
    usage: '.work',
    note: 'Premium users get a +25% earnings bonus.',
  },
  crime: {
    category: 'Economy',
    desc: 'Attempt a risky crime for big rewards. 35% chance of getting caught and fined. Cooldown: 2 hours.',
    usage: '.crime',
  },
  gamble: {
    category: 'Economy',
    desc: 'Bet your FireCoins. 45% chance to double your bet.',
    usage: '.gamble <amount|all|half>',
    example: '.gamble 500 | .gamble all',
    note: 'Min: 10 coins. Max: 10,000 coins per bet.',
  },
  slots: {
    category: 'Economy',
    desc: 'Play the slot machine. Match 3 symbols to win big.',
    usage: '.slots <amount|all|half>',
    example: '.slots 200',
    note: '7️⃣ = 10x | 🔥 = 8x | 💎 = 6x | 🍒 = 4x',
  },
  give: {
    category: 'Economy',
    desc: 'Transfer FireCoins to another member.',
    usage: '.give @user <amount>',
    example: '.give @jane 1000',
  },
  leaderboard: {
    category: 'Economy',
    desc: 'View the top 10 richest FireCoin holders globally.',
    usage: '.leaderboard',
  },
  rank: {
    category: 'Economy',
    desc: 'Check your economy rank and title based on your balance.',
    usage: '.rank',
    note: 'Ranks: Newbie → Bronze → Silver → Gold → Diamond → FireKing',
  },
  upgrade: {
    category: 'Economy',
    desc: 'Get information on how to upgrade to premium.',
    usage: '.upgrade',
    note: 'Premium is purchased from the dashboard, not via command.',
  },

  // ── GAMES ─────────────────────────────────────────────────────────────────
  truth: {
    category: 'Games',
    desc: 'Get a random Truth question for the group.',
    usage: '.truth',
  },
  dare: {
    category: 'Games',
    desc: 'Get a random Dare challenge for the group.',
    usage: '.dare',
  },
  '8ball': {
    category: 'Games',
    desc: 'Ask the magic 8-ball a yes/no question.',
    usage: '.8ball <question>',
    example: '.8ball Will I be rich?',
  },
  rps: {
    category: 'Games',
    desc: 'Play Rock Paper Scissors against the bot.',
    usage: '.rps rock | .rps paper | .rps scissors',
  },
  dice: {
    category: 'Games',
    desc: 'Roll a dice. Default is 6-sided. You can set any number of sides.',
    usage: '.dice [sides]',
    example: '.dice | .dice 20',
  },
  coinflip: {
    category: 'Games',
    desc: 'Flip a coin — heads or tails.',
    usage: '.coinflip',
  },
  trivia: {
    category: 'Games',
    desc: 'Start a trivia question. Reply with your answer as a plain message. 60 seconds to answer.',
    usage: '.trivia | .trivia hint | .trivia skip',
    note: 'Game listener must be active for answers to register.',
  },
  riddle: {
    category: 'Games',
    desc: 'Get a riddle. Reply with your answer as a plain message. 90 seconds to answer.',
    usage: '.riddle | .riddle hint | .riddle skip',
  },
  guess: {
    category: 'Games',
    desc: 'Guess a number between 1-100. You have 7 attempts.',
    usage: '.guess start | .guess <number>',
    example: '.guess start → .guess 42',
  },
  wcg: {
    category: 'Games',
    desc: 'Word Chain Game — chain words by the last letter. Type plain words (no prefix) on your turn.',
    usage: '.wcg join | .wcg start | .wcg stop | .wcg skip | .wcg players',
    note: 'Min 2 players. 20 seconds per turn or you\'re eliminated.',
    flags: 'groupOnly',
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  gcannounce: {
    category: 'Social',
    desc: 'Post a formatted announcement in the group.',
    usage: '.gcannounce <message>',
    example: '.gcannounce Meeting at 8pm tonight!',
    flags: 'adminOnly, groupOnly',
  },
  gcstatus: {
    category: 'Social',
    desc: 'Post a WhatsApp status visible to group members. Reply to any message (text, image, video, audio) or just type text.',
    usage: 'Reply to message + .gcstatus [caption] | .gcstatus <text>',
    example: '.gcstatus Good morning everyone!',
    flags: 'adminOnly, groupOnly',
  },
  confession: {
    category: 'Social',
    desc: 'Post an anonymous confession to the group. Your identity is hidden.',
    usage: '.confession <your secret>',
    example: '.confession I actually enjoy doing homework',
    flags: 'groupOnly',
  },
  suggest: {
    category: 'Social',
    desc: 'Submit an anonymous suggestion for the group admins to review.',
    usage: '.suggest <your idea>',
    example: '.suggest We should have a movie night',
    flags: 'groupOnly',
  },
  suggestions: {
    category: 'Social',
    desc: 'View all pending anonymous suggestions from members.',
    usage: '.suggestions',
    flags: 'adminOnly, groupOnly',
  },
  spotlight: {
    category: 'Social',
    desc: 'Feature a random or specific group member in a spotlight post.',
    usage: '.spotlight [@user]',
    flags: 'groupOnly',
  },
  groupmood: {
    category: 'Social',
    desc: 'Get a fun AI-style mood reading for the current group vibe.',
    usage: '.groupmood',
    flags: 'groupOnly',
  },

  // ── PROFILE / PRIVACY ─────────────────────────────────────────────────────
  jid: {
    category: 'Profile',
    desc: 'Get your WhatsApp JID (internal ID used by the bot).',
    usage: '.jid',
  },
  getprivacy: {
    category: 'Profile',
    desc: 'View all your current WhatsApp privacy settings.',
    usage: '.getprivacy',
  },
  setlastseen: {
    category: 'Profile',
    desc: 'Control who can see your last seen.',
    usage: '.setlastseen <all|contacts|none>',
  },
  setonline: {
    category: 'Profile',
    desc: 'Control who can see when you\'re online.',
    usage: '.setonline <all|match_last_seen>',
  },
  setreadreceipts: {
    category: 'Profile',
    desc: 'Toggle blue read ticks on/off.',
    usage: '.setreadreceipts all | .setreadreceipts none',
  },

  // ── CONVERSATION ──────────────────────────────────────────────────────────
  unsend: {
    category: 'Conversation',
    desc: 'Delete the last message the bot sent in this chat.',
    usage: '.unsend',
  },
  recall: {
    category: 'Conversation',
    desc: 'Delete any quoted message. You can only delete your own messages unless you\'re an admin.',
    usage: 'Reply to message + .recall',
  },
  vanish: {
    category: 'Conversation',
    desc: 'Send a message that automatically disappears after 7 days.',
    usage: '.vanish <message>',
    example: '.vanish This message will self-destruct',
  },
  whisper: {
    category: 'Conversation',
    desc: 'Silently DM someone from the group with a message.',
    usage: '.whisper @user <message>',
    example: '.whisper @john Meet me outside',
    flags: 'groupOnly',
  },
  lastseen: {
    category: 'Conversation',
    desc: 'Check someone\'s last seen info and bio.',
    usage: '.lastseen @user | reply to someone',
    note: 'Only works if the user has last seen set to Everyone.',
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  ping: {
    category: 'System',
    desc: 'Check if the bot is online and measure response latency.',
    usage: '.ping',
  },
  alive: {
    category: 'System',
    desc: 'Full bot status — uptime, RAM, mode, date, time.',
    usage: '.alive',
  },
  uptime: {
    category: 'System',
    desc: 'How long the bot has been running since last restart.',
    usage: '.uptime',
  },
  ram: {
    category: 'System',
    desc: 'View current RAM usage for both the bot and the server.',
    usage: '.ram',
  },
  menu: {
    category: 'System',
    desc: 'Show the full command list with all categories.',
    usage: '.menu',
  },
  support: {
    category: 'System',
    desc: 'Get the link to the support group.',
    usage: '.support',
  },

  // ── OWNER ─────────────────────────────────────────────────────────────────
  broadcast: {
    category: 'Owner',
    desc: 'Send a message to every group the bot is in.',
    usage: '.broadcast <message>',
    flags: 'ownerOnly',
  },
  shutdown: {
    category: 'Owner',
    desc: 'Shut the bot down completely.',
    usage: '.shutdown',
    flags: 'ownerOnly',
  },
  restart: {
    category: 'Owner',
    desc: 'Restart the bot. It will reconnect automatically.',
    usage: '.restart',
    flags: 'ownerOnly',
  },
  sudo: {
    category: 'Owner',
    desc: 'Grant sudo (elevated) access to a user.',
    usage: '.sudo @user',
    flags: 'ownerOnly',
  },
  delsudo: {
    category: 'Owner',
    desc: 'Remove sudo access from a user.',
    usage: '.delsudo @user',
    flags: 'ownerOnly',
  },
  ban: {
    category: 'Owner',
    desc: 'Permanently ban a user from using the bot.',
    usage: '.ban @user [reason]',
    flags: 'ownerOnly',
  },
  unban: {
    category: 'Owner',
    desc: 'Lift a ban from a user.',
    usage: '.unban @user',
    flags: 'ownerOnly',
  },
  block: {
    category: 'Owner',
    desc: 'Block a user from using the bot temporarily.',
    usage: '.block @user',
    flags: 'sudoOnly',
  },
  setpp: {
    category: 'Owner',
    desc: 'Change the bot\'s profile picture. Reply to or send an image.',
    usage: 'Reply to image + .setpp',
    flags: 'sudoOnly',
  },
  setbio: {
    category: 'Owner',
    desc: 'Change the bot\'s bio/status text. Max 139 characters.',
    usage: '.setbio <text>',
    flags: 'sudoOnly',
  },
  addapikey: {
    category: 'Owner',
    desc: 'Add an API key for AI services (groq, gemini, openai, deepseek).',
    usage: '.addapikey <type> <key>',
    example: '.addapikey groq gsk_xxxx',
    flags: 'sudoOnly',
  },
  'mode-public': {
    category: 'Owner',
    desc: 'Set bot to public mode — everyone can use all commands.',
    usage: '.mode-public',
    flags: 'ownerOnly',
  },
  'mode-private': {
    category: 'Owner',
    desc: 'Set bot to private mode — only the owner can use commands.',
    usage: '.mode-private',
    flags: 'ownerOnly',
  },
}

// Build category list from HELP entries
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
    command: 'helpme',
    aliases: ['guide', 'howto'],
    category: 'system',
    handler: async (sock, msg, ctx, { api }) => {
      const p   = ctx.prefix
      const arg = ctx.args[0]?.toLowerCase()

      // ── No argument: show all categories ────────────────
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
            `Type *${p}help <category>* to see commands in that category.`,
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

      // ── Argument matches a category ──────────────────────
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

      // ── Argument matches a specific command ──────────────
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

        if (info.example) {
          lines.push(``, `💡 *Example*`, `   ${info.example}`)
        }

        if (info.note) {
          lines.push(``, `⚠️  *Note*`, `   ${info.note}`)
        }

        if (info.flags) {
          lines.push(``, `🔒 *Restrictions*`, `   ${flagLabel(info.flags)}`)
        }

        lines.push(``, `📂 *Category:* ${info.category}`)

        return sock.sendMessage(ctx.from, {
          text: lines.join('\n')
        }, { quoted: msg })
      }

      // ── No match found ───────────────────────────────────
      await sock.sendMessage(ctx.from, {
        text: [
          `❌ No help found for *"${arg}"*`,
          ``,
          `Try:`,
          `  ${p}help — see all categories`,
          `  ${p}help group — group commands`,
          `  ${p}help anti — protection commands`,
          `  ${p}help economy — economy commands`,
        ].join('\n')
      }, { quoted: msg })
    }
  }
]
