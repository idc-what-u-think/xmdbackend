// src/lib/api.js
// Complete wrapper for every Worker API call the bot needs.

const W   = () => process.env.WORKER_URL
const S   = () => process.env.BOT_SECRET
const SID = () => process.env.SESSION_ID || ''
const FK  = () => process.env.FIREKID_KEY || ''  // ← FK key fix

const call = async (path, opts = {}) => {
  try {
    const r = await fetch(`${W()}${path}`, {
      ...opts,
      headers: {
        'Content-Type':   'application/json',
        'X-Bot-Secret':   S(),
        'X-Session-Id':   SID(),
        'X-Firekid-Key':  FK(),   // ← sent on EVERY request now
        ...opts.headers,
      },
    })
    return await r.json()
  } catch (e) {
    console.error(`[API] ${path} failed:`, e.message)
    return { ok: false, error: e.message }
  }
}

export const api = {

  // ── Session verify / auth ─────────────────────────────
  verify: () =>
    call('/bot/session/verify'),

  // ── Session KV ───────────────────────────────────────
  sessionGet: (key) =>
    call(`/bot/session/get?key=${encodeURIComponent(key)}`),

  sessionSet: (key, value, ttl) =>
    call('/bot/session/set', {
      method: 'POST',
      body:   JSON.stringify({ key, value: String(value ?? ''), ttl }),
    }),

  sessionDelete: (key) =>
    call('/bot/session/delete', {
      method: 'POST',
      body:   JSON.stringify({ key }),
    }),

  sessionList: (prefix = '') =>
    call(`/bot/session/list?prefix=${encodeURIComponent(prefix)}`),

  sessionGetMany: (keys) =>
    call('/bot/session/getmany', {
      method: 'POST',
      body:   JSON.stringify({ keys }),
    }),

  // ── Plan / user ───────────────────────────────────────
  getPlan: (jid) =>
    call(`/bot/plan?jid=${encodeURIComponent(jid)}`),

  setPlan: (jid, plan) =>
    call('/bot/plan', {
      method: 'POST',
      body:   JSON.stringify({ jid, plan }),
    }),

  // ── Heartbeat ─────────────────────────────────────────
  heartbeat: (phone, groups, uptime) =>
    call('/bot/heartbeat', {
      method: 'POST',
      body:   JSON.stringify({ phone, groups, uptime, status: 'online' }),
    }),

  // ── API key rotation ──────────────────────────────────
  getKey: (service, jid = '') =>
    call(`/bot/key?service=${encodeURIComponent(service)}&jid=${encodeURIComponent(jid)}`),

  // ── Group settings ────────────────────────────────────
  getGroupSettings: (gid) =>
    call(`/bot/gsettings?gid=${encodeURIComponent(gid)}`),

  setGroupSettings: (gid, settings) =>
    call('/bot/gsettings', {
      method: 'POST',
      body:   JSON.stringify({ gid, settings }),
    }),

  // ── Blacklist / sleep / reactions ─────────────────────
  isBlacklisted: (accountId, phone) =>
    call(`/bot/blacklist?accountId=${encodeURIComponent(accountId)}&phone=${encodeURIComponent(phone)}`),

  getSleep: (accountId) =>
    call(`/bot/sleep?accountId=${encodeURIComponent(accountId)}`),

  getReactions: (accountId) =>
    call(`/bot/reactions?accountId=${encodeURIComponent(accountId)}`),

  // ── Warns ─────────────────────────────────────────────
  addWarn: (jid, groupId, reason, warnedBy) =>
    call('/bot/warn', {
      method: 'POST',
      body:   JSON.stringify({ jid, groupId, reason, warnedBy }),
    }),

  // ── Economy ───────────────────────────────────────────
  getEco: (jid) =>
    call(`/bot/eco?jid=${encodeURIComponent(jid)}`),

  setEco: (jid, field, value) =>
    call('/bot/eco', {
      method: 'POST',
      body:   JSON.stringify({ jid, field, value }),
    }),

  // FIX: was sending { jid, fields } but worker expected { jid, updates }
  setEcoBatch: (jid, updates) =>
    call('/bot/eco/batch', {
      method: 'POST',
      body:   JSON.stringify({ jid, updates }),
    }),

  getLeaderboard: () =>
    call('/bot/eco/leaderboard'),

  // ── Bot settings ─────────────────────────────────────
  getSetting: (key) =>
    call(`/bot/settings?key=${encodeURIComponent(key)}`),

  setSetting: (key, value) =>
    call('/bot/settings', {
      method: 'POST',
      body:   JSON.stringify({ key, value }),
    }),

  // ── Prefix ────────────────────────────────────────────
  getPrefix: (accountId) =>
    call(`/bot/prefix?accountId=${encodeURIComponent(accountId)}`),

  // ── Commands ──────────────────────────────────────────
  getCommands: () =>
    call('/bot/commands'),

  // ── Reports ───────────────────────────────────────────
  sendReport: (senderNumber, chatId, isGroup, groupName, message) =>
    call('/bot/report', {
      method: 'POST',
      body:   JSON.stringify({ senderNumber, chatId, isGroup, groupName, message }),
    }),

  // ── Cards ─────────────────────────────────────────────
  // Get cards owned by user (uses FK key server-side to resolve account)
  getCards: (category) =>
    call(`/bot/cards?category=${encodeURIComponent(category)}`),

  // Get active packs for a category
  getPacks: (category) =>
    call(`/bot/packs?category=${encodeURIComponent(category)}`),

  // Spin a pack — count = 1 or 10
  spinPack: (packId, count = 1) =>
    call('/bot/packs/spin', {
      method: 'POST',
      body:   JSON.stringify({ pack_id: packId, count }),
    }),

  // Get marketplace listings
  getMarket: (category) =>
    call(`/bot/market?category=${encodeURIComponent(category)}`),

  // Release a card to marketplace
  releaseCard: (userCardId) =>
    call('/bot/market/list', {
      method: 'POST',
      body:   JSON.stringify({ user_card_id: userCardId }),
    }),

  // Buy from marketplace
  buyCard: (listingId) =>
    call('/bot/market/buy', {
      method: 'POST',
      body:   JSON.stringify({ listing_id: listingId }),
    }),

  // Get user showcase cards — pass null accountId to get own showcase (uses FK key)
  getShowcase: (accountId, category = 'anime') => {
    if (accountId && accountId !== 'null') {
      return call(`/bot/cards/showcase?account_id=${encodeURIComponent(accountId)}&category=${encodeURIComponent(category)}`)
    }
    // Own showcase — resolved server-side via FK key
    return call(`/bot/cards/showcase-me?category=${encodeURIComponent(category)}`)
  },
}
