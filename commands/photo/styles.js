// commands/photo/styles.js
// Photo Style commands — converts user images to AI art styles
// Uses DeepAI (hardcoded key, 1 generation per user per 2 minutes)

import { downloadMediaMessage } from '@whiskeysockets/baileys'

const DEEPAI_KEY  = 'ce5182f2-4950-40cb-b3eb-fc7651014561'
const RATE_LIMIT  = 2 * 60 * 1000 // 2 minutes in ms
const userCooldowns = new Map()    // jid → timestamp of last generation

// ── Rate limit check ──────────────────────────────────────────────────────────
const checkRateLimit = (jid) => {
  const last = userCooldowns.get(jid) || 0
  const now  = Date.now()
  const wait = RATE_LIMIT - (now - last)
  if (wait > 0) {
    const secs = Math.ceil(wait / 1000)
    return `⏳ Please wait *${secs}s* before generating another image.`
  }
  return null
}

const setRateLimit = (jid) => userCooldowns.set(jid, Date.now())

// ── DeepAI call ────────────────────────────────────────────────────────────────
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

// ── Download user image ────────────────────────────────────────────────────────
const getImage = async (sock, msg, ctx) => {
  if (!ctx.quoted || !['imageMessage', 'videoMessage'].includes(ctx.quotedType)) {
    throw new Error(`Reply to an image with ${ctx.prefix}${ctx.command}`)
  }
  return downloadMediaMessage(ctx.quoted, 'buffer', {}, {
    logger: { info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {} },
    reuploadRequest: sock.updateMediaMessage,
  })
}

// ── Fetch result image ─────────────────────────────────────────────────────────
const fetchResult = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`Failed to download result: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// ── Generic style handler factory ──────────────────────────────────────────────
const makeStyle = (command, aliases, endpoint, label) => ({
  command,
  aliases,
  category: 'photo',
  handler: async (sock, msg, ctx) => {
    const limited = checkRateLimit(ctx.sender)
    if (limited) return sock.sendMessage(ctx.from, { text: limited }, { quoted: msg })

    let imgBuf
    try { imgBuf = await getImage(sock, msg, ctx) }
    catch (e) { return sock.sendMessage(ctx.from, { text: `❌ ${e.message}` }, { quoted: msg }) }

    const ph = await sock.sendMessage(ctx.from, { text: `🎨 Converting to *${label}* style...` }, { quoted: msg })
    setRateLimit(ctx.sender)

    try {
      const outputUrl = await callDeepAI(endpoint, imgBuf)
      const buf       = await fetchResult(outputUrl)
      await sock.sendMessage(ctx.from, { delete: ph.key })
      await sock.sendMessage(ctx.from, {
        image:   buf,
        caption: `🎨 *${label} Style*\n_Converted by Firekid XMD 🔥_`,
      }, { quoted: msg })
    } catch (e) {
      await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ ${e.message}` })
    }
  },
})

export default [
  makeStyle('toghibli',      ['ghibli', 'studioghibli'],             'toon-generator',   'Studio Ghibli'),
  makeStyle('toanime',       ['anime', 'animestyle'],                'toon-generator',   'Anime'),
  makeStyle('tocartoon',     ['cartoon', 'cartoonify'],              'toon-generator',   'Cartoon'),
  makeStyle('todisney',      ['disney', 'disneystyle'],              'toon-generator',   'Disney'),
  makeStyle('tocyberpunk',   ['cyberpunk', 'neon', 'cyber'],         'deepdream',        'Cyberpunk'),
  makeStyle('tocomic',       ['comic', 'comicbook'],                 'toon-generator',   'Comic Book'),
  makeStyle('togta',         ['gta', 'gtastyle', 'gtav'],            'deepdream',        'GTA V Art'),
  makeStyle('tomanga',       ['manga', 'mangastyle'],                'toon-generator',   'Manga'),
  makeStyle('topixar',       ['pixar', 'pixar3d'],                   'toon-generator',   'Pixar 3D'),
  makeStyle('tooilpainting', ['oilpainting', 'oilpaint'],            'old-style-filter', 'Oil Painting'),
  makeStyle('tosketch',      ['sketch', 'pencil', 'pencilsketch'],   'old-style-filter', 'Pencil Sketch'),
  makeStyle('tovintage',     ['vintage', 'retro', 'oldphoto'],       'old-style-filter', 'Vintage'),
  makeStyle('towatercolor',  ['watercolor', 'watercolour', 'paint'], 'old-style-filter', 'Watercolor'),
]
