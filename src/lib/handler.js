import { buildCtx }                          from './ctx.js'
import { getCommand, getMessageListeners }   from './loader.js'

// ── In-memory stores (survive handler calls, reset on restart) ───────────────
// These are the source of truth. KV is the persistence layer.
// When mode or block list changes, the command handler updates memory FIRST
// then KV in the background. Handler reads memory — no KV latency.

let _botMode  = null          // null = not loaded yet; 'public' | 'private'
let _blockSet = null          // null = not loaded yet; Set of blocked JIDs
let _sudoList = null          // null = not loaded yet; Array of sudo JIDs

// Export setters so mode.js / access.js can update memory instantly
export const setModeMemory  = (mode)  => { _botMode = mode }
export const setBlockMemory = (set)   => { _blockSet = set }
export const addBlockMemory = (jid)   => { if (_blockSet) _blockSet.add(jid); else _blockSet = new Set([jid]) }
export const delBlockMemory = (jid)   => { _blockSet?.delete(jid) }

// Sudo list memory — kept in sync by mode.js add/remove operations
export const setSudoMemory = (list)  => { _sudoList = list }
export const addSudoMemory = (jid)   => {
  if (_sudoList) { if (!_sudoList.includes(jid)) _sudoList.push(jid) }
  else _sudoList = [jid]
}
export const delSudoMemory = (jid)   => {
  if (_sudoList) _sudoList = _sudoList.filter(j => j !== jid)
}

// Cache accountId lookup per session (avoids Worker round-trip every message)
let _accountId    = null
let _reactions    = []
let _reactionsTtl = 0
let _prefix       = null   // null = use env; set after first fetch

const getAccountId = async (api) => {
  if (_accountId) return _accountId
  const meta = await api.verify().catch(() => null)
  _accountId = meta?.session?.accountId ? String(meta.session.accountId) : null
  return _accountId
}

const getReactions = async (api, accountId) => {
  const now = Date.now()
  if (now < _reactionsTtl && _reactions.length >= 0) return _reactions
  const r   = await api.getReactions(accountId).catch(() => ({ rules: [] }))
  _reactions    = r.rules || []
  _reactionsTtl = now + 5 * 60 * 1000
  return _reactions
}

// Mode: memory first, KV fallback, 5-min re-sync from KV in background
let _modeSyncTs = 0
const getBotMode = async (api) => {
  // If memory is loaded, return immediately (no KV hit)
  if (_botMode !== null) {
    // Background re-sync every 5 mins to catch external changes
    const now = Date.now()
    if (now - _modeSyncTs > 5 * 60 * 1000) {
      _modeSyncTs = now
      api.sessionGet('bot:mode').then(r => {
        if (r?.value) _botMode = r.value
      }).catch(() => {})
    }
    return _botMode
  }
  // First load — fetch from KV
  try {
    const r = await api.sessionGet('bot:mode')
    _botMode = r?.value || 'public'
  } catch {
    _botMode = 'public'
  }
  _modeSyncTs = Date.now()
  return _botMode
}

// Block list: memory first, KV fallback, load once
const getBlockSet = async (api) => {
  if (_blockSet !== null) return _blockSet
  try {
    // Load both block_list (WA-blocked) and stop_list (bot-only ignored) into
    // the same in-memory set so the handler gate applies to both uniformly.
    const [bRes, sRes] = await Promise.all([
      api.sessionGet('block_list'),
      api.sessionGet('stop_list'),
    ])
    const blocked  = bRes?.value ? JSON.parse(bRes.value) : []
    const stopped  = sRes?.value ? JSON.parse(sRes.value) : []
    _blockSet = new Set([...blocked, ...stopped])
  } catch {
    _blockSet = new Set()
  }
  return _blockSet
}

// Sudo list: memory first, KV fallback, load once
// Used as a fallback check when ctx.isSudo is false in private mode
// (handles cases where LID resolution fails and plan lookup returns wrong JID)
const getSudoList = async (api) => {
  if (_sudoList !== null) return _sudoList
  try {
    const r = await api.sessionGet('sudo_list')
    _sudoList = r?.value ? JSON.parse(r.value) : []
  } catch {
    _sudoList = []
  }
  return _sudoList
}

const isBlocked = async (api, jid) => {
  const set = await getBlockSet(api)
  return set.has(jid)
}

// Check if a sender is in the sudo list by matching phone number or JID
// This is a fallback for when LID resolution fails and ctx.isSudo is incorrectly false
const isSudoViaList = async (api, ctx) => {
  const list = await getSudoList(api)
  if (!list.length) return false
  return list.some(j => {
    if (!j) return false
    // Match by exact JID
    if (j === ctx.senderStorageJid || j === ctx.sender) return true
    // Match by phone number digits (handles JID format differences)
    const listNum = j.split('@')[0].replace(/\D/g, '')
    return listNum.length > 4 && listNum === ctx.senderNumber
  })
}

const loadPrefix = async (api, accountId) => {
  if (_prefix !== null) return _prefix
  const r = await api.getPrefix(accountId).catch(() => ({ prefix: null }))
  _prefix = r.prefix || process.env.PREFIX || '.'
  return _prefix
}

// Call this on reconnect so caches are re-fetched fresh
export const resetHandlerCache = () => {
  _accountId    = null
  _reactions    = []
  _reactionsTtl = 0
  _botMode      = null   // force re-load from KV
  _blockSet     = null   // force re-load from KV
  _sudoList     = null   // force re-load from KV
  _modeSyncTs   = 0
  _prefix       = null
}

export const handleMessage = async (sock, msg, groupCache, planCache, api) => {
  if (!msg?.message) return

  const ctx = await buildCtx(sock, msg, groupCache, planCache, _prefix || undefined)

  // ── Account ID ───────────────────────────────────────────────────────────────
  const accountId = await getAccountId(api)

  // ── Plan lookup ──────────────────────────────────────────────────────────────
  const planCacheKey = ctx.senderStorageJid || ctx.sender
  if (!planCache.has(planCacheKey)) {
    const { plan } = await api.getPlan(planCacheKey).catch(() => ({ plan: 'free' }))
    const resolved = plan || 'free'
    planCache.set(planCacheKey, resolved)
    if (planCacheKey !== ctx.sender) planCache.set(ctx.sender, resolved)
    ctx.plan      = resolved
    ctx.isPremium = ['premium', 'sudo'].includes(resolved) || ctx.isOwner
    ctx.isSudo    = resolved === 'sudo' || ctx.isOwner
    ctx.isBanned  = resolved === 'banned'
  } else {
    const resolved = planCache.get(planCacheKey)
    ctx.plan      = resolved
    ctx.isPremium = ['premium', 'sudo'].includes(resolved) || ctx.isOwner
    ctx.isSudo    = resolved === 'sudo' || ctx.isOwner
    ctx.isBanned  = resolved === 'banned'
  }

  // D1 ban check (plan === 'banned')
  if (ctx.isBanned) return

  // ── Prefix load ──────────────────────────────────────────────────────────────
  if (accountId && _prefix === null) {
    const pref = await loadPrefix(api, accountId)
    ctx.prefix = pref
    if (ctx.text && !ctx.text.startsWith(pref)) {
      ctx.isCmd   = false
      ctx.command = ''
    }
  }

  // ── Gate checks (owner always bypasses everything) ──────────────────────────
  if (!ctx.fromMe && !ctx.isOwner) {
    // 1. Mode check — memory first, KV fallback
    const mode = await getBotMode(api)

    if (mode === 'private' && !ctx.isSudo) {
      // Fallback: check sudo_list KV directly
      // This handles cases where LID resolution failed during plan lookup,
      // causing the wrong JID to be queried and plan to come back as 'free'
      const sudoCheck = await isSudoViaList(api, ctx)
      if (!sudoCheck) return

      // LID resolution was the issue — fix ctx so commands work correctly
      ctx.isSudo    = true
      ctx.isPremium = true
      ctx.plan      = 'sudo'
    }

    // 2. Block check — memory first, KV fallback (separate from D1 ban)
    const blocked = await isBlocked(api, ctx.sender) ||
                    await isBlocked(api, ctx.senderStorageJid)
    if (blocked) return

    // 3. Blacklist + sleep (Worker-side checks)
    if (accountId) {
      const [blRes, sleepRes] = await Promise.all([
        api.isBlacklisted(accountId, ctx.senderNumber).catch(() => ({ blocked: false })),
        api.getSleep(accountId).catch(() => ({ sleeping: false })),
      ])
      if (blRes.blocked)     return
      if (sleepRes.sleeping) return
    }
  }

  // ── Reaction rules ───────────────────────────────────────────────────────────
  if (accountId && !ctx.fromMe) {
    const rules = await getReactions(api, accountId)
    for (const rule of rules) {
      let match = false
      if      (rule.trigger_type === 'any')   match = true
      else if (rule.trigger_type === 'text' && rule.trigger_value)
        match = ctx.text.toLowerCase().includes(rule.trigger_value)
      else if (rule.trigger_type === 'image')   match = ctx.type === 'imageMessage'
      else if (rule.trigger_type === 'video')   match = ctx.type === 'videoMessage'
      else if (rule.trigger_type === 'audio')   match = ctx.type === 'audioMessage'
      else if (rule.trigger_type === 'sticker') match = ctx.type === 'stickerMessage'
      if (match) {
        sock.sendMessage(ctx.from, { react: { text: rule.emoji, key: msg.key } }).catch(() => {})
        break
      }
    }
  }

  // ── Non-command listeners ────────────────────────────────────────────────────
  if (!ctx.isCmd) {
    const listeners = getMessageListeners()
    for (const listener of listeners) {
      try { await listener(sock, msg, ctx) } catch (e) {
        console.error('[Listener]', e.message)
      }
    }
    return
  }

  if (!ctx.command) return

  // ── Auto-React to Commands ──────────────────────────────────────────────────
  if (accountId && ctx.isCmd) {
    try {
      const autoReact = await api.sessionGet('autoreact')
      if (autoReact?.value && autoReact.value !== 'off') {
        const emoji = autoReact.value
        await sock.sendMessage(ctx.from, {
          react: { text: emoji, key: msg.key }
        }).catch(() => {})
      }
    } catch (e) {
      console.error('[AutoReact]', e.message)
    }
  }

  const cmd = getCommand(ctx.command)
  if (!cmd) return

  const reply = (text) => sock.sendMessage(ctx.from, { text }, { quoted: msg })

  if (cmd.ownerOnly   && !ctx.isOwner)                return reply('⛔ Owner only.')
  if (cmd.sudoOnly    && !ctx.isSudo)                  return reply('⛔ Sudo only.')
  if (cmd.premiumOnly && !ctx.isPremium)               return reply('⛔ Premium only. Upgrade at the dashboard.')
  if (cmd.groupOnly   && !ctx.isGroup)                 return reply('⛔ Groups only.')
  if (cmd.adminOnly   && !ctx.isAdmin && !ctx.isOwner) return reply('⛔ Admins only.')
  if (cmd.botAdmin    && !ctx.isBotAdmin)              return reply('⛔ Make me admin first.')

  try {
    await cmd.handler(sock, msg, ctx, { api })
  } catch (e) {
    console.error(`[${ctx.command}]`, e.message)
    await reply(`❌ Error: ${e.message}`)
  }
}
