// Sound & Audio alerts using Dual-Engine: HTML5 Audio + Web Audio API with Keep-Alive for mobile browsers

let sharedAudioCtx: AudioContext | null = null
let keepAliveOscillator: OscillatorNode | null = null
let keepAliveGain: GainNode | null = null
let cachedAudioElement: HTMLAudioElement | null = null

// Generate a clean standalone 16-bit PCM WAV chime (Data URI) for 100% offline HTML5 audio playback
function generateChimeWavUri(): string {
  const sampleRate = 22050
  const duration = 0.55 // seconds
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  // RIFF identifier
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(view, 8, 'WAVE')
  // fmt sub-chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // subchunk1 size (16 for PCM)
  view.setUint16(20, 1, true) // PCM audio format
  view.setUint16(22, 1, true) // 1 channel (mono)
  view.setUint32(24, sampleRate, true) // sample rate
  view.setUint32(28, sampleRate * 2, true) // byte rate (sampleRate * 1 * 16/8)
  view.setUint16(32, 2, true) // block align (1 * 16/8)
  view.setUint16(34, 16, true) // bits per sample
  // data sub-chunk
  writeString(view, 36, 'data')
  view.setUint32(40, numSamples * 2, true)

  // Write dual-tone ding-dong chime samples (659Hz + 880Hz)
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // Note 1: 659.25 Hz (E5) fading out
    const tone1 = Math.sin(2 * Math.PI * 659.25 * t) * Math.exp(-t * 6)
    // Note 2: 880 Hz (A5) starting slightly later
    const t2 = Math.max(0, t - 0.12)
    const tone2 = t >= 0.12 ? Math.sin(2 * Math.PI * 880 * t2) * Math.exp(-t2 * 5) : 0

    const mixed = (tone1 * 0.45 + tone2 * 0.55) * 0.85
    const clamped = Math.max(-1, Math.min(1, mixed))
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    view.setInt16(offset, pcm, true)
    offset += 2
  }

  // Convert buffer to base64
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

// Pre-initialize HTML5 audio element
function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!cachedAudioElement) {
    try {
      const wavUri = generateChimeWavUri()
      cachedAudioElement = new Audio(wavUri)
      cachedAudioElement.preload = 'auto'
    } catch {
      return null
    }
  }
  return cachedAudioElement
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx()
    } catch {
      return null
    }
  }
  return sharedAudioCtx
}

/**
 * Mobile browsers require Audio to be unlocked during a user gesture (tap/click).
 * Call this on any button click during the workout session.
 */
export function unlockAudio(): void {
  // 1. Unlock Web Audio API context
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  // 2. Unlock HTML5 Audio element on iOS / Android gesture
  const audio = getAudioElement()
  if (audio) {
    try {
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
          audio.pause()
          audio.currentTime = 0
        }).catch(() => {})
      }
    } catch {}
  }

  // 3. Play micro-silent buffer in Web Audio to warm up hardware
  if (ctx) {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
    } catch {}
  }
}

/**
 * Audio Keep-Alive: keeps the mobile audio pipeline active during rest countdown,
 * preventing iOS Safari and Chrome from suspending the AudioContext after 15-30s of inactivity.
 */
export function startAudioKeepAlive(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  if (keepAliveOscillator) return // already running

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    // Sub-audible gain (imperceptible silence, but keeps audio hardware thread active)
    gain.gain.setValueAtTime(0.00001, ctx.currentTime)
    osc.frequency.setValueAtTime(40, ctx.currentTime)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()

    keepAliveOscillator = osc
    keepAliveGain = gain
  } catch {}
}

export function stopAudioKeepAlive(): void {
  if (keepAliveOscillator) {
    try {
      keepAliveOscillator.stop()
      keepAliveOscillator.disconnect()
    } catch {}
    keepAliveOscillator = null
  }
  if (keepAliveGain) {
    try {
      keepAliveGain.disconnect()
    } catch {}
    keepAliveGain = null
  }
}

/**
 * Trigger mobile vibration pattern if supported
 */
export function triggerVibration(pattern: number | number[] = [300, 150, 300, 150, 450]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {}
  }
}

/**
 * Short pip for countdown 3, 2, 1
 */
export function playCountdownPip(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  } catch {}
}

/**
 * High-clarity dual-engine chime when rest ends (time to start set!)
 * Uses both HTML5 Audio (bypasses ambient mute) and Web Audio API + vibration + optional local Notification.
 */
export function playRestCompleteChime(): void {
  stopAudioKeepAlive()
  triggerVibration([300, 150, 300, 150, 450])

  // 1. Primary Engine: HTML5 Audio with synthesized chime WAV
  const audio = getAudioElement()
  if (audio) {
    try {
      audio.currentTime = 0
      audio.play().catch(() => {})
    } catch {}
  }

  // 2. Secondary Engine: Web Audio API synthesis
  const ctx = getAudioContext()
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      const now = ctx.currentTime

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(659.25, now)
      gain1.gain.setValueAtTime(0.4, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.35)

      // Note 2: A5 (880 Hz) - delayed for pleasant bell
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, now + 0.15)
      gain2.gain.setValueAtTime(0.5, now + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.15)
      osc2.stop(now + 0.65)
    } catch {}
  }

  // 3. Optional local browser Notification if user granted permissions
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Game Changer: Body 🎯', {
        body: '⏰ Отдых окончен! Время начинать следующий подход.',
        icon: '/favicon.svg'
      })
    } catch {}
  }
}

/**
 * Rewarding chime when a timed set or entire workout completes
 */
export function playSetCompleteChime(): void {
  triggerVibration([200, 100, 200])

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5 major triad

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.1
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.35, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + 0.35)
    })
  } catch {}
}

/**
 * Manual sound test for the user in the UI
 */
export function testSoundAlert(): void {
  unlockAudio()
  setTimeout(() => {
    playRestCompleteChime()
  }, 100)
}

export function resetAudioContextForTesting(): void {
  sharedAudioCtx = null
  cachedAudioElement = null
  keepAliveOscillator = null
  keepAliveGain = null
}
