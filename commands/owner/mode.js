import { setModeMemory } from '../../src/lib/handler.js'

export default [
  {
    command: 'mode-public',
    aliases: ['public', 'publicmode'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      // Update memory FIRST — takes effect instantly for all incoming messages
      setModeMemory('public')
      // Persist to KV in background (survives restarts)
      api.sessionSet('bot:mode', 'public').catch(() => {})
      await sock.sendMessage(ctx.from, {
        text: [
          `🌍 *Bot Mode: PUBLIC*`, ``,
          `✅ Everyone can now use the bot.`,
          `All commands are accessible to all users.`, ``,
          `_Use ${ctx.prefix}mode-private to restrict access_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'mode-private',
    aliases: ['private', 'privatemode'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      // Update memory FIRST — takes effect instantly
      setModeMemory('private')
      // Persist to KV in background
      api.sessionSet('bot:mode', 'private').catch(() => {})
      await sock.sendMessage(ctx.from, {
        text: [
          `🔒 *Bot Mode: PRIVATE*`, ``,
          `✅ Bot is now restricted to owner only.`,
          `Other users will be ignored immediately.`, ``,
          `_Use ${ctx.prefix}mode-public to open access_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  // ── sudo ─────────────────────────────────────────────────────────────────
  {
    command: 'sudo',
    aliases: ['addsudo', 'addmod'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user to grant sudo.\n📌 *Usage:* ${ctx.prefix}sudo @user`
      }, { quoted: msg })

      if (targetJid === ctx.sender || targetJid === ctx.senderStorageJid)
        return sock.sendMessage(ctx.from, { text: '❌ You are already the owner — no need to add yourself as sudo.' }, { quoted: msg })

      const normalised = targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'
      const res = await api.setPlan(normalised, 'sudo')
      if (!res?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to grant sudo. Worker error: ${res?.error || 'unknown'}`
      }, { quoted: msg })

      const listRes = await api.sessionGet('sudo_list')
      const sudoList = listRes?.value ? JSON.parse(listRes.value) : []
      if (!sudoList.includes(normalised)) {
        sudoList.push(normalised)
        await api.sessionSet('sudo_list', JSON.stringify(sudoList))
      }

      await sock.sendMessage(ctx.from, {
        text: [
          `✅ *Sudo Access Granted*`, ``,
          `👤 @${targetJid.split('@')[0]} is now a sudo user.`, ``,
          `They can now use restricted commands.`,
          `_Sudo users: ${sudoList.length}_`
        ].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  // ── delsudo ───────────────────────────────────────────────────────────────
  {
    command: 'delsudo',
    aliases: ['removesudo', 'unmod', 'rmsudo'],
    category: 'owner',
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender
      if (!targetJid) return sock.sendMessage(ctx.from, {
        text: `❌ Tag or reply to the user to remove sudo.\n📌 *Usage:* ${ctx.prefix}delsudo @user`
      }, { quoted: msg })

      const normalised = targetJid.split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net'
      const res = await api.setPlan(normalised, 'free')
      if (!res?.ok) return sock.sendMessage(ctx.from, {
        text: `❌ Failed to remove sudo. Worker error: ${res?.error || 'unknown'}`
      }, { quoted: msg })

      const listRes = await api.sessionGet('sudo_list')
      const sudoList = listRes?.value ? JSON.parse(listRes.value) : []
      const updated = sudoList.filter(j => j !== normalised)
      await api.sessionSet('sudo_list', JSON.stringify(updated))

      await sock.sendMessage(ctx.from, {
        text: [
          `✅ *Sudo Access Removed*`, ``,
          `👤 @${targetJid.split('@')[0]} is no longer a sudo user.`,
          `_Sudo users remaining: ${updated.length}_`
        ].join('\n'),
        mentions: [targetJid]
      }, { quoted: msg })
    }
  },

  // ── listsudo ──────────────────────────────────────────────────────────────
  {
    command: 'listsudo',
    aliases: ['sudolist', 'mods', 'listmods'],
    category: 'owner',
    sudoOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res = await api.sessionGet('sudo_list')
      const sudoList = res?.value ? JSON.parse(res.value) : []

      if (!sudoList.length) return sock.sendMessage(ctx.from, {
        text: [`👥 *Sudo Users — Empty*`, ``, `No sudo users yet.`, `Add one with ${ctx.prefix}sudo @user`].join('\n')
      }, { quoted: msg })

      const lines = sudoList.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`)
      await sock.sendMessage(ctx.from, {
        text: [
          `👥 *Sudo Users (${sudoList.length})*`, `${'─'.repeat(26)}`, ``,
          `👑 Owner: @${ctx.ownerNumber} *(permanent)*`, ``,
          ...lines, ``,
          `_Remove with ${ctx.prefix}delsudo @user_`
        ].join('\n'),
        mentions: sudoList
      }, { quoted: msg })
    }
  },
]
