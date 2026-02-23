// src/lib/api.js
// Complete wrapper for every Worker API call the bot needs.

const W  = () => process.env.WORKER_URL
const S  = () => process.env.BOT_SECRET
const SID = () => process.env.SESSION_ID || ''

const call = async (path, opts = {}) => {
  try {
    const r = await fetch(`${W()}${path}`, {
      ...opts,
      headers: {
        'Content-Type':  'application/json',
        'X-Bot-Secret':  S(),
        'X-Session-Id':  SID(),
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
  // Returns { plan }
  getPlan: (jid) =>
    call(`/bot/plan?jid=${encodeURIComponent(jid)}`),

  // Sets plan in D1 (and KV cache) — fixes sudo/ban disconnect
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
  // Pass the sender's JID so the worker selects premium or global keys
  // Returns { key, remaining } or { ok: false, error: 'NO_KEY' }
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

  // Atomic multi-field update — use this for work/crime to avoid race conditions
  setEcoBatch: (jid, fields) =>
    call('/bot/eco/batch', {
      method: 'POST',
      body:   JSON.stringify({ jid, fields }),
    }),

  getLeaderboard: () =>
    call('/bot/eco/leaderboard'),

  // ── Bot settings (admin config like daily_config, work_config) ────────────
  getSetting: (key) =>
    call(`/bot/settings?key=${encodeURIComponent(key)}`),

  setSetting: (key, value) =>
    call('/bot/settings', {
      method: 'POST',
      body:   JSON.stringify({ key, value }),
    }),

  // ── Reports → your admin dashboard ────────────────────
  sendReport: (senderNumber, chatId, isGroup, groupName, message) =>
    call('/bot/report', {
      method: 'POST',
      body:   JSON.stringify({ senderNumber, chatId, isGroup, groupName, message }),
    }),

}
