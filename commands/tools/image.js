import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { writeFile, unlink } from 'fs/promises'

const tmp = (ext) => join(tmpdir(), `fkd_${randomBytes(6).toString('hex')}.${ext}`)

const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

const watermark = (c, canvas) => {
  c.fillStyle = 'rgba(255,255,255,0.35)'
  c.font = '11px sans-serif'
  c.fillText('FireKid', 10, 18)
}

const loadCanvasModule = async () => {
  try {
    return await import('canvas')
  } catch {
    throw new Error('canvas package not installed. Run: npm install canvas')
  }
}

export default [
  {
    command: 'fakecall',
    aliases: ['fakeincomingcall', 'fakephonecall'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const number = ctx.query?.trim()
      if (!number) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a number or name.\n📌 *Usage:* ${ctx.prefix}fakecall +2348012345678`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '📱 Generating fake call screen...' }, { quoted: msg })
      const outPath = tmp('png')
      try {
        const { createCanvas } = await loadCanvasModule()
        const W = 400
        const H = 700
        const canvas = createCanvas(W, H)
        const c = canvas.getContext('2d')
        const grad = c.createLinearGradient(0, 0, 0, H)
        grad.addColorStop(0, '#1c1c1e')
        grad.addColorStop(1, '#2c2c2e')
        c.fillStyle = grad
        c.fillRect(0, 0, W, H)
        c.fillStyle = 'rgba(255,255,255,0.05)'
        c.beginPath()
        c.arc(W / 2, 250, 280, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = 'rgba(255,255,255,0.6)'
        c.font = '13px -apple-system, sans-serif'
        c.textAlign = 'center'
        c.fillText('incoming call', W / 2, 130)
        c.beginPath()
        c.arc(W / 2, 230, 70, 0, Math.PI * 2)
        c.fillStyle = '#3a3a3c'
        c.fill()
        c.fillStyle = '#8e8e93'
        c.font = 'bold 44px sans-serif'
        c.textAlign = 'center'
        const initials = number.replace(/\D/g, '').slice(-2) || '??'
        c.fillText(initials, W / 2, 245)
        c.fillStyle = '#ffffff'
        c.font = 'bold 28px -apple-system, sans-serif'
        c.textAlign = 'center'
        c.fillText(number, W / 2, 335)
        c.fillStyle = '#8e8e93'
        c.font = '16px -apple-system, sans-serif'
        c.fillText('mobile', W / 2, 365)
        const btns = [
          { x: W / 2 - 90, label: '📨', sub: 'message', color: '#3a3a3c' },
          { x: W / 2, label: '⏰', sub: 'remind me', color: '#3a3a3c' },
          { x: W / 2 + 90, label: '🔕', sub: 'voicemail', color: '#3a3a3c' }
        ]
        btns.forEach(btn => {
          c.beginPath()
          c.arc(btn.x, 450, 28, 0, Math.PI * 2)
          c.fillStyle = btn.color
          c.fill()
          c.fillStyle = '#ffffff'
          c.font = '20px sans-serif'
          c.textAlign = 'center'
          c.fillText(btn.label, btn.x, 458)
          c.fillStyle = '#8e8e93'
          c.font = '11px sans-serif'
          c.fillText(btn.sub, btn.x, 495)
        })
        c.beginPath()
        c.arc(W / 2 - 100, 600, 40, 0, Math.PI * 2)
        c.fillStyle = '#ff3b30'
        c.fill()
        c.fillStyle = '#ffffff'
        c.font = '24px sans-serif'
        c.textAlign = 'center'
        c.fillText('📵', W / 2 - 100, 610)
        c.beginPath()
        c.arc(W / 2 + 100, 600, 40, 0, Math.PI * 2)
        c.fillStyle = '#34c759'
        c.fill()
        c.fillStyle = '#ffffff'
        c.font = '24px sans-serif'
        c.fillText('📞', W / 2 + 100, 610)
        c.fillStyle = '#8e8e93'
        c.font = '11px sans-serif'
        c.textAlign = 'center'
        c.fillText('Decline', W / 2 - 100, 655)
        c.fillText('Accept', W / 2 + 100, 655)
        watermark(c, canvas)
        await writeFile(outPath, canvas.toBuffer('image/png'))
        const { readFile } = await import('fs/promises')
        const buf = await readFile(outPath)
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, { image: buf, caption: `📱 Incoming call from: ${number}` }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ ${err.message}` })
      } finally {
        await unlink(outPath).catch(() => {})
      }
    }
  },

  {
    command: 'fakefb',
    aliases: ['fakefacebook', 'fbpost'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query || !query.includes('|')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Use | to separate name and post text.`,
            `📌 *Usage:* ${ctx.prefix}fakefb <name> | <post text>`,
            ``,
            `*Example:* ${ctx.prefix}fakefb John Doe | Just had the best jollof rice ever! 🍚🔥`
          ].join('\n')
        }, { quoted: msg })
      }
      const pipeIdx = query.indexOf('|')
      const name    = query.slice(0, pipeIdx).trim()
      const text    = query.slice(pipeIdx + 1).trim()
      const placeholder = await sock.sendMessage(ctx.from, { text: '📘 Generating fake Facebook post...' }, { quoted: msg })
      const outPath = tmp('png')
      try {
        const { createCanvas } = await loadCanvasModule()
        const W = 540
        const H = 340
        const canvas = createCanvas(W, H)
        const c = canvas.getContext('2d')
        c.fillStyle = '#ffffff'
        c.fillRect(0, 0, W, H)
        c.fillStyle = '#1877f2'
        c.fillRect(0, 0, W, 44)
        c.fillStyle = '#ffffff'
        c.font = 'bold 22px sans-serif'
        c.textAlign = 'center'
        c.fillText('f', 22, 30)
        c.fillStyle = 'rgba(0,0,0,0.08)'
        c.fillRect(0, 44, W, 1)
        c.beginPath()
        c.arc(44, 90, 22, 0, Math.PI * 2)
        c.fillStyle = '#e4e6eb'
        c.fill()
        c.fillStyle = '#1877f2'
        c.font = 'bold 20px sans-serif'
        c.textAlign = 'center'
        c.fillText(name.charAt(0).toUpperCase(), 44, 97)
        c.fillStyle = '#050505'
        c.font = 'bold 15px -apple-system, sans-serif'
        c.textAlign = 'left'
        c.fillText(name, 76, 84)
        c.fillStyle = '#65676b'
        c.font = '13px sans-serif'
        const now = new Date()
        c.fillText(`${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')} · 🌍`, 76, 104)
        c.fillStyle = '#050505'
        c.font = '15px -apple-system, sans-serif'
        c.textAlign = 'left'
        const lines = wrapText(c, text, W - 40)
        lines.slice(0, 5).forEach((line, i) => {
          c.fillText(line, 20, 140 + i * 22)
        })
        c.fillStyle = 'rgba(0,0,0,0.1)'
        c.fillRect(20, 225, W - 40, 1)
        const reactions = ['👍 Like', '💬 Comment', '↗️ Share']
        reactions.forEach((r, i) => {
          const xPos = 20 + i * ((W - 40) / 3)
          c.fillStyle = '#65676b'
          c.font = 'bold 14px sans-serif'
          c.textAlign = 'left'
          c.fillText(r, xPos, 252)
        })
        c.fillStyle = 'rgba(0,0,0,0.1)'
        c.fillRect(20, 265, W - 40, 1)
        c.fillStyle = '#65676b'
        c.font = '13px sans-serif'
        c.textAlign = 'left'
        c.fillText(`${Math.floor(Math.random() * 500 + 10)} likes · ${Math.floor(Math.random() * 50)} comments`, 20, 290)
        watermark(c, canvas)
        await writeFile(outPath, canvas.toBuffer('image/png'))
        const { readFile } = await import('fs/promises')
        const buf = await readFile(outPath)
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, { image: buf, caption: `📘 Fake Facebook post by ${name}` }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ ${err.message}` })
      } finally {
        await unlink(outPath).catch(() => {})
      }
    }
  },

  {
    command: 'fakeinsta',
    aliases: ['fakeinstagram', 'igpost'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query || !query.includes('|')) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Use | to separate username and caption.`,
            `📌 *Usage:* ${ctx.prefix}fakeinsta <username> | <caption>`,
            ``,
            `*Example:* ${ctx.prefix}fakeinsta firekid_ng | Living my best life ✨🔥`
          ].join('\n')
        }, { quoted: msg })
      }
      const pipeIdx  = query.indexOf('|')
      const username = query.slice(0, pipeIdx).trim().replace(/^@/, '')
      const caption  = query.slice(pipeIdx + 1).trim()
      const placeholder = await sock.sendMessage(ctx.from, { text: '📸 Generating fake Instagram post...' }, { quoted: msg })
      const outPath = tmp('png')
      try {
        const { createCanvas } = await loadCanvasModule()
        const W = 480
        const H = 560
        const canvas = createCanvas(W, H)
        const c = canvas.getContext('2d')
        c.fillStyle = '#fafafa'
        c.fillRect(0, 0, W, H)
        c.fillStyle = 'rgba(0,0,0,0.09)'
        c.fillRect(0, 55, W, 1)
        c.beginPath()
        c.arc(26, 28, 16, 0, Math.PI * 2)
        c.fillStyle = '#e1306c'
        c.fill()
        c.fillStyle = '#ffffff'
        c.font = 'bold 14px sans-serif'
        c.textAlign = 'center'
        c.fillText(username.charAt(0).toUpperCase(), 26, 34)
        c.fillStyle = '#262626'
        c.font = 'bold 14px -apple-system, sans-serif'
        c.textAlign = 'left'
        c.fillText(username, 50, 23)
        c.fillStyle = '#8e8e8e'
        c.font = '13px sans-serif'
        c.fillText('Sponsored · 🌍', 50, 40)
        c.fillStyle = '#3897f0'
        c.font = 'bold 12px sans-serif'
        c.textAlign = 'right'
        c.fillText('Follow', W - 16, 32)
        c.fillStyle = '#262626'
        c.font = '18px sans-serif'
        c.textAlign = 'right'
        c.fillText('···', W - 16, 45)
        const imageAreaH = 320
        const imageAreaY = 56
        const grad = c.createLinearGradient(0, imageAreaY, 0, imageAreaY + imageAreaH)
        grad.addColorStop(0, '#2d2d2d')
        grad.addColorStop(1, '#1a1a1a')
        c.fillStyle = grad
        c.fillRect(0, imageAreaY, W, imageAreaH)
        c.fillStyle = 'rgba(255,255,255,0.08)'
        c.font = '56px sans-serif'
        c.textAlign = 'center'
        c.fillText('🖼️', W / 2, imageAreaY + imageAreaH / 2 + 20)
        const iconY = imageAreaY + imageAreaH + 14
        c.fillStyle = '#262626'
        c.font = '22px sans-serif'
        c.textAlign = 'left'
        c.fillText('♡  💬  ↗', 14, iconY)
        c.fillStyle = '#262626'
        c.font = '22px sans-serif'
        c.textAlign = 'right'
        c.fillText('🔖', W - 14, iconY)
        const likes = Math.floor(Math.random() * 10000 + 100)
        c.fillStyle = '#262626'
        c.font = 'bold 13px sans-serif'
        c.textAlign = 'left'
        c.fillText(`${likes.toLocaleString()} likes`, 14, iconY + 26)
        c.font = 'bold 14px sans-serif'
        c.fillText(username, 14, iconY + 48)
        c.font = '14px sans-serif'
        const captionLines = wrapText(c, caption, W - 80)
        captionLines.slice(0, 2).forEach((line, i) => c.fillText(line, 14 + (username.length * 8.5), iconY + 48 + i * 20))
        c.fillStyle = '#8e8e8e'
        c.font = '12px sans-serif'
        c.fillText(`${Math.floor(Math.random() * 3) + 1} HOURS AGO`, 14, H - 12)
        watermark(c, canvas)
        await writeFile(outPath, canvas.toBuffer('image/png'))
        const { readFile } = await import('fs/promises')
        const buf = await readFile(outPath)
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, { image: buf, caption: `📸 Fake Instagram post by @${username}` }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ ${err.message}` })
      } finally {
        await unlink(outPath).catch(() => {})
      }
    }
  },

  {
    command: 'opay',
    aliases: ['opayfake', 'opayreceipt', 'fakeopay'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const query = ctx.query?.trim()
      if (!query) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide all required fields separated by *|*`,
            ``,
            `📌 *Usage:*`,
            `${ctx.prefix}opay <amount> | <receiver name> | <receiver bank> | <receiver account> | <sender name> | <sender bank>`,
            ``,
            `*Example:*`,
            `${ctx.prefix}opay 1650 | JAYWONULTIMATE ENTERPRISES | MONIE POINT | 8253381685 | RAMAT OYINLOLA YAHAYA | OPay`
          ].join('\n')
        }, { quoted: msg })
      }

      const parts = query.split('|').map(s => s.trim())
      const amountRaw   = parts[0]?.replace(/[^0-9.]/g, '') || ''
      const receiverName  = parts[1] || 'RECIPIENT NAME'
      const receiverBank  = parts[2] || 'BANK NAME'
      const receiverAcct  = parts[3] || '0000000000'
      const senderName    = parts[4] || 'SENDER NAME'
      const senderBank    = parts[5] || 'OPay'
      const amount = parseFloat(amountRaw)

      if (isNaN(amount) || amount <= 0) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a valid amount.\n*Example:* ${ctx.prefix}opay 1650 | John Doe | GTBank | 0123456789 | Jane Doe | OPay`
        }, { quoted: msg })
      }

      // Mask sender account like OPay does: 916****564
      const senderPhone = (ctx.senderNumber || '08000000000').replace(/\D/g, '')
      const maskedSender = senderPhone.length >= 7
        ? senderPhone.slice(0, 3) + '****' + senderPhone.slice(-3)
        : senderPhone

      const placeholder = await sock.sendMessage(ctx.from, { text: '💚 Generating OPay receipt...' }, { quoted: msg })
      const outPath = tmp('png')

      try {
        const { createCanvas } = await loadCanvasModule()

        // ── Dimensions ────────────────────────────────────────────────
        const W  = 460
        const H  = 720
        const PAD = 22
        const BORDER = 10  // dotted border inset

        const canvas = createCanvas(W, H)
        const c = canvas.getContext('2d')

        // ── Background ────────────────────────────────────────────────
        c.fillStyle = '#ffffff'
        c.fillRect(0, 0, W, H)

        // ── Dotted border ─────────────────────────────────────────────
        c.strokeStyle = '#cccccc'
        c.lineWidth = 2
        c.setLineDash([6, 5])
        c.strokeRect(BORDER, BORDER, W - BORDER * 2, H - BORDER * 2)
        c.setLineDash([])

        // ── Firekid watermark top-left ────────────────────────────────
        c.fillStyle = 'rgba(0,0,0,0.13)'
        c.font = 'bold 13px sans-serif'
        c.textAlign = 'left'
        c.fillText('Firekid', BORDER + 8, BORDER + 18)

        // ── OPay logo area (top bar) ───────────────────────────────────
        // Green circle logo placeholder
        c.fillStyle = '#0ba259'
        c.beginPath()
        c.arc(PAD + 22, 58, 20, 0, Math.PI * 2)
        c.fill()
        // White dash inside circle (OPay logo "-O")
        c.fillStyle = '#ffffff'
        c.font = 'bold 20px sans-serif'
        c.textAlign = 'center'
        c.fillText('-O', PAD + 22, 65)

        // OPay text next to logo
        c.fillStyle = '#0ba259'
        c.font = 'bold 22px sans-serif'
        c.textAlign = 'left'
        c.fillText('OPay', PAD + 50, 65)

        // "Transaction Receipt" on the right
        c.fillStyle = '#333333'
        c.font = '14px sans-serif'
        c.textAlign = 'right'
        c.fillText('Transaction Receipt', W - PAD, 65)

        // ── Divider ────────────────────────────────────────────────────
        c.strokeStyle = '#e8e8e8'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(PAD, 90)
        c.lineTo(W - PAD, 90)
        c.stroke()

        // ── Amount ─────────────────────────────────────────────────────
        c.fillStyle = '#0ba259'
        c.font = 'bold 42px sans-serif'
        c.textAlign = 'center'
        c.fillText(`₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, W / 2, 148)

        // "Successful"
        c.fillStyle = '#111111'
        c.font = 'bold 20px sans-serif'
        c.textAlign = 'center'
        c.fillText('Successful', W / 2, 178)

        // Date/time — format like "Feb 17th, 2026 18:24:45"
        const now = new Date()
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const day = now.getDate()
        const suffix = day === 1||day===21||day===31 ? 'st' : day===2||day===22 ? 'nd' : day===3||day===23 ? 'rd' : 'th'
        const hh = String(now.getHours()).padStart(2,'0')
        const mm = String(now.getMinutes()).padStart(2,'0')
        const ss = String(now.getSeconds()).padStart(2,'0')
        const dateStr = `${months[now.getMonth()]} ${day}${suffix}, ${now.getFullYear()} ${hh}:${mm}:${ss}`

        c.fillStyle = '#888888'
        c.font = '13px sans-serif'
        c.textAlign = 'center'
        c.fillText(dateStr, W / 2, 200)

        // ── Divider ────────────────────────────────────────────────────
        c.strokeStyle = '#e8e8e8'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(PAD, 220)
        c.lineTo(W - PAD, 220)
        c.stroke()

        // ── Helper: draw a detail section ─────────────────────────────
        const drawSection = (title, nameLine, bankLine, yStart) => {
          // Section title
          c.fillStyle = '#444444'
          c.font = 'bold 13px sans-serif'
          c.textAlign = 'left'
          c.fillText(title, PAD, yStart)

          // Name (bold, uppercase)
          c.fillStyle = '#111111'
          c.font = 'bold 15px sans-serif'
          c.fillText(nameLine.toUpperCase(), PAD, yStart + 22)

          // Bank | Account (grey)
          c.fillStyle = '#666666'
          c.font = '13px sans-serif'
          c.fillText(bankLine, PAD, yStart + 40)

          return yStart + 60
        }

        // ── Recipient Details ──────────────────────────────────────────
        let y = drawSection(
          'Recipient Details',
          receiverName,
          `${receiverBank.toUpperCase()} | ${receiverAcct}`,
          238
        )

        // Divider
        c.strokeStyle = '#e8e8e8'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(PAD, y + 8)
        c.lineTo(W - PAD, y + 8)
        c.stroke()
        y += 28

        // ── Sender Details ─────────────────────────────────────────────
        y = drawSection(
          'Sender Details',
          senderName,
          `${senderBank.toUpperCase()} | ${maskedSender}`,
          y
        )

        // Divider
        c.strokeStyle = '#e8e8e8'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(PAD, y + 8)
        c.lineTo(W - PAD, y + 8)
        c.stroke()
        y += 28

        // ── Transaction No. & Session ID ───────────────────────────────
        const txnNo  = Array.from({ length: 24 }, () => Math.floor(Math.random() * 10)).join('')
        const sessId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 10)).join('')

        const drawRow = (label, value, rowY) => {
          c.fillStyle = '#888888'
          c.font = '12px sans-serif'
          c.textAlign = 'left'
          c.fillText(label, PAD, rowY)
          c.fillStyle = '#111111'
          c.font = '12px sans-serif'
          c.textAlign = 'right'
          c.fillText(value, W - PAD, rowY)
          c.strokeStyle = '#f0f0f0'
          c.lineWidth = 1
          c.beginPath()
          c.moveTo(PAD, rowY + 8)
          c.lineTo(W - PAD, rowY + 8)
          c.stroke()
          return rowY + 28
        }

        y = drawRow('Transaction No.', txnNo, y)
        y = drawRow('Session ID', sessId.slice(0, 22) + '...', y)

        // ── Footer tagline ─────────────────────────────────────────────
        c.fillStyle = '#aaaaaa'
        c.font = '10px sans-serif'
        c.textAlign = 'center'
        c.fillText('Enjoy a better life with OPay. Get free transfers, withdrawals, bill', W / 2, H - 42)
        c.fillText('payments, instant loans, and good annual interest on your savings.', W / 2, H - 28)
        c.fillText('OPay is licensed by the CBN and insured by the NDIC.', W / 2, H - 14)

        // ── Write & send ───────────────────────────────────────────────
        await writeFile(outPath, canvas.toBuffer('image/png'))
        const { readFile } = await import('fs/promises')
        const buf = await readFile(outPath)
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          image:   buf,
          caption: `💚 *OPay Transaction Receipt*\n₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} • ${dateStr}`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ ${err.message}` })
      } finally {
        await unlink(outPath).catch(() => {})
      }
    }
  },

  {
    command: 'iphone',
    aliases: ['iphoneframe', 'phoneframe', 'phonemockup'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.quoted || ctx.quotedType !== 'imageMessage') {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to an image with ${ctx.prefix}iphone\n_The image will be framed inside an iPhone mockup_`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: '📱 Applying iPhone frame...' }, { quoted: msg })
      const tmpIn  = tmp('jpg')
      const outPath = tmp('png')
      try {
        const { createCanvas, loadImage } = await loadCanvasModule()
        const imgBuf = await downloadMediaMessage(ctx.quoted, 'buffer', {}, {
          logger: console,
          reuploadRequest: sock.updateMediaMessage
        })
        await writeFile(tmpIn, imgBuf)
        const userImg = await loadImage(tmpIn)
        const phoneW = 300
        const phoneH = 600
        const screenX = 20
        const screenY = 70
        const screenW = phoneW - 40
        const screenH = phoneH - 140
        const canvas = createCanvas(phoneW, phoneH)
        const c = canvas.getContext('2d')
        const grad = c.createLinearGradient(0, 0, phoneW, phoneH)
        grad.addColorStop(0, '#2c2c2e')
        grad.addColorStop(1, '#1c1c1e')
        const r = 36
        c.beginPath()
        c.moveTo(r, 0)
        c.lineTo(phoneW - r, 0)
        c.quadraticCurveTo(phoneW, 0, phoneW, r)
        c.lineTo(phoneW, phoneH - r)
        c.quadraticCurveTo(phoneW, phoneH, phoneW - r, phoneH)
        c.lineTo(r, phoneH)
        c.quadraticCurveTo(0, phoneH, 0, phoneH - r)
        c.lineTo(0, r)
        c.quadraticCurveTo(0, 0, r, 0)
        c.closePath()
        c.fillStyle = grad
        c.fill()
        c.strokeStyle = '#48484a'
        c.lineWidth = 2
        c.stroke()
        const sr = 8
        c.save()
        c.beginPath()
        c.moveTo(screenX + sr, screenY)
        c.lineTo(screenX + screenW - sr, screenY)
        c.quadraticCurveTo(screenX + screenW, screenY, screenX + screenW, screenY + sr)
        c.lineTo(screenX + screenW, screenY + screenH - sr)
        c.quadraticCurveTo(screenX + screenW, screenY + screenH, screenX + screenW - sr, screenY + screenH)
        c.lineTo(screenX + sr, screenY + screenH)
        c.quadraticCurveTo(screenX, screenY + screenH, screenX, screenY + screenH - sr)
        c.lineTo(screenX, screenY + sr)
        c.quadraticCurveTo(screenX, screenY, screenX + sr, screenY)
        c.closePath()
        c.clip()
        const scale = Math.max(screenW / userImg.width, screenH / userImg.height)
        const dw = userImg.width  * scale
        const dh = userImg.height * scale
        const dx = screenX + (screenW - dw) / 2
        const dy = screenY + (screenH - dh) / 2
        c.drawImage(userImg, dx, dy, dw, dh)
        c.restore()
        c.beginPath()
        c.arc(phoneW / 2, 40, 6, 0, Math.PI * 2)
        c.fillStyle = '#3a3a3c'
        c.fill()
        c.beginPath()
        c.roundRect(phoneW / 2 - 20, 36, 40, 8, 4)
        c.fillStyle = '#3a3a3c'
        c.fill()
        c.beginPath()
        c.arc(phoneW / 2, phoneH - 32, 12, 0, Math.PI * 2)
        c.strokeStyle = '#636366'
        c.lineWidth = 2
        c.stroke()
        c.fillStyle = 'rgba(255,255,255,0.28)'
        c.font = '10px sans-serif'
        c.textAlign = 'left'
        c.fillText('FireKid', 8, phoneH - 8)
        await writeFile(outPath, canvas.toBuffer('image/png'))
        const { readFile } = await import('fs/promises')
        const buf = await readFile(outPath)
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, { image: buf, caption: '📱 iPhone Frame' }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { edit: placeholder.key, text: `❌ ${err.message}` })
      } finally {
        await unlink(tmpIn).catch(() => {})
        await unlink(outPath).catch(() => {})
      }
    }
  }
]
