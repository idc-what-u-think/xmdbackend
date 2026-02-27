// commands/anti/antidelete.js
// Shared state (read by antidelete_listener.js via relative import)

export const state = {
  p:        false,   // track personal DM deletions
  g:        false,   // track ALL group deletions
  specific: new Set(), // specific group/DM JIDs to track
  loaded:   false,
}

// Recent message cache — msgId → message snapshot
export const msgCache    = new Map()
export const MAX_CACHE   = 800

// Load persisted state from KV (called once on first command use)
const loadState = async (api) => {
  if (state.loaded) return
  try {
    const r = await api.sessionGet('antidelete:state')
    if (r?.value) {
      const saved = JSON.parse(r.value)
      state.p        = !!saved.p
      state.g        = !!saved.g
      state.specific = new Set(saved.specific || [])
    }
  } catch { /* KV miss — use defaults */ }
  state.loaded = true
}

const saveState = async (api) => {
  await api.sessionSet('antidelete:state', JSON.stringify({
    p:        state.p,
    g:        state.g,
    specific: [...state.specific],
  })).catch(() => {})
}

const selfJid = () =>
  (process.env.OWNER_NUMBER || '2348064610975') + '@s.whatsapp.net'

const statusLines = () => {
  const lines = []
  lines.push(state.p ? '✅ Personal DMs: *ON*'        : '❌ Personal DMs: *OFF*')
  lines.push(state.g ? '✅ All Groups: *ON*'           : '❌ All Groups: *OFF*')
  if (state.specific.size) {
    lines.push(`📌 Watching ${state.specific.size} specific chat(s)`)
  }
  return lines.join('\n')
}

export default [
  {
    command:  'antidelete',
    aliases:  ['antidel', 'ad'],
    category: 'anti',
    handler:  async (sock, msg, ctx, { api }) => {
      await loadState(api)
      const sub = ctx.args[0]?.toLowerCase()

      // ── antidelete p ─────────────────────────────────────────────────
      if (sub === 'p') {
        state.p = true
        await saveState(api)
        await sock.sendMessage(ctx.from, { delete: msg.key }).catch(() => {})
        return sock.sendMessage(selfJid(), {
          text: [
            `🛡️ *Antidelete — Personal DMs ON*`,
            ``,
            `I'll now forward any message deleted in your DMs here.`,
            ``,
            statusLines(),
          ].join('\n')
        })
      }

      // ── antidelete g ─────────────────────────────────────────────────
      if (sub === 'g') {
        state.g = true
        await saveState(api)
        await sock.sendMessage(ctx.from, { delete: msg.key }).catch(() => {})
        return sock.sendMessage(selfJid(), {
          text: [
            `🛡️ *Antidelete — All Groups ON*`,
            ``,
            `I'll now forward any deleted message from ALL groups here.`,
            ``,
            statusLines(),
          ].join('\n')
        })
      }

      // ── antidelete set (run inside a group or DM to watch only that chat) ─
      if (sub === 'set') {
        state.specific.add(ctx.from)
        await saveState(api)
        await sock.sendMessage(ctx.from, { delete: msg.key }).catch(() => {})
        const label = ctx.isGroup
          ? (ctx.groupMeta?.subject || ctx.from)
          : `+${ctx.senderNumber}`
        return sock.sendMessage(selfJid(), {
          text: [
            `📌 *Antidelete — Specific Chat Added*`,
            ``,
            `Now watching: *${label}*`,
            ``,
            statusLines(),
          ].join('\n')
        })
      }

      // ── antidelete off (stop watching the current chat/group) ──────────
      if (sub === 'off') {
        const removed = state.specific.delete(ctx.from)
        await saveState(api)
        await sock.sendMessage(ctx.from, { delete: msg.key }).catch(() => {})
        const label = ctx.isGroup
          ? (ctx.groupMeta?.subject || ctx.from)
          : `+${ctx.senderNumber}`
        return sock.sendMessage(selfJid(), {
          text: removed
            ? [
                `🔕 *Antidelete — Specific Chat Removed*`,
                ``,
                `Stopped watching: *${label}*`,
                ``,
                statusLines(),
              ].join('\n')
            : [
                `⚠️ *${label}* wasn't in your specific watch list.`,
                ``,
                statusLines(),
              ].join('\n')
        })
      }

      // ── antidelete all off ─────────────────────────────────────────────
      if (sub === 'all' && ctx.args[1]?.toLowerCase() === 'off') {
        state.p        = false
        state.g        = false
        state.specific.clear()
        await saveState(api)
        await sock.sendMessage(ctx.from, { delete: msg.key }).catch(() => {})
        return sock.sendMessage(selfJid(), {
          text: [
            `🔕 *Antidelete — Completely OFF*`,
            ``,
            `All antidelete tracking has been disabled.`,
          ].join('\n')
        })
      }

      // ── antidelete status / help ───────────────────────────────────────
      return sock.sendMessage(ctx.from, {
        text: [
          `🛡️ *Antidelete Help*`,
          `${'─'.repeat(28)}`,
          ``,
          `${ctx.prefix}antidelete p       — Forward deleted DMs to your self-chat`,
          `${ctx.prefix}antidelete g       — Forward deleted messages from ALL groups`,
          `${ctx.prefix}antidelete set     — Watch only this chat/group (run here)`,
          `${ctx.prefix}antidelete off     — Stop watching this specific chat`,
          `${ctx.prefix}antidelete all off — Turn off antidelete entirely`,
          ``,
          `*Current Status:*`,
          statusLines(),
        ].join('\n')
      }, { quoted: msg })
    }
  }
]
