const luhnGenerate = (partialNumber) => {
  const digits = partialNumber.split('').map(Number)
  let sum = 0
  let shouldDouble = true
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i]
    if (shouldDouble) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    shouldDouble = !shouldDouble
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return partialNumber + checkDigit
}

const randomDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')

const CARD_SCHEMES = {
  visa:       { prefix: '4', length: 16, cvvLen: 3 },
  mastercard: { prefix: String(Math.floor(Math.random() * 5) + 51), length: 16, cvvLen: 3 },
  amex:       { prefix: '37', length: 15, cvvLen: 4 },
  discover:   { prefix: '6011', length: 16, cvvLen: 3 }
}

const generateCard = (scheme = 'visa') => {
  const s = CARD_SCHEMES[scheme] || CARD_SCHEMES.visa
  const partial = s.prefix + randomDigits(s.length - s.prefix.length - 1)
  const number = luhnGenerate(partial)
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const year = String(new Date().getFullYear() + Math.floor(Math.random() * 5) + 1)
  const cvv = randomDigits(s.cvvLen)
  return { number, expiry: `${month}/${year}`, cvv, scheme: scheme.toUpperCase(), length: s.length }
}

const formatCardNumber = (num) => num.match(/.{1,4}/g)?.join(' ') || num

export default [
  {
    command: 'fakecc',
    aliases: ['genfakecard', 'testcard', 'generatecc'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim() || 'visa'
      const validSchemes = ['visa', 'mastercard', 'amex', 'discover']
      const scheme = validSchemes.includes(input) ? input : 'visa'
      const count = Math.min(parseInt(ctx.args?.[1]) || 1, 5)
      const placeholder = await sock.sendMessage(ctx.from, { text: '💳 Generating test card...' }, { quoted: msg })
      try {
        const { createCanvas } = await import('canvas')
        const cards = Array.from({ length: count }, () => generateCard(scheme))
        const card = cards[0]
        const w = 600
        const h = count > 1 ? 220 + (count - 1) * 160 : 360
        const canvas = createCanvas(w, h)
        const c = canvas.getContext('2d')
        const grad = c.createLinearGradient(0, 0, w, h)
        grad.addColorStop(0, '#1a1a2e')
        grad.addColorStop(1, '#16213e')
        c.fillStyle = grad
        c.roundRect(0, 0, w, h, 20)
        c.fill()
        for (let i = 0; i < 3; i++) {
          c.beginPath()
          c.arc(w - 80 + i * 40, 60, 120, 0, Math.PI * 2)
          c.fillStyle = `rgba(255,255,255,0.03)`
          c.fill()
        }
        c.fillStyle = 'rgba(255,255,255,0.08)'
        c.font = 'bold 18px monospace'
        c.fillText(card.scheme, 30, 50)
        cards.forEach((cd, idx) => {
          const yOff = idx * 160
          c.fillStyle = '#ffffff'
          c.font = 'bold 26px monospace'
          c.fillText(formatCardNumber(cd.number), 30, 120 + yOff)
          c.fillStyle = 'rgba(255,255,255,0.6)'
          c.font = '13px monospace'
          c.fillText('EXPIRES', 30, 155 + yOff)
          c.fillText('CVV', 200, 155 + yOff)
          c.fillStyle = '#ffffff'
          c.font = 'bold 18px monospace'
          c.fillText(cd.expiry, 30, 175 + yOff)
          c.fillText(cd.cvv, 200, 175 + yOff)
          if (idx < cards.length - 1) {
            c.strokeStyle = 'rgba(255,255,255,0.1)'
            c.lineWidth = 1
            c.beginPath()
            c.moveTo(30, 200 + yOff)
            c.lineTo(w - 30, 200 + yOff)
            c.stroke()
          }
        })
        c.fillStyle = 'rgba(255,255,255,0.25)'
        c.font = '11px sans-serif'
        c.fillText('FireKid', 15, h - 12)
        c.fillStyle = 'rgba(255,255,255,0.15)'
        c.font = '10px sans-serif'
        c.fillText('FOR TESTING ONLY · NOT A REAL CARD', w / 2 - 100, h - 12)
        const buf = canvas.toBuffer('image/png')
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          image: buf,
          caption: [
            `💳 *Test Card Generated*`,
            `${'─'.repeat(28)}`,
            `Scheme: ${card.scheme}`,
            ``,
            ...cards.map((cd, i) => [
              count > 1 ? `*Card ${i + 1}:*` : '',
              `Number: \`${formatCardNumber(cd.number)}\``,
              `Expiry: \`${cd.expiry}\` | CVV: \`${cd.cvv}\``
            ].filter(Boolean).join('\n')),
            ``,
            `_⚠️ For testing/development only. Not a real card._`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message?.includes('Cannot find')) {
          const card = generateCard(scheme)
          await sock.sendMessage(ctx.from, { delete: placeholder.key })
          await sock.sendMessage(ctx.from, {
            text: [
              `💳 *Test Card*`,
              `${'─'.repeat(28)}`,
              `Scheme: ${card.scheme}`,
              `Number: \`${formatCardNumber(card.number)}\``,
              `Expiry: \`${card.expiry}\``,
              `CVV: \`${card.cvv}\``,
              ``,
              `_⚠️ For testing/development only. Not a real card._`,
              `_Install canvas for image output: npm install canvas_`
            ].join('\n')
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, {
            edit: placeholder.key,
            text: `❌ Failed: ${err.message}`
          })
        }
      }
    }
  },

  {
    command: 'fakeid',
    aliases: ['fakeidentity', 'randomid', 'generateid'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const nationality = ctx.query?.trim()?.slice(0, 2)?.toUpperCase() || 'NG'
      const placeholder = await sock.sendMessage(ctx.from, { text: '👤 Generating fake identity...' }, { quoted: msg })
      const validNats = ['US','GB','CA','AU','FR','DE','NG','ZA','BR','IN','JP','KR','MX','IT','ES','RU','PL','NL','SE','NO']
      const nat = validNats.includes(nationality) ? nationality.toLowerCase() : 'ng'
      try {
        const res = await fetch(`https://randomuser.me/api/?nat=${nat}&results=1`, {
          headers: { 'Accept': 'application/json' }
        })
        if (!res.ok) throw new Error('randomuser.me failed')
        const data = await res.json()
        const p = data.results[0]
        const name = `${p.name.first} ${p.name.last}`
        const dob = new Date(p.dob.date)
        const dobStr = dob.toLocaleDateString('en-GB')
        const phone = p.phone
        const cell = p.cell
        const email = p.email
        const addr = `${p.location.street.number} ${p.location.street.name}, ${p.location.city}, ${p.location.state}, ${p.location.country}`
        const zip = p.location.postcode
        const gender = p.gender.charAt(0).toUpperCase() + p.gender.slice(1)
        const uuid = p.login.uuid
        const username = p.login.username
        const password = p.login.password
        const age = p.dob.age
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          text: [
            `👤 *Fake Identity*`,
            `${'─'.repeat(32)}`,
            ``,
            `*Personal*`,
            `  Name:     ${name}`,
            `  Gender:   ${gender}`,
            `  DOB:      ${dobStr} (Age: ${age})`,
            `  Email:    ${email}`,
            ``,
            `*Contact*`,
            `  Phone:    ${phone}`,
            `  Cell:     ${cell}`,
            ``,
            `*Address*`,
            `  ${addr}`,
            `  ZIP:      ${zip}`,
            ``,
            `*Credentials*`,
            `  Username: ${username}`,
            `  Password: ${password}`,
            `  UUID:     ${uuid}`,
            ``,
            `_⚠️ This is a randomly generated fake identity._`,
            `_Do not use for any illegal activity._`
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ Failed to generate identity: ${err.message}`
        })
      }
    }
  },

  {
    command: 'ngl',
    aliases: ['ngllink', 'anonymous', 'anonlink'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const username = ctx.query?.trim()
      if (!username) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a username.`,
            `📌 *Usage:* ${ctx.prefix}ngl <username>`,
            ``,
            `*Example:* ${ctx.prefix}ngl yourname`
          ].join('\n')
        }, { quoted: msg })
      }
      const clean = username.replace(/[^a-zA-Z0-9._-]/g, '')
      if (!clean) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid username. Only letters, numbers, dots, dashes and underscores allowed.`
        }, { quoted: msg })
      }
      const link = `https://ngl.link/${clean}`
      await sock.sendMessage(ctx.from, {
        text: [
          `🔗 *NGL Anonymous Link*`,
          `${'─'.repeat(28)}`,
          ``,
          `👤 Username: *${clean}*`,
          ``,
          `🔗 ${link}`,
          ``,
          `_Share this link — anyone can send you anonymous messages without knowing who they are._`
        ].join('\n')
      }, { quoted: msg })
    }
  },

  {
    command: 'cc',
    aliases: ['binlookup', 'cardlookup', 'bincheck'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.trim()?.replace(/\s/g, '')
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: [
            `❌ Provide a BIN (first 6-8 digits of card number).`,
            `📌 *Usage:* ${ctx.prefix}cc <BIN>`,
            ``,
            `*Example:* ${ctx.prefix}cc 411111`
          ].join('\n')
        }, { quoted: msg })
      }
      const bin = input.slice(0, 8).replace(/\D/g, '')
      if (bin.length < 6) {
        return sock.sendMessage(ctx.from, {
          text: `❌ BIN must be at least 6 digits.`
        }, { quoted: msg })
      }
      const placeholder = await sock.sendMessage(ctx.from, { text: `🔍 Looking up BIN ${bin}...` }, { quoted: msg })
      try {
        const res = await fetch(`https://lookup.binlist.net/${bin}`, {
          headers: {
            'Accept-Version': '3',
            'User-Agent': 'Mozilla/5.0'
          }
        })
        if (res.status === 429) throw new Error('Rate limited. Try again in a few seconds.')
        if (!res.ok) throw new Error(`BIN not found (${res.status})`)
        const data = await res.json()
        await sock.sendMessage(ctx.from, { delete: placeholder.key })
        await sock.sendMessage(ctx.from, {
          text: [
            `🔍 *BIN Lookup*`,
            `${'─'.repeat(28)}`,
            ``,
            `*BIN:* ${bin}`,
            ``,
            `*Card*`,
            `  Scheme:   ${data.scheme?.toUpperCase() || 'Unknown'}`,
            `  Type:     ${data.type?.charAt(0).toUpperCase() + data.type?.slice(1) || 'Unknown'}`,
            `  Brand:    ${data.brand || 'Unknown'}`,
            `  Prepaid:  ${data.prepaid != null ? (data.prepaid ? 'Yes' : 'No') : 'Unknown'}`,
            ``,
            `*Issuer*`,
            `  Bank:     ${data.bank?.name || 'Unknown'}`,
            `  Phone:    ${data.bank?.phone || 'N/A'}`,
            `  URL:      ${data.bank?.url || 'N/A'}`,
            ``,
            `*Country*`,
            `  Name:     ${data.country?.name || 'Unknown'}`,
            `  Code:     ${data.country?.alpha2 || 'Unknown'}`,
            `  Currency: ${data.country?.currency || 'Unknown'}`,
            `  Emoji:    ${data.country?.emoji || ''}`,
          ].join('\n')
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: placeholder.key,
          text: `❌ BIN lookup failed: ${err.message}`
        })
      }
    }
  }
]
