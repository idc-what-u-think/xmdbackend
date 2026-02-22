const W = 'https://firekidxmd-cloud.ahmedayomide1000.workers.dev'
const S = () => process.env.SESSION_ID

const call = async (path, opts = {}) => {
  try {
    const r = await fetch(`${W}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': S(),
        ...opts.headers,
      },
    })
    return await r.json()
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export const api = {
  verify: () =>
    call('/bot/session/verify'),

  heartbeat: (phone, groups, uptime) =>
    call('/bot/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ phone, groups, uptime }),
    }),

  getCommands: () =>
    call('/bot/commands'),

  reloadCommands: () =>
    call('/bot/commands/reload', { method: 'POST' }),

  // ── Session KV ────────────────────────────────────────
  sessionGet: (key) =>
    call(`/bot/session/get?key=${encodeURIComponent(key)}`),

  sessionSet: (key, value, ttl) =>
    call('/bot/session/set', {
      method: 'POST',
      body: JSON.stringify({ key, value, ttl }),
    }),

  sessionDelete: (key) =>
    call('/bot/session/delete', {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),

  sessionList: (prefix) =>
    call(`/bot/session/list?prefix=${encodeURIComponent(prefix || '')}`),

  // ── Keys ──────────────────────────────────────────────
  getKey: (service) =>
    call(`/bot/key?service=${service}`),

  // ── Plan ──────────────────────────────────────────────
  getPlan: (jid) =>
    call(`/bot/plan?jid=${encodeURIComponent(jid)}`),

  // ── Group settings ────────────────────────────────────
  getGroupSettings: (gid) =>
    call(`/bot/gsettings?gid=${encodeURIComponent(gid)}`),

  // FIXED: was missing — used by every anti/protection command
  setGroupSettings: (gid, settings) =>
    call('/bot/gsettings', {
      method: 'POST',
      body: JSON.stringify({ gid, settings }),
    }),

  // ── Warns ─────────────────────────────────────────────
  addWarn: (jid, groupId, reason, warnedBy) =>
    call('/bot/warn', {
      method: 'POST',
      body: JSON.stringify({ jid, groupId, reason, warnedBy }),
    }),

  // FIXED: was missing — used by .resetwarn
  resetWarns: (jid, groupId) =>
    call('/bot/warn/reset', {
      method: 'POST',
      body: JSON.stringify({ jid, groupId }),
    }),

  // FIXED: was missing — used by .warnlist
  getWarns: (jid, groupId) =>
    call(`/bot/warns?${jid ? `jid=${encodeURIComponent(jid)}&` : ''}gid=${encodeURIComponent(groupId)}`),

  // ── Economy ───────────────────────────────────────────
  getEco: (jid) =>
    call(`/bot/eco?jid=${encodeURIComponent(jid)}`),

  setEco: (jid, field, value) =>
    call('/bot/eco', {
      method: 'POST',
      body: JSON.stringify({ jid, field, value }),
    }),

  // FIXED: was missing — used by .leaderboard
  getLeaderboard: () =>
    call('/bot/eco/leaderboard'),
}
