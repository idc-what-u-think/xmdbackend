import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

const tmp = (ext) => join(tmpdir(), `fkd_${randomBytes(6).toString('hex')}.${ext}`)

export default [
  {
    command: 'screenshot',
    aliases: ['ss', 'webshot'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const url = ctx.query?.trim()
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a valid URL.\n📌 *Usage:* ${ctx.prefix}screenshot https://example.com`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '📸 Taking screenshot...' }, { quoted: msg })
      try {
        const res = await fetch(`https://pageshot.site/v1/screenshot?url=${encodeURIComponent(url)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        if (!res.ok) throw new Error('primary failed')
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < 1000) throw new Error('empty response')
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          image: buf,
          caption: `📸 *Screenshot*\n🔗 ${url}`
        }, { quoted: msg })
      } catch {
        try {
          const res2 = await fetch(`https://image.thum.io/get/width/1280/${encodeURIComponent(url)}`)
          if (!res2.ok) throw new Error('fallback failed')
          const buf2 = Buffer.from(await res2.arrayBuffer())
          await sock.sendMessage(ctx.from, { delete: placeholder.key })
          await sock.sendMessage(ctx.from, {
            image: buf2,
            caption: `📸 *Screenshot*\n🔗 ${url}`
          }, { quoted: msg })
        } catch (err) {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ Screenshot failed: ${err.message}`
          })
        }
      }
    }
  },

  {
    command: 'qrcode',
    aliases: ['qr', 'generateqr'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const text = ctx.query?.trim()
      if (!text) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide text or URL.\n📌 *Usage:* ${ctx.prefix}qrcode https://example.com`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '⬛ Generating QR code...' }, { quoted: msg })
      try {
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=000000&margin=15&format=png`
        const res = await fetch(apiUrl)
        if (!res.ok) throw new Error('QR generation failed')
        const buf = Buffer.from(await res.arrayBuffer())
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          image: buf,
          caption: `⬛ *QR Code*\n📝 ${text.length > 60 ? text.slice(0, 60) + '...' : text}`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ QR failed: ${err.message}`
        })
      }
    }
  },

  {
    command: 'carbon',
    aliases: ['codeshot', 'codepic', 'codeimage'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const code = ctx.query?.trim() || ctx.quotedBody?.trim()
      if (!code) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide code to screenshot.\n📌 *Usage:* ${ctx.prefix}carbon <code>\n_Or reply to a code message_`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '💻 Generating code screenshot...' }, { quoted: msg })
      try {
        const res = await fetch('https://carbonara.solopov.dev/api/cook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            theme: 'dracula',
            backgroundColor: '#282a36',
            language: 'auto',
            fontSize: '14px',
            paddingVertical: '48px',
            paddingHorizontal: '32px'
          })
        })
        if (!res.ok) throw new Error(`Carbon API error: ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          image: buf,
          caption: '💻 *Code Screenshot*\n_Generated with Carbonara_'
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Carbon failed: ${err.message}`
        })
      }
    }
  },

  {
    command: 'fetch',
    aliases: ['curl', 'httpreq', 'request'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const url = ctx.query?.trim()
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a valid URL.\n📌 *Usage:* ${ctx.prefix}fetch https://api.example.com/data`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: `🌐 Fetching...` }, { quoted: msg })
      const outPath = tmp('bin')
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'FireKid-XMD/1.0',
            'Accept': '*/*'
          }
        })
        const contentType = res.headers.get('content-type') || 'application/octet-stream'
        const buf = Buffer.from(await res.arrayBuffer())
        await writeFile(outPath, buf)
        const { readFile } = await import('fs/promises')
        const fileBuf = await readFile(outPath)
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          document: fileBuf,
          fileName: 'response.bin',
          mimetype: contentType.split(';')[0].trim(),
          caption: [
            `🌐 *Fetch Result*`,
            `${'─'.repeat(28)}`,
            ``,
            `🔗 ${url}`,
            `✅ Status: ${res.status} ${res.statusText}`,
            `📄 Type: ${contentType.split(';')[0].trim()}`,
            `📦 Size: ${(buf.length / 1024).toFixed(2)} KB`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Fetch failed: ${err.message}`
        })
      } finally {
        await unlink(outPath).catch(() => {})
      }
    }
  },

  {
    command: 'bin',
    aliases: ['paste', 'pastebin', 'pasteit'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const text = ctx.query?.trim() || ctx.quotedBody?.trim()
      if (!text) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide text or reply to a message.\n📌 *Usage:* ${ctx.prefix}bin <text or code>`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '📋 Uploading to paste...' }, { quoted: msg })
      try {
        const res = await fetch('https://paste.rs/', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          body: text
        })
        if (!res.ok) throw new Error(`paste.rs: ${res.status}`)
        const pasteUrl = (await res.text()).trim()
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          text: [
            `📋 *Paste Created!*`,
            `${'─'.repeat(28)}`,
            ``,
            `🔗 ${pasteUrl}`,
            ``,
            `_Paste is public and permanent_`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        try {
          const res2 = await fetch('https://hastebin.com/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: text
          })
          if (!res2.ok) throw new Error('hastebin failed')
          const data = await res2.json()
          const pasteUrl = `https://hastebin.com/${data.key}`
          await sock.sendMessage(ctx.from, { delete: placeholder.key })
          await sock.sendMessage(ctx.from, {
            text: [`📋 *Paste Created!*`, `${'─'.repeat(28)}`, ``, `🔗 ${pasteUrl}`].join('\n')
          }, { quoted: msg })
        } catch {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ Paste failed: ${err.message}`
          })
        }
      }
    }
  },

  {
    command: 'emojimix',
    aliases: ['emojikitchen', 'mixemoji', 'combineemoji'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      if (ctx.args.length < 2) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide 2 emojis.\n📌 *Usage:* ${ctx.prefix}emojimix 😂 🔥`
        }, { quoted: msg })
      }
      const e1 = ctx.args[0]
      const e2 = ctx.args[1]
      const toHex = (emoji) => [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join('-')
      const hex1 = toHex(e1)
      const hex2 = toHex(e2)
      const dates = ['20230901', '20230301', '20220815', '20220406', '20211115', '20210521', '20210218', '20201001']
      const placeholder = await sock.sendMessage(ctx.from, { text: `🧬 Mixing ${e1} + ${e2}...` }, { quoted: msg })
      const tryUrl = async (u) => {
        const r = await fetch(u)
        if (!r.ok) return null
        const ct = r.headers.get('content-type') || ''
        if (!ct.includes('image')) return null
        return Buffer.from(await r.arrayBuffer())
      }
      for (const date of dates) {
        const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${hex1}/u${hex1}_u${hex2}.png`
        try {
          const buf = await tryUrl(url)
          if (buf && buf.length > 500) {
            await sock.sendMessage(ctx.from, { delete: placeholder.key })
            return sock.sendMessage(ctx.from, {
              image: buf,
              caption: `🧬 *Emoji Mix*\n${e1} + ${e2}`
            }, { quoted: msg })
          }
        } catch { continue }
      }
      for (const date of dates) {
        const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${hex2}/u${hex2}_u${hex1}.png`
        try {
          const buf = await tryUrl(url)
          if (buf && buf.length > 500) {
            await sock.sendMessage(ctx.from, { delete: placeholder.key })
            return sock.sendMessage(ctx.from, {
              image: buf,
              caption: `🧬 *Emoji Mix*\n${e1} + ${e2}`
            }, { quoted: msg })
          }
        } catch { continue }
      }
      await sock.sendMessage(ctx.from, {
        edit: placeholder.key,
        text: `❌ This emoji combo isn't supported by Google Emoji Kitchen.\n\nTry common emojis like 😂 🔥 💀 👀`
      })
    }
  }
]
