// commands/group/invite.js
// Commands: .invite | .revoke (.resetlink) | .join | .gclink

export default [

  // ── .invite ───────────────────────────────────────────
  {
    command:  'invite',
    aliases:  ['invitelink', 'link'],
    category: 'group',
    description: 'Get the group invite link',
    usage:    '.invite',
    example:  '.invite',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can get the invite link.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to fetch the invite link.'
        }, { quoted: msg })
      }

      try {
        const code = await sock.groupInviteCode(ctx.from)
        const link = `https://chat.whatsapp.com/${code}`

        await sock.sendMessage(ctx.from, {
          text: `🔗 *Group Invite Link*\n\n${link}`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to get invite link: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .revoke (.resetlink) ─────────────────────────────
  {
    command:  'revoke',
    aliases:  ['resetlink'],
    category: 'group',
    description: 'Revoke the current invite link and generate a new one',
    usage:    '.revoke',
    example:  '.revoke',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can revoke the invite link.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to revoke the invite link.'
        }, { quoted: msg })
      }

      try {
        await sock.groupRevokeInvite(ctx.from)

        // Fetch the new code after revoke
        const newCode = await sock.groupInviteCode(ctx.from)
        const newLink = `https://chat.whatsapp.com/${newCode}`

        await sock.sendMessage(ctx.from, {
          text: `♻️ *Invite Link Revoked*\n\nThe old link is now invalid.\n\n🔗 *New Link:*\n${newLink}`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to revoke link: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .join ─────────────────────────────────────────────
  {
    command:  'join',
    aliases:  ['joingc'],
    category: 'group',
    description: 'Make the bot join a group via invite link (owner/sudo only)',
    usage:    '.join <invite link or code>',
    example:  '.join https://chat.whatsapp.com/ABCDEF123456',

    handler: async (sock, msg, args, ctx) => {
      // Only owner or sudo can make the bot join external groups
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can use this command.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide an invite link or code.\n\n📌 *Usage:* ${ctx.prefix}join https://chat.whatsapp.com/CODE`
        }, { quoted: msg })
      }

      // Extract just the code from a full URL or accept raw code
      let code = ctx.query.trim()
      const match = code.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
      if (match) code = match[1]

      if (!code || code.length < 10) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Invalid invite link or code.'
        }, { quoted: msg })
      }

      try {
        const groupId = await sock.groupAcceptInvite(code)

        await sock.sendMessage(ctx.from, {
          text: `✅ Successfully joined group!\n🆔 *Group ID:* ${groupId}`
        }, { quoted: msg })
      } catch (err) {
        // Common error codes from Baileys groupAcceptInvite
        if (err.message?.includes('not-authorized') || err.message?.includes('406')) {
          await sock.sendMessage(ctx.from, {
            text: '❌ This invite link has expired or is invalid.'
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, {
            text: `❌ Failed to join: ${err.message}`
          }, { quoted: msg })
        }
      }
    }
  },

  // ── .gclink ───────────────────────────────────────────
  {
    command:  'gclink',
    aliases:  ['sharelink', 'grouplink'],
    category: 'group',
    description: 'Share a nicely formatted group invite card',
    usage:    '.gclink',
    example:  '.gclink',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can share the invite link.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to fetch the invite link.'
        }, { quoted: msg })
      }

      try {
        const code = await sock.groupInviteCode(ctx.from)
        const link = `https://chat.whatsapp.com/${code}`

        const meta     = ctx.groupMeta
        const name     = meta?.subject || 'This Group'
        const desc     = meta?.desc    ? `\n📝 _${meta.desc}_` : ''
        const members  = meta?.size    || meta?.participants?.length || '?'

        const card = [
          `╔════════════════════╗`,
          `║  📣 *JOIN OUR GROUP*  ║`,
          `╚════════════════════╝`,
          ``,
          `👥 *${name}*`,
          desc,
          ``,
          `👤 Members: *${members}*`,
          ``,
          `🔗 *Invite Link:*`,
          link,
          ``,
          `_Click the link above to join!_`
        ].filter(l => l !== undefined).join('\n')

        await sock.sendMessage(ctx.from, {
          text: card
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to share link: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
