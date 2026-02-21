// commands/newsletter/channel.js
// Commands: .createchannel | .deletechannel | .channelinfo | .newsearch
//           .followchannel | .unfollowchannel | .mutechannel | .unmutechannel
//
// All Baileys newsletter functions confirmed working in v6.7:
//   sock.newsletterCreate(name, description)
//   sock.newsletterDelete(jid)
//   sock.newsletterMetadata("invite"|"jid", key)
//   sock.newsletterSearch(query, { type, sort, limit })
//   sock.newsletterFollow(jid)
//   sock.newsletterUnfollow(jid)
//   sock.newsletterMute(jid)
//   sock.newsletterUnmute(jid)

// Extract invite code or JID from user input
// Input can be:
//   https://whatsapp.com/channel/0029VaXXXXXXXX  → invite code
//   0029VaXXXXXXXX                               → invite code
//   120363282083849178@newsletter                → JID
const parseChannelInput = (input) => {
  if (!input) return null

  const trimmed = input.trim()

  // Already a JID
  if (trimmed.endsWith('@newsletter')) {
    return { type: 'jid', value: trimmed }
  }

  // URL format
  const urlMatch = trimmed.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/)
  if (urlMatch) {
    return { type: 'invite', value: urlMatch[1] }
  }

  // Raw code (no URL, no @newsletter)
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return { type: 'invite', value: trimmed }
  }

  return null
}

const formatSubscribers = (n) => {
  if (!n && n !== 0) return 'Unknown'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

export default [

  // ── .createchannel ────────────────────────────────────
  {
    command:  'createchannel',
    aliases:  ['newchannel', 'makechannel', 'channelcreate'],
    category: 'newsletter',
    description: 'Create a new WhatsApp Channel (Newsletter)',
    usage:    '.createchannel <name> | <description>',
    example:  '.createchannel FireKid Updates | Daily bot news and updates',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can create channels.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📢 *Create a WhatsApp Channel*`,
            ``,
            `*Usage:* ${ctx.prefix}createchannel <name>`,
            `Or with description:`,
            `${ctx.prefix}createchannel <name> | <description>`,
            ``,
            `*Examples:*`,
            `${ctx.prefix}createchannel My News Channel`,
            `${ctx.prefix}createchannel FireKid Updates | Daily bot news`
          ].join('\n')
        }, { quoted: msg })
      }

      // Split by | to get name and optional description
      const parts       = ctx.query.split('|').map(s => s.trim())
      const name        = parts[0]
      const description = parts[1] || ''

      if (!name || name.length < 3) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Channel name must be at least 3 characters.`
        }, { quoted: msg })
      }

      if (name.length > 50) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Channel name must be 50 characters or less.`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: '📢 Creating your channel...'
      }, { quoted: msg })

      try {
        const channel = await sock.newsletterCreate(name, description)

        const jid  = channel?.id || 'Unknown'
        const link = jid !== 'Unknown'
          ? `https://whatsapp.com/channel/${jid.split('@')[0]}`
          : 'Link unavailable'

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [
            `✅ *Channel Created!*`,
            `${'─'.repeat(28)}`,
            ``,
            `📢 *Name:* ${name}`,
            description ? `📝 *Desc:* ${description}` : '',
            `🔗 *JID:* \`${jid}\``,
            ``,
            `🌐 *Share Link:*`,
            link,
            ``,
            `_Use ${ctx.prefix}channelpost <text> to post to your channel_`
          ].filter(Boolean).join('\n')
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Failed to create channel: ${err.message}`
        })
      }
    }
  },

  // ── .channelinfo ──────────────────────────────────────
  {
    command:  'channelinfo',
    aliases:  ['chaninfo', 'channelstats', 'newsletter'],
    category: 'newsletter',
    description: 'Get info and stats about a WhatsApp Channel',
    usage:    '.channelinfo <channel URL or JID>',
    example:  '.channelinfo https://whatsapp.com/channel/0029VaXXXXXX',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📊 *Channel Info*`,
            ``,
            `Get info about any WhatsApp Channel.`,
            ``,
            `*Usage:* ${ctx.prefix}channelinfo <link or JID>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}channelinfo https://whatsapp.com/channel/0029VaXXXX`
          ].join('\n')
        }, { quoted: msg })
      }

      const parsed = parseChannelInput(ctx.query)

      if (!parsed) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Invalid channel link or JID.`,
            ``,
            `Accepted formats:`,
            `• https://whatsapp.com/channel/XXXX`,
            `• 0029VaXXXXXXXX (invite code)`,
            `• 120363282083849178@newsletter (JID)`
          ].join('\n')
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: '🔍 Fetching channel info...'
      }, { quoted: msg })

      try {
        const meta = await sock.newsletterMetadata(parsed.type, parsed.value)

        if (!meta) {
          return sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ Channel not found or private.`
          })
        }

        const name        = meta.name        || meta.thread_metadata?.name || 'Unknown'
        const desc        = meta.description || meta.thread_metadata?.description || 'No description'
        const subs        = meta.subscribers  || meta.thread_metadata?.subscribers_count || 0
        const verified    = meta.verified     || meta.thread_metadata?.verification === 'VERIFIED'
        const jid         = meta.id           || parsed.value
        const inviteCode  = (jid.includes('@') ? jid.split('@')[0] : jid)
        const link        = `https://whatsapp.com/channel/${inviteCode}`

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [
            `📢 *Channel Info*`,
            `${'─'.repeat(28)}`,
            ``,
            `📌 *Name:*        ${name} ${verified ? '✅' : ''}`,
            `👥 *Subscribers:* ${formatSubscribers(subs)}`,
            ``,
            `📝 *Description:*`,
            desc.length > 200 ? desc.slice(0, 200) + '...' : desc,
            ``,
            `🔗 *Link:* ${link}`,
            `📋 *JID:*  \`${jid}@newsletter\``
          ].filter(Boolean).join('\n')
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Failed to get channel info: ${err.message}`
        })
      }
    }
  },

  // ── .newsearch ────────────────────────────────────────
  {
    command:  'newsearch',
    aliases:  ['searchchannel', 'findchannel', 'channelsearch'],
    category: 'newsletter',
    description: 'Search for public WhatsApp Channels',
    usage:    '.newsearch <query>',
    example:  '.newsearch Nigeria news',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a search query.\n📌 *Usage:* ${ctx.prefix}newsearch <query>`
        }, { quoted: msg })
      }

      const placeholder = await sock.sendMessage(ctx.from, {
        text: `🔍 Searching for channels: "${ctx.query}"...`
      }, { quoted: msg })

      try {
        const results = await sock.newsletterSearch(ctx.query, {
          type:  'LID',
          sort:  'POPULAR',
          limit: 10
        })

        if (!results || !results.length) {
          return sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `😔 No channels found for "*${ctx.query}*".\n\nTry a different search term.`
          })
        }

        const lines = results.slice(0, 8).map((r, i) => {
          const name     = r.name || r.thread_metadata?.name || 'Unknown'
          const subs     = r.subscribers || r.thread_metadata?.subscribers_count || 0
          const verified = r.verified || r.thread_metadata?.verification === 'VERIFIED'
          const jid      = r.id || ''
          const code     = jid.split('@')[0]
          const link     = code ? `https://whatsapp.com/channel/${code}` : ''

          return [
            `${i + 1}. *${name}* ${verified ? '✅' : ''}`,
            `   👥 ${formatSubscribers(subs)} subscribers`,
            link ? `   🔗 ${link}` : ''
          ].filter(Boolean).join('\n')
        })

        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: [
            `📢 *Channel Search: "${ctx.query}"*`,
            `${'─'.repeat(30)}`,
            ``,
            lines.join('\n\n'),
            ``,
            `_Showing ${Math.min(results.length, 8)} of ${results.length} results_`,
            `_Follow with ${ctx.prefix}followchannel <link>_`
          ].join('\n')
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Search failed: ${err.message}`
        })
      }
    }
  },

  // ── .followchannel ────────────────────────────────────
  {
    command:  'followchannel',
    aliases:  ['follow', 'subchannel', 'joinchannel'],
    category: 'newsletter',
    description: 'Follow a WhatsApp Channel',
    usage:    '.followchannel <channel URL or JID>',
    example:  '.followchannel https://whatsapp.com/channel/0029VaXXXX',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a channel link.\n📌 *Usage:* ${ctx.prefix}followchannel <link>`
        }, { quoted: msg })
      }

      const parsed = parseChannelInput(ctx.query)

      if (!parsed) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid channel link. Use a WhatsApp channel URL or JID.`
        }, { quoted: msg })
      }

      try {
        // Get metadata first to show channel name
        let name = 'the channel'
        try {
          const meta = await sock.newsletterMetadata(parsed.type, parsed.value)
          name = meta?.name || meta?.thread_metadata?.name || name
        } catch {}

        // Get the JID — if it's an invite, resolve to JID first
        let jid = parsed.value
        if (parsed.type === 'invite') {
          try {
            const meta = await sock.newsletterMetadata('invite', parsed.value)
            jid = meta?.id || parsed.value
          } catch {}
        }

        if (!jid.endsWith('@newsletter')) {
          jid = jid.includes('@') ? jid : `${jid}@newsletter`
        }

        await sock.newsletterFollow(jid)

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Channel Followed!*`,
            ``,
            `📢 Now following: *${name}*`,
            ``,
            `_Unfollow with ${ctx.prefix}unfollowchannel <link>_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to follow: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .unfollowchannel ──────────────────────────────────
  {
    command:  'unfollowchannel',
    aliases:  ['unfollow', 'unsubchannel', 'leavechannel'],
    category: 'newsletter',
    description: 'Unfollow a WhatsApp Channel',
    usage:    '.unfollowchannel <channel URL or JID>',
    example:  '.unfollowchannel https://whatsapp.com/channel/0029VaXXXX',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a channel link.\n📌 *Usage:* ${ctx.prefix}unfollowchannel <link>`
        }, { quoted: msg })
      }

      const parsed = parseChannelInput(ctx.query)
      if (!parsed) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid channel link.`
        }, { quoted: msg })
      }

      try {
        let name = 'the channel'
        let jid  = parsed.value

        try {
          const meta = await sock.newsletterMetadata(parsed.type, parsed.value)
          name = meta?.name || meta?.thread_metadata?.name || name
          if (meta?.id) jid = meta.id
        } catch {}

        if (!jid.endsWith('@newsletter')) {
          jid = jid.includes('@') ? jid : `${jid}@newsletter`
        }

        await sock.newsletterUnfollow(jid)

        await sock.sendMessage(ctx.from, {
          text: `✅ Unfollowed *${name}* successfully.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to unfollow: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .mutechannel ──────────────────────────────────────
  {
    command:  'mutechannel',
    aliases:  ['mute-channel', 'channelmute'],
    category: 'newsletter',
    description: 'Mute notifications from a WhatsApp Channel',
    usage:    '.mutechannel <channel URL or JID>',
    example:  '.mutechannel https://whatsapp.com/channel/0029VaXXXX',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a channel link.\n📌 *Usage:* ${ctx.prefix}mutechannel <link>`
        }, { quoted: msg })
      }

      const parsed = parseChannelInput(ctx.query)
      if (!parsed) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid channel link.`
        }, { quoted: msg })
      }

      try {
        let name = 'the channel'
        let jid  = parsed.value

        try {
          const meta = await sock.newsletterMetadata(parsed.type, parsed.value)
          name = meta?.name || meta?.thread_metadata?.name || name
          if (meta?.id) jid = meta.id
        } catch {}

        if (!jid.endsWith('@newsletter')) {
          jid = jid.includes('@') ? jid : `${jid}@newsletter`
        }

        await sock.newsletterMute(jid)

        await sock.sendMessage(ctx.from, {
          text: [
            `🔇 *Channel Muted*`,
            ``,
            `📢 *${name}* notifications are muted.`,
            ``,
            `_Unmute with ${ctx.prefix}unmutechannel <link>_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to mute: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .unmutechannel ────────────────────────────────────
  {
    command:  'unmutechannel',
    aliases:  ['unmute-channel', 'channelunmute'],
    category: 'newsletter',
    description: 'Unmute notifications from a WhatsApp Channel',
    usage:    '.unmutechannel <channel URL or JID>',
    example:  '.unmutechannel https://whatsapp.com/channel/0029VaXXXX',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a channel link.\n📌 *Usage:* ${ctx.prefix}unmutechannel <link>`
        }, { quoted: msg })
      }

      const parsed = parseChannelInput(ctx.query)
      if (!parsed) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid channel link.`
        }, { quoted: msg })
      }

      try {
        let name = 'the channel'
        let jid  = parsed.value

        try {
          const meta = await sock.newsletterMetadata(parsed.type, parsed.value)
          name = meta?.name || meta?.thread_metadata?.name || name
          if (meta?.id) jid = meta.id
        } catch {}

        if (!jid.endsWith('@newsletter')) {
          jid = jid.includes('@') ? jid : `${jid}@newsletter`
        }

        await sock.newsletterUnmute(jid)

        await sock.sendMessage(ctx.from, {
          text: `🔔 *${name}* notifications unmuted.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to unmute: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
