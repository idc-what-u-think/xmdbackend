// commands/tools/sensitivity.js
// .sensitivity ff <device>           — Free Fire sensitivity
// .sensitivity codm <device>         — CODM sensitivity
// .sensitivity ff <device> | <style> | <level>  — advanced (optional)
// Uses: https://gamingsensitivity.vercel.app/api/generate

const API_URL  = 'https://gamingsensitivity.vercel.app/api/generate'
const API_KEY  = process.env.SENSITIVITY_API_KEY || 'sk_a66689444edb514840dfcf8fcb90ff491b9f2ff9c81905971463ecf0d5c95656'

const DIVIDER  = '─'.repeat(28)

// ── Free Fire response formatter ────────────────────────────────────────────
const formatFF = (data, device) => {
  const d = data.data
  const info = data.device_info
  const lines = [
    `🎯 *Free Fire Sensitivity*`,
    DIVIDER, ``,
    `📱 *Device:* ${info?.name || device}`,
    `⚡ *Performance:* ${info?.performance || 'N/A'}`,
    `🖥️ *Screen:* ${info?.screenSize || 'N/A'}" | ${info?.refreshRate || 'N/A'}Hz`,
    ``,
    `📊 *Sensitivity Settings*`,
    DIVIDER,
    `| 🎮 General:        *${d.general}*`,
    `| 🔴 Red Dot:        *${d.redDot}*`,
    `| 🔭 2x Scope:       *${d.scope2x}*`,
    `| 🔭 4x Scope:       *${d.scope4x}*`,
    `| 🔫 Sniper Scope:   *${d.sniperScope}*`,
    `| 👁️  Free Look:      *${d.freeLook}*`,
    ``,
    `🎛️ *Extra Settings*`,
    DIVIDER,
    `| 🔘 Fire Btn Size:  *${d.fireButtonSize}*`,
    `| 💎 Rec. DPI:       *${d.recommendedDPI}*`,
    `| 📐 Drag Angle:     *${d.dragAngle}°*`,
    ``,
    `_Powered by Firekid XMD 🔥_`
  ]
  return lines.join('\n')
}

// ── CODM response formatter ──────────────────────────────────────────────────
const formatCODM = (data, device) => {
  const mp = data.data?.mp
  const br = data.data?.br
  const info = data.device_info
  const lines = [
    `🎯 *CODM Sensitivity*`,
    DIVIDER, ``,
    `📱 *Device:* ${info?.name || device}`,
    `⚡ *Performance:* ${info?.performance || 'N/A'}`,
    `🖥️ *Screen:* ${info?.screenSize || 'N/A'}" | ${info?.refreshRate || 'N/A'}Hz`,
    ``,
    `🏙️ *Multiplayer (MP)*`,
    DIVIDER,
    `| 📷 Camera FPP:        *${mp?.cameraFpp}*`,
    `| 🕹️  Steering:          *${mp?.steeringSensitivity}*`,
    `| ↕️  Vertical Turn:     *${mp?.verticalTurningSensitivity}*`,
    `| 🔴 Red Dot:           *${mp?.redDot}*`,
    `| 🎯 ADS:               *${mp?.adsSensitivity}*`,
    `| 🔭 4x Scope:          *${mp?.scope4x}*`,
    `| 🔫 Sniper:            *${mp?.sniperScope}*`,
    `| 🔥 Fire Camera FPP:   *${mp?.firingCameraFpp}*`,
    `| 🔥 Fire Red Dot:      *${mp?.firingRedDot}*`,
    `| 🔥 Fire 4x Scope:     *${mp?.firingScope4x}*`,
    ``,
    `🌍 *Battle Royale (BR)*`,
    DIVIDER,
    `| 📷 Camera FPP:        *${br?.cameraFpp}*`,
    `| 👤 3rd Person:        *${br?.thirdPersonSensitivity}*`,
    `| 🔴 Red Dot:           *${br?.redDot}*`,
    `| 🔭 4x Scope:          *${br?.scope4x}*`,
    `| 🔫 Sniper:            *${br?.sniperScope}*`,
    ``,
    `_Powered by Firekid XMD 🔥_`
  ]
  return lines.join('\n')
}

export default [
  {
    command: 'sensitivity',
    aliases: ['sens', 'gamesens', 'ffsen', 'codmsen'],
    category: 'tools',
    handler: async (sock, msg, ctx, { api }) => {

      // Parse: .sensitivity <game> <device name> [| play_style | experience]
      // Examples:
      //   .sensitivity ff iPhone X
      //   .sensitivity codm Samsung Galaxy S22 | 4fingers
      //   .sensitivity ff Tecno Spark 10 | aggressive | advanced
      const rawArgs = ctx.query?.trim()

      if (!rawArgs) {
        return sock.sendMessage(ctx.from, {
          text: [
            `🎯 *Gaming Sensitivity Calculator*`,
            DIVIDER, ``,
            `*Usage:*`,
            `${ctx.prefix}sensitivity ff <device>`,
            `${ctx.prefix}sensitivity codm <device>`, ``,
            `*Advanced (FF only):*`,
            `${ctx.prefix}sensitivity ff <device> | <play_style> | <experience>`, ``,
            `*Play styles:* aggressive, rusher, precise, sniper, balanced, versatile, defensive`,
            `*Experience:* beginner, intermediate, advanced, professional, expert`, ``,
            `*Examples:*`,
            `${ctx.prefix}sensitivity ff iPhone X`,
            `${ctx.prefix}sensitivity codm Samsung Galaxy S22 | 4fingers`,
            `${ctx.prefix}sensitivity ff Tecno Spark 10 | aggressive | advanced`
          ].join('\n')
        }, { quoted: msg })
      }

      // Split on | for optional extra params
      const parts = rawArgs.split('|').map(s => s.trim())
      const gameAndDevice = parts[0]

      // Extract game (first word)
      const [gameRaw, ...deviceParts] = gameAndDevice.split(' ')
      const game = gameRaw?.toLowerCase()
      const device = deviceParts.join(' ').trim()

      if (!['ff', 'freefire', 'codm', 'cod'].includes(game)) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Unknown game: *${gameRaw}*\n\nUse:\n• ${ctx.prefix}sensitivity *ff* <device>\n• ${ctx.prefix}sensitivity *codm* <device>`
        }, { quoted: msg })
      }

      if (!device) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Please provide your device name.\n\n*Example:*\n${ctx.prefix}sensitivity ff iPhone X`
        }, { quoted: msg })
      }

      const isFF = game === 'ff' || game === 'freefire'
      const ph = await sock.sendMessage(ctx.from, {
        text: `🎯 Calculating sensitivity for *${device}*...`
      }, { quoted: msg })

      try {
        let body, endpoint

        if (isFF) {
          const playStyle  = parts[1] || 'aggressive'
          const experience = parts[2] || 'advanced'
          endpoint = `${API_URL}/freefire`
          body = {
            device_name:      device,
            play_style:       playStyle,
            experience_level: experience,
            calculator_type:  'free',
          }
        } else {
          // CODM
          const fingerCount = parts[1] || '4fingers'
          endpoint = `${API_URL}/codm`
          body = {
            device_name:  device,
            finger_count: fingerCount,
          }
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key':    API_KEY,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          const errMsg = data?.message || data?.error || `HTTP ${res.status}`
          throw new Error(errMsg)
        }

        const text = isFF ? formatFF(data, device) : formatCODM(data, device)
        await sock.sendMessage(ctx.from, { edit: ph.key, text })

      } catch (err) {
        const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate')
        await sock.sendMessage(ctx.from, {
          edit: ph.key,
          text: isRateLimit
            ? `⚠️ Rate limit hit. Try again in a moment.\n\n_The sensitivity API has limited requests/min_`
            : `❌ Failed: ${err.message}\n\n_Make sure your device name is correct. Try the full name, e.g. "iPhone 14 Pro" or "Samsung Galaxy S23"_`
        })
      }
    }
  },
]
