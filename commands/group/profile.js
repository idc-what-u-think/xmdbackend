import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default [
  {
    command: 'setppgc',
    aliases: ['setgroupicon', 'setgrouppp'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const target = ctx.quoted || msg
      const type = ctx.quotedType || ctx.type
      if (!['imageMessage'].includes(type)) {
        return sock.sendMessage(ctx.from, { text: '❌ Reply to an image to set it as the group photo.' }, { quoted: msg })
      }
      const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger: { info: () => {}, warn: () => {}, error: () => {} } })
      await sock.updateProfilePicture(ctx.from, buffer)
      await sock.sendMessage(ctx.from, { text: '✅ Group photo updated.' }, { quoted: msg })
    }
  },
  {
    command: 'getppgc',
    aliases: ['grouppp', 'getgrouppp'],
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const url = await sock.profilePictureUrl(ctx.from, 'image').catch(() => null)
      if (!url) return sock.sendMessage(ctx.from, { text: '❌ This group has no photo set.' }, { quoted: msg })
      await sock.sendMessage(ctx.from, { image: { url }, caption: `📸 *Group Photo — ${ctx.groupMeta?.subject || ''}*` }, { quoted: msg })
    }
  }
]
