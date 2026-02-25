// commands/photo/effects.js
// Photo Effects + Remove Background + nanobanana
// DeepAI effects: hardcoded key, 1 per user per 2 minutes
// Canvas effects (mirror, polaroid, wanted, gun, drip, partner): unlimited, no key

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { tmpdir }               from 'os'
import { join }                 from 'path'
import { randomBytes }          from 'crypto'
import { writeFile, unlink }    from 'fs/promises'

const DEEPAI_KEY    = 'ce5182f2-4950-40cb-b3eb-fc7651014561'
const RATE_LIMIT    = 2 * 60 * 1000
const userCooldowns = new Map()

const tmp = (ext) => join(tmpdir(), `fkfx_${randomBytes(6).toString('hex')}.${ext}`)

const checkRateLimit = (jid) => {
  const last = userCooldowns.get(jid) || 0
  const wait = RATE_LIMIT - (Date.now() - last)
  if (wait > 0) return `⏳ Please wait *${Math.ceil(wait / 1000)}s* before generating another image.`
  return null
}
const setRateLimit = (jid) => userCooldowns.set(jid, Date.now())

const loadCanvas = async () => {
  try { return await import('canvas') }
  catch { throw new Error('canvas package not installed') }
}

const callDeepAI = async (endpoint, imageBuffer) => {
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' })
  const form = new FormData()
  form.append('image', blob, 'image.jpg')
  const res = await fetch(`https://api.deepai.org/api/${endpoint}`, {
    method:  'POST',
    headers: { 'api-key': DEEPAI_KEY },
    body:    form,
    signal:  AbortSignal.timeout(90_000),
  })
  if (!res.ok) throw new Error(`DeepAI returned HTTP ${res.status}`)
  const data = await res.json()
  if (data.err)         throw new Error(`DeepAI: ${data.err}`)
  if (!data.output_url) throw new Error('DeepAI returned no output image')
  return data.output_url
}

const getImage = async (sock, msg, ctx) => {
  if (!ctx.quoted || !['imageMessage', 'videoMessage'].includes(ctx.quotedType))
    throw new Error(`Reply to an image with ${ctx.prefix}${ctx.command}`)
  return downloadMediaMessage(ctx.quoted, 'buffer', {}, {
    logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {} },
    reuploadRequest: sock.updateMediaMessage,
  })
}

const fetchResult = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`Failed to download result: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ── Generic DeepAI effect (rate limited) ──────────────────────────────────────
const makeEffect = (command, aliases, endpoint, label) => ({
  command, aliases, category: 'photo',
  handler: async (sock, msg, ctx) => {
    const limited = checkRateLimit(ctx.sender)
    if (limited) return sock.sendMessage(ctx.from, { text: limited }, { quoted: msg })

    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }

    const ph = await sock.sendMessage(ctx.from, { text: `✨ Applying *${label}* effect...` }, { quoted: msg })
    setRateLimit(ctx.sender)

    try {
      const outputUrl = await callDeepAI(endpoint, imgBuf)
      const buf = await fetchResult(outputUrl)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, {
        image:   buf,
        caption: `✨ *${label} Effect*\n_Powered by Firekid XMD 🔥_`,
      }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    }
  },
})

// ── Mirror effect (canvas, no rate limit) ─────────────────────────────────────
const mirrorCmd = {
  command: 'mirror', aliases: ['flip', 'reflect', 'symmetry'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }
    const ph  = await sock.sendMessage(ctx.from, { text: `🪞 Applying mirror effect...` }, { quoted: msg })
    const out = tmp('png')
    try {
      const { createCanvas, loadImage } = await loadCanvas()
      const src = await loadImage(imgBuf)
      const W   = src.width * 2
      const H   = src.height
      const canvas = createCanvas(W, H)
      const c      = canvas.getContext('2d')
      c.drawImage(src, 0, 0, src.width, H)
      c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(src, 0, 0, src.width, H); c.restore()
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.font = '12px sans-serif'
      c.fillText('FireKid', 8, 18)
      await writeFile(out, canvas.toBuffer('image/png'))
      const buf = await (await import('fs/promises')).readFile(out)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, { image: buf, caption: `🪞 *Mirror Effect*\n_Firekid XMD 🔥_` }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    } finally { await unlink(out).catch(() => {}) }
  },
}

// ── Polaroid effect (canvas) ───────────────────────────────────────────────────
const polaroidCmd = {
  command: 'polaroid', aliases: ['polariod', 'photoframe', 'instax'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }
    const ph  = await sock.sendMessage(ctx.from, { text: `📷 Generating polaroid...` }, { quoted: msg })
    const out = tmp('png')
    try {
      const { createCanvas, loadImage } = await loadCanvas()
      const src    = await loadImage(imgBuf)
      const PAD    = 30, BOTTOM = 100
      const imgW   = Math.min(src.width, 600)
      const imgH   = Math.round(src.height * (imgW / src.width))
      const W      = imgW + PAD * 2
      const H      = imgH + PAD + BOTTOM
      const canvas = createCanvas(W, H)
      const c      = canvas.getContext('2d')
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 18; c.shadowOffsetX = 4; c.shadowOffsetY = 4
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.shadowColor = 'transparent'
      c.drawImage(src, PAD, PAD, imgW, imgH)
      const now = new Date()
      c.fillStyle = '#444'; c.font = `italic ${Math.round(BOTTOM * 0.38)}px Georgia, serif`
      c.textAlign = 'center'
      c.fillText(`${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`, W / 2, imgH + PAD + BOTTOM * 0.62)
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.font = '11px sans-serif'; c.textAlign = 'right'
      c.fillText('FireKid', W - 10, H - 8)
      await writeFile(out, canvas.toBuffer('image/png'))
      const buf = await (await import('fs/promises')).readFile(out)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, { image: buf, caption: `📷 *Polaroid Effect*\n_Firekid XMD 🔥_` }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    } finally { await unlink(out).catch(() => {}) }
  },
}

// ── Wanted poster (canvas) ─────────────────────────────────────────────────────
const wantedCmd = {
  command: 'wanted', aliases: ['wantedposter', 'cowboy', 'wildwest'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }
    const ph  = await sock.sendMessage(ctx.from, { text: `🤠 Generating wanted poster...` }, { quoted: msg })
    const out = tmp('png')
    try {
      const { createCanvas, loadImage } = await loadCanvas()
      const src    = await loadImage(imgBuf)
      const W = 480, H = 680
      const canvas = createCanvas(W, H)
      const c      = canvas.getContext('2d')
      const bg = c.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#e8c97e'); bg.addColorStop(0.5, '#d4a843'); bg.addColorStop(1, '#c0923a')
      c.fillStyle = bg; c.fillRect(0, 0, W, H)
      c.strokeStyle = '#5a3010'; c.lineWidth = 12; c.strokeRect(14, 14, W - 28, H - 28)
      c.strokeStyle = '#5a3010'; c.lineWidth = 3; c.strokeRect(22, 22, W - 44, H - 44)
      c.fillStyle = '#3b1a00'; c.font = 'bold 80px Georgia, serif'; c.textAlign = 'center'
      c.fillText('WANTED', W / 2, 100)
      c.font = 'bold 28px Georgia, serif'; c.fillText('DEAD OR ALIVE', W / 2, 136)
      const photoX = 64, photoY = 158, photoW = W - 128, photoH = 280
      c.fillStyle = '#111'; c.fillRect(photoX - 4, photoY - 4, photoW + 8, photoH + 8)
      c.drawImage(src, photoX, photoY, photoW, photoH)
      c.fillStyle = 'rgba(120,80,10,0.38)'; c.fillRect(photoX, photoY, photoW, photoH)
      const reward = `$${((Math.floor(Math.random() * 9) + 1) * 1000).toLocaleString()}`
      c.fillStyle = '#3b1a00'
      c.font = 'bold 30px Georgia, serif'; c.fillText('REWARD', W / 2, 476)
      c.font = 'bold 52px Georgia, serif'; c.fillText(reward, W / 2, 530)
      c.font = '20px Georgia, serif'; c.fillText('For crimes against humanity', W / 2, 570)
      c.font = '13px serif'; c.fillStyle = 'rgba(60,30,5,0.5)'; c.fillText('FireKid XMD', W / 2, H - 26)
      await writeFile(out, canvas.toBuffer('image/png'))
      const buf = await (await import('fs/promises')).readFile(out)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, { image: buf, caption: `🤠 *WANTED Poster*\n_Firekid XMD 🔥_` }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    } finally { await unlink(out).catch(() => {}) }
  },
}

// ── Drip effect (canvas) ───────────────────────────────────────────────────────
const dripCmd = {
  command: 'drip', aliases: ['paint', 'dripping', 'dripeffect'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }
    const ph  = await sock.sendMessage(ctx.from, { text: `🎨 Applying drip paint effect...` }, { quoted: msg })
    const out = tmp('png')
    try {
      const { createCanvas, loadImage } = await loadCanvas()
      const src    = await loadImage(imgBuf)
      const W      = src.width
      const H      = src.height + Math.round(src.height * 0.25)
      const canvas = createCanvas(W, H)
      const c      = canvas.getContext('2d')
      c.drawImage(src, 0, 0, src.width, src.height)
      const colors = ['#ff0040','#ff6600','#ffff00','#00ff88','#00aaff','#cc00ff']
      const dripCount = Math.floor(W / 28)
      for (let i = 0; i < dripCount; i++) {
        const x      = Math.random() * W
        const dripH  = Math.round(src.height * (0.05 + Math.random() * 0.22))
        const dripW  = 8 + Math.random() * 18
        const color  = colors[Math.floor(Math.random() * colors.length)]
        const startY = src.height - Math.floor(Math.random() * (src.height * 0.06))
        c.fillStyle = color
        c.fillRect(x - dripW / 2, startY, dripW, dripH)
        c.beginPath(); c.arc(x, startY + dripH, dripW / 2, 0, Math.PI * 2); c.fill()
      }
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '12px sans-serif'
      c.textAlign = 'left'; c.fillText('FireKid', 10, 22)
      await writeFile(out, canvas.toBuffer('image/png'))
      const buf = await (await import('fs/promises')).readFile(out)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, { image: buf, caption: `🎨 *Drip Paint Effect*\n_Firekid XMD 🔥_` }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    } finally { await unlink(out).catch(() => {}) }
  },
}

// ── Gun overlay (canvas) ───────────────────────────────────────────────────────
const gunCmd = {
  command: 'gun', aliases: ['gunshot', 'shooter', 'gangster'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }
    const ph  = await sock.sendMessage(ctx.from, { text: `🔫 Loading gun...` }, { quoted: msg })
    const out = tmp('png')
    try {
      const { createCanvas, loadImage } = await loadCanvas()
      const src    = await loadImage(imgBuf)
      const W = src.width, H = src.height
      const canvas = createCanvas(W, H); const c = canvas.getContext('2d')
      c.drawImage(src, 0, 0, W, H)
      const grad = c.createLinearGradient(0, H * 0.65, 0, H)
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.72)')
      c.fillStyle = grad; c.fillRect(0, 0, W, H)
      const gunSize = Math.round(Math.min(W, H) * 0.28)
      c.font = `${gunSize}px sans-serif`; c.textAlign = 'right'; c.fillText('🔫', W - 18, H - 18)
      const fontSize = Math.round(Math.min(W, H) * 0.07)
      c.font = `bold ${fontSize}px Impact, sans-serif`
      c.fillStyle = '#ff3030'; c.strokeStyle = '#000'; c.lineWidth = Math.ceil(fontSize * 0.08)
      c.textAlign = 'center'
      c.strokeText('🎯 YOU GOT SHOT', W / 2, H - Math.round(gunSize * 0.4))
      c.fillText('🎯 YOU GOT SHOT', W / 2, H - Math.round(gunSize * 0.4))
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.font = '12px sans-serif'
      c.textAlign = 'left'; c.fillText('FireKid', 10, 22)
      await writeFile(out, canvas.toBuffer('image/png'))
      const buf = await (await import('fs/promises')).readFile(out)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, { image: buf, caption: `🔫 *Gun Effect*\n_Firekid XMD 🔥_` }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    } finally { await unlink(out).catch(() => {}) }
  },
}

// ── Partner collage (canvas) ───────────────────────────────────────────────────
const partnerCmd = {
  command: 'partner', aliases: ['couple', 'love', 'duet'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }
    const ph  = await sock.sendMessage(ctx.from, { text: `💑 Creating couple collage...` }, { quoted: msg })
    const out = tmp('png')
    try {
      const { createCanvas, loadImage } = await loadCanvas()
      const src  = await loadImage(imgBuf)
      const SIDE = 320, PAD = 16, HEADER = 60
      const W    = SIDE * 2 + PAD * 3, H = SIDE + PAD * 2 + HEADER
      const canvas = createCanvas(W, H); const c = canvas.getContext('2d')
      const bg = c.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, '#ffe0ef'); bg.addColorStop(1, '#ffc2d4')
      c.fillStyle = bg; c.fillRect(0, 0, W, H)
      c.fillStyle = '#c0006a'; c.font = 'bold 30px sans-serif'
      c.textAlign = 'center'; c.fillText('💑 Perfect Match', W / 2, 42)
      c.save(); c.beginPath(); c.roundRect(PAD, PAD + HEADER, SIDE, SIDE, 14); c.clip()
      c.drawImage(src, PAD, PAD + HEADER, SIDE, SIDE); c.restore()
      c.font = '48px sans-serif'; c.textAlign = 'center'
      c.fillText('❤️', W / 2, PAD + HEADER + SIDE / 2 + 16)
      c.save(); c.beginPath(); c.roundRect(PAD * 2 + SIDE, PAD + HEADER, SIDE, SIDE, 14); c.clip()
      c.translate(PAD * 2 + SIDE + SIDE, PAD + HEADER); c.scale(-1, 1)
      c.drawImage(src, 0, 0, SIDE, SIDE); c.restore()
      c.fillStyle = 'rgba(180,0,80,0.4)'; c.font = '12px sans-serif'
      c.textAlign = 'right'; c.fillText('FireKid XMD', W - 10, H - 8)
      await writeFile(out, canvas.toBuffer('image/png'))
      const buf = await (await import('fs/promises')).readFile(out)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, { image: buf, caption: `💑 *Partner Effect*\n_Firekid XMD 🔥_` }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    } finally { await unlink(out).catch(() => {}) }
  },
}

// ── removebg (DeepAI, rate limited) ───────────────────────────────────────────
const removebgCmd = {
  command: 'removebg', aliases: ['rembg', 'bgremove', 'nobg', 'cutout'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    const limited = checkRateLimit(ctx.sender)
    if (limited) return sock.sendMessage(ctx.from, { text: limited }, { quoted: msg })

    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }

    const ph = await sock.sendMessage(ctx.from, { text: `✂️ Removing background...` }, { quoted: msg })
    setRateLimit(ctx.sender)
    try {
      const outputUrl = await callDeepAI('background-remover', imgBuf)
      const buf = await fetchResult(outputUrl)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, {
        image:   buf,
        caption: `✂️ *Background Removed*\n_Firekid XMD 🔥_`,
      }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    }
  },
}

// ── nanobanana — AI text-to-image (DeepAI, rate limited) ──────────────────────
const nanobananaCmd = {
  command: 'nanobanana', aliases: ['nano', 'aiart', 'generate'], category: 'photo',
  handler: async (sock, msg, ctx) => {
    const prompt = ctx.query?.trim()
    if (!prompt) return sock.sendMessage(ctx.from, {
      text: `❌ *Usage:* ${ctx.prefix}nanobanana <your prompt>\n\n*Example:* ${ctx.prefix}nanobanana cyberpunk warrior glowing neon`
    }, { quoted: msg })

    const limited = checkRateLimit(ctx.sender)
    if (limited) return sock.sendMessage(ctx.from, { text: limited }, { quoted: msg })

    const ph = await sock.sendMessage(ctx.from, { text: `🤖 Generating: _${prompt}_...` }, { quoted: msg })
    setRateLimit(ctx.sender)

    try {
      const form = new FormData()
      form.append('text', prompt)
      form.append('grid_size', '1')
      const res = await fetch('https://api.deepai.org/api/text2img', {
        method:  'POST',
        headers: { 'api-key': DEEPAI_KEY },
        body:    form,
        signal:  AbortSignal.timeout(90_000),
      })
      if (!res.ok) throw new Error(`DeepAI returned HTTP ${res.status}`)
      const data = await res.json()
      if (data.err) throw new Error(data.err)
      if (!data.output_url) throw new Error('No output returned')
      const imgRes = await fetch(data.output_url, { signal: AbortSignal.timeout(30_000) })
      if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`)
      const buf = Buffer.from(await imgRes.arrayBuffer())
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, {
        image:   buf,
        caption: `🤖 *AI Art:* _${prompt}_\n_Powered by Firekid XMD 🔥_`,
      }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    }
  },
}

export default [
  makeEffect('zombie',  ['zombieeffect', 'undead'],     'deepdream',      'Zombie Horror'),
  makeEffect('oldage',  ['age', 'aged', 'elderly'],     'deepdream',      'Old Age'),
  makeEffect('spirit',  ['ghost', 'aura', 'ethereal'],  'deepdream',      'Spirit Aura'),
  makeEffect('satan',   ['devil', 'dark', 'demon'],     'deepdream',      'Dark Demonic'),
  makeEffect('punk',    ['rockpunk', 'punkrock'],        'toon-generator', 'Punk Rock'),
  makeEffect('hijab',   ['hijabfilter'],                'toon-generator', 'Hijab Style'),
  makeEffect('joker',   ['jokereffect'],                'toon-generator', 'Joker'),
  makeEffect('clown',   ['clownmakeup'],                'toon-generator', 'Clown Makeup'),
  mirrorCmd,
  polaroidCmd,
  wantedCmd,
  gunCmd,
  dripCmd,
  partnerCmd,
  removebgCmd,
  nanobananaCmd,
]
