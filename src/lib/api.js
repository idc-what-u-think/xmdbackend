// src/lib/api.js
// Clean wrapper for every Worker API call the bot needs to make.

const W = () => process.env.WORKER_URL
const S = () => process.env.BOT_SECRET
const B = () => process.env.BOT_ID || 'default'

const call = async (path, opts = {}) => {
  try {
    const r = await fetch(`${W()}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': S(),
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

  // ── Heartbeat ─────────────────────────────────────────
  heartbeat: (phone, groups, uptime) =>
    call('/bot/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ botId: B(), phone, groups, uptime, status: 'online' }),
    }),

  // ── Pair code ─────────────────────────────────────────
  sendPairCode: (code, phone) =>
    call('/bot/paircode', {
      method: 'POST',
      body: JSON.stringify({ botId: B(), code, phone }),
    }),

  // ── API key rotation ──────────────────────────────────
  // Returns { ok, key, remaining } or { ok: false, error: 'NO_KEY_AVAILABLE' }
  getKey: (service) =>
    call(`/keys/next?service=${service}&botId=${B()}`),

  // ── Group settings ────────────────────────────────────
  getGroupSettings: (gid) =>
    call(`/bot/gsettings?gid=${encodeURIComponent(gid)}`),

  // ── User plan ─────────────────────────────────────────
  getUserPlan: (jid) =>
    call(`/bot/plan?jid=${encodeURIComponent(jid)}`),

  // ── Warns ─────────────────────────────────────────────
  addWarn: (jid, groupId, reason, warnedBy) =>
    call('/bot/warn', {
      method: 'POST',
      body: JSON.stringify({ jid, groupId, reason, warnedBy }),
    }),

  // ── Economy ───────────────────────────────────────────
  getEco: (jid) =>
    call(`/bot/eco?jid=${encodeURIComponent(jid)}`),

  setEco: (jid, field, value) =>
    call('/bot/eco', {
      method: 'POST',
      body: JSON.stringify({ jid, field, value }),
    }),
}
