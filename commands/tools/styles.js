// commands/tools/styles.js
// Photo style conversion commands using Pollinations.ai (free, no auth)
// Flow: download user photo → upload to 0x0.st → pollinations image-to-image → send result
// All 28 styles from the Firekid XMD command list

import { downloadContentFromMessage } from '@whiskeysockets/baileys'

// ── Helpers ──────────────────────────────────────────────────────────────────

const toBuffer = async (mediaMsg, type) => {
  const stream = await downloadContentFromMessage(mediaMsg, type)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

// Upload buffer to 0x0.st — free, no auth, returns direct URL
const uploadToTemp = async (buf, ext = 'jpg') => {
  const { FormData, Blob } = globalThis
  const form = new FormData()
  form.append('file', new Blob([buf], { type: ext === 'jpg' ? 'image/jpeg' : 'image/png' }), `photo.${ext}`)
  const res = await fetch('https://0x0.st', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': 'FirekidXMD/1.0' },
  })
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`)
  const url = (await res.text()).trim()
  if (!url.startsWith('http')) throw new Error('Upload returned invalid URL')
  return url
}

// Generate styled image using Pollinations.ai image-to-image
const pollinationsStyle = async (imageUrl, stylePrompt) => {
  // Pollinations nanobanana + seedream support reference image param
  const prompt = encodeURIComponent(`${stylePrompt}, high quality, detailed`)
  const url = `https://image.pollinations.ai/prompt/${prompt}?model=flux&image=${encodeURIComponent(imageUrl)}&width=1024&height=1024&enhance=true&nologo=true`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(60_000),
    headers: { 'User-Agent': 'FirekidXMD/1.0' },
  })
  if (!res.ok) throw new Error(`Generation failed: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('Empty response from image generator')
  return buf
}

// Extract image from quoted or current message
const extractImage = async (msg, ctx) => {
  const content = msg.message || {}
  // Quoted image
  if (ctx.quotedType === 'imageMessage' && ctx.quoted?.message?.imageMessage) {
    const buf = await toBuffer(ctx.quoted.message.imageMessage, 'image')
    return buf
  }
  // Current message is an image
  if (content.imageMessage) {
    const buf = await toBuffer(content.imageMessage, 'image')
    return buf
  }
  return null
}

// Core handler factory — takes a style label and prompt
const styleHandler = (label, prompt) => async (sock, msg, ctx, { api }) => {
  const buf = await extractImage(msg, ctx)
  if (!buf) {
    return sock.sendMessage(ctx.from, {
      text: `❌ Reply to a photo or send a photo with ${ctx.prefix}${ctx.command}\n\n🎨 Style: *${label}*`
    }, { quoted: msg })
  }

  const ph = await sock.sendMessage(ctx.from, {
    text: `🎨 Applying *${label}* style...\n_This may take 20-40 seconds_`
  }, { quoted: msg })

  try {
    // Step 1: Upload to temp host to get a URL
    let imageUrl
    try {
      imageUrl = await uploadToTemp(buf)
    } catch (upErr) {
      // Fallback: try catbox.moe
      const form2 = new FormData()
      form2.append('reqtype', 'fileupload')
      form2.append('userhash', '')
      form2.append('fileToUpload', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg')
      const r2 = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form2,
        signal: AbortSignal.timeout(20_000),
      })
      imageUrl = (await r2.text()).trim()
      if (!imageUrl.startsWith('http')) throw new Error('Both upload hosts failed')
    }

    // Step 2: Generate styled version
    const styled = await pollinationsStyle(imageUrl, prompt)

    // Step 3: Send result
    await sock.sendMessage(ctx.from, { delete: ph.key })
    await sock.sendMessage(ctx.from, {
      image: styled,
      caption: `🎨 *${label} Style*\n_Powered by Firekid XMD 🔥_`
    }, { quoted: msg })

  } catch (err) {
    await sock.sendMessage(ctx.from, {
      edit: ph.key,
      text: `❌ Style failed: ${err.message}\n\n_Try again in a moment — free AI servers can be slow_`
    })
  }
}

// ── All 28 style commands ────────────────────────────────────────────────────
export default [
  {
    command: 'toghibli',
    aliases: ['ghibli', 'studioghibli'],
    category: 'styles',
    handler: styleHandler('Studio Ghibli', 'Studio Ghibli anime style, Hayao Miyazaki art, soft watercolor, whimsical, lush backgrounds, hand-drawn animation look')
  },
  {
    command: 'toanime',
    aliases: ['anime', 'animestyle', 'animeart'],
    category: 'styles',
    handler: styleHandler('Anime', 'high quality anime style illustration, sharp outlines, vibrant colors, cel shading, Japanese animation art style')
  },
  {
    command: 'tocartoon',
    aliases: ['cartoon', 'cartoonify'],
    category: 'styles',
    handler: styleHandler('Cartoon', 'cartoon illustration style, bold outlines, flat bright colors, fun cartoon art, comic book style character')
  },
  {
    command: 'todisney',
    aliases: ['disney', 'disneycharacter'],
    category: 'styles',
    handler: styleHandler('Disney', 'Disney animated movie character style, expressive eyes, smooth shading, magical Disney animation art, Pixar-Disney crossover')
  },
  {
    command: 'tocyberpunk',
    aliases: ['cyberpunk', 'cyberstyle'],
    category: 'styles',
    handler: styleHandler('Cyberpunk', 'cyberpunk 2077 style, neon lights, dark city background, glowing neon accents, futuristic cyberpunk aesthetic, rain reflections')
  },
  {
    command: 'tocomic',
    aliases: ['comic', 'comicbook'],
    category: 'styles',
    handler: styleHandler('Comic Book', 'Marvel DC comic book style, halftone dots, bold ink outlines, speech bubble ready, action hero comic art')
  },
  {
    command: 'togta',
    aliases: ['gta', 'gtastyle', 'gtaart'],
    category: 'styles',
    handler: styleHandler('GTA Loading Screen', 'GTA V loading screen art style, Rockstar Games illustration, urban street art, high contrast, comic style portrait')
  },
  {
    command: 'tomanga',
    aliases: ['manga', 'mangaart'],
    category: 'styles',
    handler: styleHandler('Manga', 'black and white manga illustration, Japanese manga art style, screen tones, detailed ink shading, dramatic manga panels')
  },
  {
    command: 'topixar',
    aliases: ['pixar', 'pixar3d'],
    category: 'styles',
    handler: styleHandler('Pixar 3D', 'Pixar 3D movie character style, subsurface scattering skin, large expressive eyes, smooth 3D render, Pixar movie quality')
  },
  {
    command: 'tooilpainting',
    aliases: ['oilpainting', 'oilpaint'],
    category: 'styles',
    handler: styleHandler('Oil Painting', 'classic oil painting style, rich textured brushstrokes, Renaissance portrait style, museum quality oil canvas painting')
  },
  {
    command: 'tosketch',
    aliases: ['sketch', 'pencilsketch'],
    category: 'styles',
    handler: styleHandler('Pencil Sketch', 'detailed pencil sketch drawing, graphite shading, hand-drawn pencil portrait, fine art sketch style')
  },
  {
    command: 'tovintage',
    aliases: ['vintage', 'retrophoto'],
    category: 'styles',
    handler: styleHandler('Vintage', 'vintage retro photo style, aged film grain, faded warm tones, 1970s photography aesthetic, analog film look')
  },
  {
    command: 'towatercolor',
    aliases: ['watercolor', 'watercolour'],
    category: 'styles',
    handler: styleHandler('Watercolor', 'watercolor painting style, soft color bleeds, wet on wet technique, loose brushwork, delicate watercolor portrait')
  },
  {
    command: 'zombie',
    aliases: ['zombify', 'undead'],
    category: 'styles',
    handler: styleHandler('Zombie', 'zombie horror style, rotting flesh texture, undead eyes, horror movie zombie makeup, Walking Dead style')
  },
  {
    command: 'oldage',
    aliases: ['aged', 'ageprogression', 'aging'],
    category: 'styles',
    handler: styleHandler('Old Age', 'age progression effect, elderly version, deep wrinkles, grey hair, aged skin texture, 70-80 years old realistic')
  },
  {
    command: 'spirit',
    aliases: ['ghost', 'ghosteffect', 'spiriteffect'],
    category: 'styles',
    handler: styleHandler('Spirit Ghost', 'ethereal spirit ghost effect, transparent glowing aura, supernatural glow, spiritual energy visual, transparent ghost overlay')
  },
  {
    command: 'satan',
    aliases: ['demonic', 'dark', 'darkart'],
    category: 'styles',
    handler: styleHandler('Dark Horror', 'demonic dark horror style, red glowing eyes, dark shadows, ominous lighting, horror movie villain aesthetic')
  },
  {
    command: 'punk',
    aliases: ['punkstyle', 'punkrock'],
    category: 'styles',
    handler: styleHandler('Punk', 'punk rock aesthetic, mohawk, leather jacket, safety pins, anarchist punk style portrait, rebellious street punk')
  },
  {
    command: 'hijab',
    aliases: ['hijabai', 'hijaboverlay'],
    category: 'styles',
    handler: styleHandler('Hijab', 'person wearing elegant hijab, beautiful hijab styling, modest fashion portrait, respectful hijab overlay')
  },
  {
    command: 'wanted',
    aliases: ['wantedposter', 'wantedstyle'],
    category: 'styles',
    handler: styleHandler('Wanted Poster', 'wild west wanted poster style, aged brown paper texture, vintage typography, outlaw bounty poster, sepia tone')
  },
  {
    command: 'drip',
    aliases: ['dripeffect', 'dripstyle'],
    category: 'styles',
    handler: styleHandler('Drip', 'drip art style, paint dripping effect, liquid paint aesthetic, artistic drip portrait, colorful dripping paint overlay')
  },
  {
    command: 'joker',
    aliases: ['jokereffect', 'jokermakeup'],
    category: 'styles',
    handler: styleHandler('Joker', 'Joker DC villain makeup, white face paint, red smile, green hair, Joaquin Phoenix Joker or Heath Ledger Joker style')
  },
  {
    command: 'polaroid',
    aliases: ['polaroidframe', 'instax'],
    category: 'styles',
    handler: styleHandler('Polaroid', 'polaroid instant photo frame effect, white border, slightly faded tones, vintage polaroid camera aesthetic')
  },
  {
    command: 'gun',
    aliases: ['guneffect', 'holdinggun'],
    category: 'styles',
    handler: styleHandler('Holding Gun', 'person holding gun, action movie style, dramatic lighting, cinematic pose, tactical weapon aesthetic')
  },
  {
    command: 'clown',
    aliases: ['clownmakeup', 'clownify'],
    category: 'styles',
    handler: styleHandler('Clown', 'circus clown makeup, painted smile, colorful clown wig, bright clown costume, professional clown face paint')
  },
  {
    command: 'mirror',
    aliases: ['mirroreffect', 'mirrored'],
    category: 'styles',
    handler: styleHandler('Mirror', 'mirror reflection effect, symmetrical face, kaleidoscope mirror art, bilateral symmetry portrait effect')
  },
  {
    command: 'partner',
    aliases: ['couple', 'coupleeffect', 'twopeople'],
    category: 'styles',
    handler: styleHandler('Couple Collage', 'romantic couple collage, two photos side by side, love couple art style, heart frame, romantic portrait')
  },
  {
    command: 'nanobanana',
    aliases: ['nano', 'artify'],
    category: 'styles',
    handler: async (sock, msg, ctx, { api }) => {
      // nanobanana uses Pollinations native model with reference support
      const buf = await extractImage(msg, ctx)
      const stylePrompt = ctx.query?.trim() || 'artistic stylized version'
      if (!buf) return sock.sendMessage(ctx.from, {
        text: `❌ Reply to a photo + ${ctx.prefix}nanobanana [style prompt]\n\n_Example: ${ctx.prefix}nanobanana cyberpunk warrior_`
      }, { quoted: msg })

      const ph = await sock.sendMessage(ctx.from, {
        text: `🎨 Applying *NanoBanana* style...\n_This may take 20-40 seconds_`
      }, { quoted: msg })

      try {
        let imageUrl
        try { imageUrl = await uploadToTemp(buf) } catch {
          const form2 = new FormData()
          form2.append('reqtype', 'fileupload')
          form2.append('userhash', '')
          form2.append('fileToUpload', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg')
          const r2 = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form2, signal: AbortSignal.timeout(20_000) })
          imageUrl = (await r2.text()).trim()
          if (!imageUrl.startsWith('http')) throw new Error('Upload failed')
        }
        // Use nanobanana model specifically for creative style transfer
        const prompt = encodeURIComponent(stylePrompt + ', artistic high quality')
        const url = `https://image.pollinations.ai/prompt/${prompt}?model=nanobanana&image=${encodeURIComponent(imageUrl)}&width=1024&height=1024`
        const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const styled = Buffer.from(await res.arrayBuffer())
        await sock.sendMessage(ctx.from, { delete: ph.key })
        await sock.sendMessage(ctx.from, {
          image: styled,
          caption: `🎨 *NanoBanana Style:* ${stylePrompt}\n_Powered by Firekid XMD 🔥_`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: `❌ Style failed: ${err.message}`
        })
      }
    }
  },
]
