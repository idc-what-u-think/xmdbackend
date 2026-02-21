// commands/converter/audio.js
// Commands: .bass | .nightcore | .slow | .robot | .reverse | .deep | .earrape | .fat | .squirrel | .shazam
//
// Dependencies:
//   fluent-ffmpeg        — audio processing
//   @ffmpeg-installer/ffmpeg — ffmpeg binary
//
// Install: npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

const execAsync = promisify(exec)

const tmp = (ext) => join(tmpdir(), `fkd_${randomBytes(6).toString('hex')}.${ext}`)

const getFFmpeg = async () => {
  try {
    const { path } = await import('@ffmpeg-installer/ffmpeg')
    return path
  } catch {
    return 'ffmpeg'
  }
}

// Download audio from a quoted message or audio message
const getAudioBuffer = async (sock, msg, ctx) => {
  const hasQuotedAudio = ctx.quoted && [
    'audioMessage', 'videoMessage', 'documentMessage'
  ].includes(ctx.quotedType)

  const msgType = Object.keys(msg.message || {})[0]
  const hasDirectAudio = ['audioMessage', 'videoMessage', 'documentMessage'].includes(msgType)

  if (!hasQuotedAudio && !hasDirectAudio) return null

  const targetMsg = hasQuotedAudio ? ctx.quoted : msg

  const buffer = await downloadMediaMessage(
    targetMsg,
    'buffer',
    {},
    { logger: console, reuploadRequest: sock.updateMediaMessage }
  )

  return buffer
}

// Core audio filter runner
// filter is an ffmpeg -af filter string
const applyAudioFilter = async (buffer, filter, inputExt = 'mp3') => {
  const ffmpeg  = await getFFmpeg()
  const inPath  = tmp(inputExt)
  const outPath = tmp('mp3')

  await writeFile(inPath, buffer)

  try {
    await execAsync(
      `"${ffmpeg}" -y -i "${inPath}" -af "${filter}" -q:a 2 "${outPath}"`
    )
    return await readFile(outPath)
  } finally {
    await unlink(inPath).catch(() => {})
    await unlink(outPath).catch(() => {})
  }
}

// Helper to build and send effect
const sendEffect = async (sock, msg, ctx, buffer, effectName, filter) => {
  const processing = await sock.sendMessage(ctx.from, {
    text: `⚙️ Applying *${effectName}* effect...`
  }, { quoted: msg })

  try {
    const result = await applyAudioFilter(buffer, filter)

    await sock.sendMessage(ctx.from, {
      audio:    result,
      mimetype: 'audio/mpeg',
      ptt:      false
    }, { quoted: msg })

    await sock.sendMessage(ctx.from, {
      delete: processing.key
    })

  } catch (err) {
    await sock.sendMessage(ctx.from, {
      edit: processing.key,
      text: `❌ Failed: ${err.message}\n\n_Make sure ffmpeg is installed on the server_`
    })
  }
}

// Shared "no audio" error message
const noAudioMsg = (sock, msg, ctx, cmd) =>
  sock.sendMessage(ctx.from, {
    text: `❌ Reply to an audio/video message with ${ctx.prefix}${cmd}`
  }, { quoted: msg })

export default [

  // ── .bass ─────────────────────────────────────────────
  {
    command:  'bass',
    aliases:  ['bassboost', 'bassboosted'],
    category: 'converter',
    description: 'Add a heavy bass boost effect to audio',
    usage:    '.bass (reply to audio)',
    example:  'Reply to a voice note with .bass',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'bass')

      await sendEffect(sock, msg, ctx, buffer, 'Bass Boost',
        'bass=g=20,dynaudnorm=f=200'
      )
    }
  },

  // ── .nightcore ────────────────────────────────────────
  {
    command:  'nightcore',
    aliases:  ['nc', 'speed'],
    category: 'converter',
    description: 'Apply nightcore effect (pitch up + speed up)',
    usage:    '.nightcore (reply to audio)',
    example:  'Reply to audio with .nightcore',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'nightcore')

      await sendEffect(sock, msg, ctx, buffer, 'Nightcore',
        'asetrate=44100*1.3,aresample=44100,atempo=1.1'
      )
    }
  },

  // ── .slow ─────────────────────────────────────────────
  {
    command:  'slow',
    aliases:  ['slowdown', 'slowed'],
    category: 'converter',
    description: 'Slow down and pitch down audio (lofi/slowed effect)',
    usage:    '.slow (reply to audio)',
    example:  'Reply to audio with .slow',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'slow')

      await sendEffect(sock, msg, ctx, buffer, 'Slowed',
        'asetrate=44100*0.8,aresample=44100,atempo=0.9'
      )
    }
  },

  // ── .robot ────────────────────────────────────────────
  {
    command:  'robot',
    aliases:  ['robotic', 'robo'],
    category: 'converter',
    description: 'Make audio sound like a robot',
    usage:    '.robot (reply to audio)',
    example:  'Reply to a voice note with .robot',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'robot')

      await sendEffect(sock, msg, ctx, buffer, 'Robot',
        'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75'
      )
    }
  },

  // ── .reverse ──────────────────────────────────────────
  {
    command:  'reverse',
    aliases:  ['backwards', 'backward'],
    category: 'converter',
    description: 'Play audio in reverse',
    usage:    '.reverse (reply to audio)',
    example:  'Reply to audio with .reverse',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'reverse')

      await sendEffect(sock, msg, ctx, buffer, 'Reverse',
        'areverse'
      )
    }
  },

  // ── .deep ─────────────────────────────────────────────
  {
    command:  'deep',
    aliases:  ['deeper', 'deepvoice'],
    category: 'converter',
    description: 'Make audio sound deep and low pitched',
    usage:    '.deep (reply to audio)',
    example:  'Reply to audio with .deep',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'deep')

      await sendEffect(sock, msg, ctx, buffer, 'Deep Voice',
        'asetrate=44100*0.7,aresample=44100'
      )
    }
  },

  // ── .earrape ──────────────────────────────────────────
  {
    command:  'earrape',
    aliases:  ['loud', 'distorted', 'distort'],
    category: 'converter',
    description: 'Make audio extremely loud and distorted (earrape)',
    usage:    '.earrape (reply to audio)',
    example:  'Reply to audio with .earrape',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'earrape')

      await sendEffect(sock, msg, ctx, buffer, 'Earrape',
        'acrusher=.1:1:64:0:log,volume=12dB'
      )
    }
  },

  // ── .fat ──────────────────────────────────────────────
  {
    command:  'fat',
    aliases:  ['fatvoice', 'fatman'],
    category: 'converter',
    description: 'Make audio sound fat/low like a big man',
    usage:    '.fat (reply to audio)',
    example:  'Reply to audio with .fat',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'fat')

      await sendEffect(sock, msg, ctx, buffer, 'Fat Voice',
        'asetrate=44100*0.6,aresample=44100,bass=g=10'
      )
    }
  },

  // ── .squirrel ─────────────────────────────────────────
  {
    command:  'squirrel',
    aliases:  ['chipmunk', 'alvin', 'highpitch'],
    category: 'converter',
    description: 'Make audio sound like a squirrel/chipmunk (high pitched)',
    usage:    '.squirrel (reply to audio)',
    example:  'Reply to audio with .squirrel',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) return noAudioMsg(sock, msg, ctx, 'squirrel')

      await sendEffect(sock, msg, ctx, buffer, 'Squirrel',
        'asetrate=44100*1.8,aresample=44100'
      )
    }
  },

  // ── .shazam ───────────────────────────────────────────
  // Note: Real Shazam fingerprinting requires paid API.
  // This implementation uses AudD free tier (50 req/day, no key needed for basic)
  // or audd.io with a free API key
  {
    command:  'shazam',
    aliases:  ['findmusic', 'recognize', 'identify'],
    category: 'converter',
    description: 'Identify a song from an audio or video message',
    usage:    '.shazam (reply to audio/video)',
    example:  'Reply to a voice note or video with .shazam',

    handler: async (sock, msg, ctx) => {
      const buffer = await getAudioBuffer(sock, msg, ctx)
      if (!buffer) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Reply to an audio or video message with ${ctx.prefix}shazam`
        }, { quoted: msg })
      }

      const processing = await sock.sendMessage(ctx.from, {
        text: '🎵 Identifying song... please wait'
      }, { quoted: msg })

      try {
        // Convert to mp3 first (max 10 seconds for recognition)
        const ffmpeg  = await getFFmpeg()
        const inPath  = tmp('mp3')
        const outPath = tmp('mp3')

        await writeFile(inPath, buffer)
        await execAsync(`"${ffmpeg}" -y -i "${inPath}" -t 10 -q:a 5 "${outPath}"`)
        const audioBuffer = await readFile(outPath)

        await unlink(inPath).catch(() => {})
        await unlink(outPath).catch(() => {})

        // Use AudD API (free tier — 50 recognitions/day, no key for basic)
        const formData = new FormData()
        const blob     = new Blob([audioBuffer], { type: 'audio/mpeg' })
        formData.append('file', blob, 'audio.mp3')
        formData.append('return', 'spotify,deezer')

        const auddKey = process.env.AUDD_API_KEY || 'test' // 'test' = very limited free tier
        formData.append('api_token', auddKey)

        const res  = await fetch('https://api.audd.io/', {
          method: 'POST',
          body:   formData
        })
        const data = await res.json()

        if (data.status !== 'success' || !data.result) {
          return sock.sendMessage(ctx.from, {
            edit: processing.key,
            text: `😔 *Song not recognized*\n\nTry with a clearer audio or longer clip.`
          })
        }

        const song   = data.result
        const artist = song.artist || 'Unknown'
        const title  = song.title  || 'Unknown'
        const album  = song.album  || 'Unknown'
        const year   = song.release_date?.split('-')[0] || 'Unknown'

        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: [
            `🎵 *Song Identified!*`,
            `${'─'.repeat(28)}`,
            ``,
            `🎤 *Title:*   ${title}`,
            `👤 *Artist:*  ${artist}`,
            `💿 *Album:*   ${album}`,
            `📅 *Year:*    ${year}`,
            song.spotify?.external_urls?.spotify
              ? `\n🟢 *Spotify:* ${song.spotify.external_urls.spotify}` : '',
          ].filter(Boolean).join('\n')
        })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          edit: processing.key,
          text: `❌ Recognition failed: ${err.message}`
        })
      }
    }
  }

]
