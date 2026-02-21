// commands/group/profile.js
// Commands: .setppgc | .getppgc

import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default [

  // ── .setppgc ──────────────────────────────────────────
  {
    command:  'setppgc',
    aliases:  ['setgcpp', 'setgrouppp', 'setgrouppic'],
    category: 'group',
    description: 'Set the group profile picture — reply to an image with this command',
    usage:    '.setppgc (reply to an image)',
    example:  'Reply to any image with .setppgc',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can change the group picture.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to set the group picture.'
        }, { quoted: msg })
      }

      // Accept image from: quoted image, OR direct image in same message
      const hasQuotedImage  = ctx.quoted && ctx.quotedType === 'imageMessage'
      const msgType         = Object.keys(msg.message || {})[0]
      const hasDirectImage  = msgType === 'imageMessage'

      if (!hasQuotedImage && !hasDirectImage) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to an image or send an image with the command.\n\n📌 *Usage:* Reply to an image with ${ctx.prefix}setppgc`
        }, { quoted: msg })
      }

      try {
        const targetMsg = hasQuotedImage ? ctx.quoted : msg

        const buffer = await downloadMediaMessage(
          targetMsg,
          'buffer',
          {},
          {
            logger: { info: () => {}, error: () => {}, warn: () => {} },
            reuploadRequest: sock.updateMediaMessage
          }
        )

        await sock.updateProfilePicture(ctx.from, buffer)

        await sock.sendMessage(ctx.from, {
          text: '✅ Group profile picture updated!'
        }, { quoted: msg })
      } catch (err) {
        if (err.message?.includes('not-authorized') || err.message?.includes('forbidden')) {
          await sock.sendMessage(ctx.from, {
            text: '❌ Failed: WhatsApp rejected the image. Make sure it is a valid JPG/PNG and not too large.'
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, {
            text: `❌ Failed to set picture: ${err.message}`
          }, { quoted: msg })
        }
      }
    }
  },

  // ── .getppgc ──────────────────────────────────────────
  {
    command:  'getppgc',
    aliases:  ['getgrouppp', 'getgrouppic', 'gcpic'],
    category: 'group',
    description: 'Get the group profile picture',
    usage:    '.getppgc',
    example:  '.getppgc',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      try {
        // 'preview' gives higher resolution than 'image'
        const url = await sock.profilePictureUrl(ctx.from, 'preview')

        await sock.sendMessage(ctx.from, {
          image:   { url },
          caption: `🖼️ *Group Profile Picture*\n👥 ${ctx.groupMeta?.subject || 'This Group'}`
        }, { quoted: msg })
      } catch (err) {
        // If no profile picture is set, WA throws an error
        if (err.message?.includes('404') || err.message?.includes('not-found') || err.message?.includes('item-not-found')) {
          await sock.sendMessage(ctx.from, {
            text: '❌ This group has no profile picture set.'
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, {
            text: `❌ Failed to get picture: ${err.message}`
          }, { quoted: msg })
        }
      }
    }
  }

]
