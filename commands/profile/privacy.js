import { downloadMediaMessage } from '@whiskeysockets/baileys'

const PRIVACY_VALUES = {
  lastseen:     { options: ['all', 'contacts', 'contact_blacklist', 'none'],  method: 'updateLastSeenPrivacy' },
  online:       { options: ['all', 'match_last_seen'],                        method: 'updateOnlinePrivacy' },
  profilephoto: { options: ['all', 'contacts', 'contact_blacklist', 'none'],  method: 'updateProfilePicturePrivacy' },
  status:       { options: ['all', 'contacts', 'contact_blacklist', 'none'],  method: 'updateStatusPrivacy' },
  readreceipts: { options: ['all', 'none'],                                   method: 'updateReadReceiptsPrivacy' },
  groups:       { options: ['all', 'contacts', 'contact_blacklist'],          method: 'updateGroupsAddPrivacy' },
}

const PRIVACY_LABELS = {
  all:               '🌍 Everyone',
  contacts:          '👥 My Contacts',
  contact_blacklist: '⛔ Everyone Except...',
  none:              '🔒 Nobody',
  match_last_seen:   '🔗 Same as Last Seen',
}

const humanKey = {
  last_seen:         'Last Seen',
  online:            'Online Status',
  profile:           'Profile Photo',
  status:            'Status/Bio',
  read_receipts:     'Read Receipts (Blue Ticks)',
  groups_add:        'Who Can Add to Groups',
  disappearing_mode: 'Default Disappearing Messages',
}

export default [
  {
    command: 'jid',
    aliases: ['myjid', 'myid'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `🪪 *Your JID Info*`,
          `${'─'.repeat(28)}`,
          ``,
          `📱 *JID:*    \`${ctx.sender}\``,
          `🔢 *Number:* +${ctx.senderNumber}`,
          `👤 *Name:*   ${ctx.pushName || 'Not set'}`,
          ``,
          `_JID = WhatsApp internal identifier_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'gjid',
    aliases: ['groupjid', 'gid'],
    category: 'profile',
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, {
        text: [
          `🪪 *Group JID Info*`,
          `${'─'.repeat(28)}`,
          ``,
          `💬 *Group JID:* \`${ctx.from}\``,
          `📛 *Name:*      ${ctx.groupMeta?.subject || 'Unknown'}`,
          `👥 *Members:*   ${ctx.groupMeta?.participants?.length || 0}`,
          ``,
          `_Use this JID for bot integrations_`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'setmyname',
    aliases: ['changename', 'myname'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a name.\n📌 *Usage:* ${ctx.prefix}setmyname <name>`
        }, { quoted: msg })
      }

      if (ctx.query.length > 25) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Name too long. Max 25 characters.\n_Yours: ${ctx.query.length} chars_`
        }, { quoted: msg })
      }

      try {
        await sock.updateProfileName(ctx.query)
        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Display Name Updated!*`,
            ``,
            `📛 New name: *${ctx.query}*`,
            ``,
            `_Change may take a moment to reflect on WhatsApp_`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to update name: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'updatebio',
    aliases: ['setabout', 'mybio', 'changebio'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide bio text.\n📌 *Usage:* ${ctx.prefix}updatebio <text>\n_Max 139 characters_`
        }, { quoted: msg })
      }

      if (ctx.query.length > 139) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Bio too long. Max 139 chars.\n_Yours: ${ctx.query.length}_`
        }, { quoted: msg })
      }

      try {
        await sock.updateProfileStatus(ctx.query)
        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Bio Updated!*`,
            ``,
            `📝 New bio:`,
            `_"${ctx.query}"_`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to update bio: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  {
    command: 'getprivacy',
    aliases: ['myprivacy', 'privacysettings'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      const processing = await sock.sendMessage(ctx.from, { text: '🔍 Fetching your privacy settings...' }, { quoted: msg })

      try {
        const settings = await sock.fetchPrivacySettings(true)

        const fmt = (key) => {
          const val = settings[key]
          return val ? (PRIVACY_LABELS[val] || val) : '❓ Unknown'
        }

        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: [
            `🔒 *Your Privacy Settings*`,
            `${'─'.repeat(30)}`,
            ``,
            `👁️  Last Seen:         ${fmt('last_seen')}`,
            `🟢 Online Status:     ${fmt('online')}`,
            `🖼️  Profile Photo:     ${fmt('profile')}`,
            `📝 Status/Bio:        ${fmt('status')}`,
            `✅ Read Receipts:     ${fmt('read_receipts')}`,
            `👥 Add to Groups:     ${fmt('groups_add')}`,
            ``,
            `_Edit: ${ctx.prefix}setonline | ${ctx.prefix}setlastseen_`,
            `_${ctx.prefix}groupsprivacy | ${ctx.prefix}setreadreceipts_`
          ].join('\n')
        })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: `❌ Failed to fetch privacy settings: ${err.message}`
        })
      }
    }
  },

  {
    command: 'setonline',
    aliases: ['onlineprivacy', 'whocanseeonline'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      const choice = ctx.query?.toLowerCase().trim()
      const valid = ['all', 'match_last_seen']

      if (!choice || !valid.includes(choice)) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🟢 *Set Online Status Privacy*`,
            ``,
            `Who can see when you're online:`,
            ``,
            `  ${ctx.prefix}setonline all            — 🌍 Everyone`,
            `  ${ctx.prefix}setonline match_last_seen — 🔗 Same as Last Seen`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        await sock.updateOnlinePrivacy(choice)
        await sock.sendMessage(ctx.from, {
          text: `✅ *Online Privacy Updated!*\n\n🟢 Who sees you online: *${PRIVACY_LABELS[choice] || choice}*`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'setlastseen',
    aliases: ['lastseen', 'lastseenprivacy'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      const choice = ctx.query?.toLowerCase().trim()
      const valid = ['all', 'contacts', 'contact_blacklist', 'none']

      if (!choice || !valid.includes(choice)) {
        return sock.sendMessage(ctx.from, {
          text: [
            `👁️ *Set Last Seen Privacy*`,
            ``,
            `Who can see your last seen:`,
            ``,
            `  ${ctx.prefix}setlastseen all              — 🌍 Everyone`,
            `  ${ctx.prefix}setlastseen contacts          — 👥 My Contacts`,
            `  ${ctx.prefix}setlastseen contact_blacklist — ⛔ Everyone Except...`,
            `  ${ctx.prefix}setlastseen none              — 🔒 Nobody`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        await sock.updateLastSeenPrivacy(choice)
        await sock.sendMessage(ctx.from, {
          text: `✅ *Last Seen Updated!*\n\n👁️ Who sees your last seen: *${PRIVACY_LABELS[choice] || choice}*`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'groupsprivacy',
    aliases: ['groupadd', 'whocanadd'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      const choice = ctx.query?.toLowerCase().trim()
      const valid = ['all', 'contacts', 'contact_blacklist']

      if (!choice || !valid.includes(choice)) {
        return sock.sendMessage(ctx.from, {
          text: [
            `👥 *Set Who Can Add You to Groups*`,
            ``,
            `  ${ctx.prefix}groupsprivacy all              — 🌍 Everyone`,
            `  ${ctx.prefix}groupsprivacy contacts          — 👥 My Contacts`,
            `  ${ctx.prefix}groupsprivacy contact_blacklist — ⛔ Everyone Except...`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        await sock.updateGroupsAddPrivacy(choice)
        await sock.sendMessage(ctx.from, {
          text: `✅ *Groups Privacy Updated!*\n\n👥 Who can add you to groups: *${PRIVACY_LABELS[choice] || choice}*`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'setppall',
    aliases: ['profilepicgroups', 'ppall'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      const choice = ctx.query?.toLowerCase().trim()
      const valid = ['all', 'contacts', 'contact_blacklist', 'none']

      if (!choice || !valid.includes(choice)) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🖼️ *Set Profile Photo Privacy*`,
            ``,
            `Who can see your profile photo:`,
            ``,
            `  ${ctx.prefix}setppall all              — 🌍 Everyone`,
            `  ${ctx.prefix}setppall contacts          — 👥 My Contacts`,
            `  ${ctx.prefix}setppall contact_blacklist — ⛔ Everyone Except...`,
            `  ${ctx.prefix}setppall none              — 🔒 Nobody`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        await sock.updateProfilePicturePrivacy(choice)
        await sock.sendMessage(ctx.from, {
          text: `✅ *Profile Photo Privacy Updated!*\n\n🖼️ Who sees your photo: *${PRIVACY_LABELS[choice] || choice}*`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'setreadreceipts',
    aliases: ['readreceipts', 'blueticks'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      const choice = ctx.query?.toLowerCase().trim()
      const valid = ['all', 'none']

      if (!choice || !valid.includes(choice)) {
        return sock.sendMessage(ctx.from, {
          text: [
            `✅ *Set Read Receipts (Blue Ticks)*`,
            ``,
            `  ${ctx.prefix}setreadreceipts all  — 🌍 Everyone sees blue ticks`,
            `  ${ctx.prefix}setreadreceipts none — 🔒 Nobody sees blue ticks (but you also won't see theirs)`
          ].join('\n')
        }, { quoted: msg })
      }

      try {
        await sock.updateReadReceiptsPrivacy(choice)
        await sock.sendMessage(ctx.from, {
          text: `✅ *Read Receipts Updated!*\n\n✅ Blue ticks visible to: *${PRIVACY_LABELS[choice] || choice}*`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  {
    command: 'savecontact',
    aliases: ['vcard', 'contact'],
    category: 'profile',
    handler: async (sock, msg, ctx, { api }) => {
      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: [
            `📇 *Save Contact as vCard*`,
            ``,
            `Tag or reply to someone:`,
            `📌 *Usage:* ${ctx.prefix}savecontact @user`
          ].join('\n')
        }, { quoted: msg })
      }

      const num = targetJid.split('@')[0]

      let name = `+${num}`
      let ppUrl = null

      try {
        const status = await sock.fetchStatus(targetJid)
        if (status?.status) name = status.status.slice(0, 30) || `+${num}`
      } catch {}

      try {
        ppUrl = await sock.profilePictureUrl(targetJid, 'image')
      } catch {}

      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${ctx.pushName || `+${num}`}`,
        `TEL;type=CELL;type=VOICE;waid=${num}:+${num}`,
        'END:VCARD'
      ].join('\n')

      const sendOpts = { quoted: msg }

      if (ppUrl) {
        await sock.sendMessage(ctx.from, {
          image: { url: ppUrl },
          caption: `📇 Contact: *+${num}*`
        }, sendOpts)
      }

      await sock.sendMessage(ctx.from, {
        contacts: {
          displayName: ctx.pushName || `+${num}`,
          contacts: [{ vcard }]
        }
      }, sendOpts)
    }
  }
]
