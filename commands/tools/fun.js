// commands/tools/fun.js
// .meme   — generate meme using imgflip API (free account needed)
// .roastme — AI roasts yourself

// imgflip requires a free account: imgflip.com
// Set env: IMGFLIP_USERNAME and IMGFLIP_PASSWORD

const D = '─'.repeat(28)
const IMGFLIP_API = 'https://api.imgflip.com'

// Curated list of the most popular meme templates with their IDs
const POPULAR_MEMES = [
  { id: '181913649',  name: 'Drake Hotline Bling',        boxes: 2 },
  { id: '87743020',   name: 'Two Buttons',                boxes: 3 },
  { id: '112126428',  name: 'Distracted Boyfriend',       boxes: 3 },
  { id: '131087935',  name: 'Running Away Balloon',       boxes: 5 },
  { id: '217743513',  name: 'UNO Draw 25 Cards',          boxes: 2 },
  { id: '124822590',  name: 'Left Exit 12 Off Ramp',      boxes: 3 },
  { id: '93895088',   name: 'Expanding Brain',            boxes: 4 },
  { id: '61579',      name: 'One Does Not Simply',        boxes: 2 },
  { id: '101470',     name: 'Ancient Aliens',             boxes: 2 },
  { id: '438680',     name: 'Batman Slapping Robin',      boxes: 2 },
  { id: '135256802',  name: 'Epic Handshake',             boxes: 3 },
  { id: '119139145',  name: 'Blank Nut Button',           boxes: 2 },
  { id: '195515965',  name: 'Surprised Pikachu',          boxes: 2 },
  { id: '247375501',  name: 'Buff Doge vs. Cheems',       boxes: 4 },
  { id: '80707627',   name: 'Yo Dawg',                    boxes: 2 },
  { id: '14371066',   name: 'The Most Interesting Man',   boxes: 2 },
  { id: '28251713',   name: 'Oprah You Get A',            boxes: 2 },
  { id: '4087833',    name: 'Waiting Skeleton',           boxes: 2 },
  { id: '102156234',  name: 'Mocking Spongebob',          boxes: 2 },
  { id: '163573174',  name: 'Panik Kalm Panik',           boxes: 3 },
  { id: '129242436',  name: 'Change My Mind',             boxes: 2 },
  { id: '148909805',  name: 'Me and the boys',            boxes: 2 },
  { id: '61532',      name: 'The Rock Driving',           boxes: 2 },
  { id: '188390779',  name: 'Woman Yelling at Cat',       boxes: 2 },
  { id: '178591752',  name: 'Tuxedo Winnie The Pooh',     boxes: 2 },
  { id: '222403160',  name: 'Bernie I Am Once Again',     boxes: 2 },
  { id: '226297822',  name: 'Parrots Waiting',            boxes: 2 },
  { id: '61539',      name: 'Futurama Fry',               boxes: 2 },
  { id: '91538330',   name: 'X All the Y',                boxes: 2 },
  { id: '8072508',    name: 'Overly Attached Girlfriend', boxes: 2 },
]

export default [

  // ── .meme ────────────────────────────────────────────────────────────────────
  {
    command: 'meme',
    aliases: ['makememe', 'memeify'],
    category: 'tools',
    handler: async (sock, msg, ctx) => {
      const args = ctx.query?.trim() || ''
      const p    = ctx.prefix

      // ── .meme list ───────────────────────────────────────────────
      if (args.toLowerCase() === 'list') {
        const lines = POPULAR_MEMES.map((m, i) => `${String(i + 1).padStart(2, '0')}. *${m.name}* (${m.boxes} boxes)`)
        return sock.sendMessage(ctx.from, {
          text: [
            `🎭 *Popular Meme Templates*`,
            D,
            lines.join('\n'),
            ``,
            `*Usage:*`,
            `${p}meme <template name> | <text 1> | <text 2>`,
            ``,
            `*Example:*`,
            `${p}meme Drake | Working hard | Doing nothing`,
          ].join('\n')
        }, { quoted: msg })
      }

      // ── .meme <template> | <top> | <bottom> ──────────────────────
      const parts = args.split('|').map(s => s.trim())

      if (!args || parts.length < 2) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🎭 *Meme Generator*`,
            D,
            `*Usage:*`,
            `${p}meme <template> | <top text> | <bottom text>`,
            ``,
            `*Examples:*`,
            `${p}meme Drake | Studying | Scrolling TikTok`,
            `${p}meme One Does Not Simply | One does not simply | Code on the first try`,
            ``,
            `*See templates:*  ${p}meme list`,
            ``,
            `_Requires IMGFLIP_USERNAME and IMGFLIP_PASSWORD env variables_`,
            `_Free account at imgflip.com_`,
          ].join('\n')
        }, { quoted: msg })
      }

      const imgUser = process.env.IMGFLIP_USERNAME
      const imgPass = process.env.IMGFLIP_PASSWORD
      if (!imgUser || !imgPass) {
        return sock.sendMessage(ctx.from, {
          text: `❌ *IMGFLIP_USERNAME* and *IMGFLIP_PASSWORD* are not set.\n\nCreate a free account at https://imgflip.com and add them to your .env file.`
        }, { quoted: msg })
      }

      const [templateQuery, ...texts] = parts
      const ph = await sock.sendMessage(ctx.from, { text: `🎭 Generating meme...` }, { quoted: msg })

      try {
        // Find matching template from our curated list or fetch from imgflip
        let templateId = null
        const lowerQuery = templateQuery.toLowerCase()

        // Try local list first
        const localMatch = POPULAR_MEMES.find(m => m.name.toLowerCase().includes(lowerQuery))
        if (localMatch) {
          templateId = localMatch.id
        } else {
          // Search imgflip API
          const searchRes = await fetch(
            `${IMGFLIP_API}/search_memes?query=${encodeURIComponent(templateQuery)}`,
            { signal: AbortSignal.timeout(8_000) }
          )
          const searchData = await searchRes.json()
          const firstResult = searchData.data?.memes?.[0]
          if (!firstResult) throw new Error(`No meme template found for: "${templateQuery}".\n\nTry: ${p}meme list`)
          templateId = firstResult.id
        }

        // Build form body
        const body = new URLSearchParams({
          template_id: templateId,
          username: imgUser,
          password: imgPass,
        })
        texts.slice(0, 10).forEach((text, i) => body.append(`boxes[${i}][text]`, text))

        const captionRes = await fetch(`${IMGFLIP_API}/caption_image`, {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(10_000),
        })
        const captionData = await captionRes.json()

        if (!captionData.success) throw new Error(captionData.error_message || 'Imgflip API error')

        const memeUrl = captionData.data.url

        await sock.sendMessage(ctx.from, {
          image: { url: memeUrl },
          caption: `🎭 *${templateQuery}*\n\n_Generated by imgflip.com_`,
        }, { quoted: msg })
        await sock.sendMessage(ctx.from, { delete: ph.key })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Meme failed: ${e.message}` })
      }
    }
  },

  // ── .roastme ─────────────────────────────────────────────────────────────────
  {
    command: 'roastme',
    aliases: ['selfroast', 'roastmyself'],
    category: 'tools',
    handler: async (sock, msg, ctx) => {
      const name = ctx.pushName || ctx.senderNumber
      const ph = await sock.sendMessage(ctx.from, { text: `🔥 Cooking up a fresh roast for *${name}*...` }, { quoted: msg })

      try {
        const prompt = `You are a savage roast comedian. Give a brutally funny roast about someone named "${name}". 
Make it 3-4 lines maximum. Be creative, personal-feeling but general enough to apply to anyone. 
Mention their name at least once. No slurs or actually hurtful content — keep it playful and funny.
Respond ONLY with the roast, no extra commentary.`

        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 1.1,
          }),
          signal: AbortSignal.timeout(15_000),
        })

        const d = await r.json()
        const roast = d.choices?.[0]?.message?.content?.trim()
        if (!roast) throw new Error('No roast returned')

        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: `🔥 *Roasting ${name}...*\n\n${roast}\n\n_💀 You asked for it_`
        })
      } catch (e) {
        await sock.sendMessage(ctx.from, { edit: ph.key, text: `❌ Roast failed: ${e.message}` })
      }
    }
  },
]
