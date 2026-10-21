import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  unlockAudio,
  startAudioKeepAlive,
  stopAudioKeepAlive,
  playCountdownPip,
  playRestCompleteChime,
  playSetCompleteChime,
  testSoundAlert,
  triggerVibration,
  resetAudioContextForTesting
} from './soundAlerts'

describe('Sound Alerts & Audio Keep-Alive Engine', () => {
  let mockAudioContextInstance: any

  beforeEach(() => {
    vi.restoreAllMocks()
    resetAudioContextForTesting()

    mockAudioContextInstance = {
      state: 'suspended',
      currentTime: 10,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      createBuffer: vi.fn().mockReturnValue({}),
      createBufferSource: vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn()
      }),
      createOscillator: vi.fn().mockReturnValue({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn()
      }),
      createGain: vi.fn().mockReturnValue({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn(),
        disconnect: vi.fn()
      })
    }

    class MockAudioContext {
      constructor() {
        return mockAudioContextInstance
      }
    }

    class MockAudio {
      preload = 'auto'
      currentTime = 0
      play = vi.fn().mockResolvedValue(undefined)
      pause = vi.fn()
    }

    ;(window as any).AudioContext = MockAudioContext
    ;(window as any).webkitAudioContext = MockAudioContext
    ;(window as any).Audio = MockAudio
  })

  it('unlocks audio context and resumes suspended state', () => {
    unlockAudio()
    expect(mockAudioContextInstance.resume).toHaveBeenCalled()
  })

  it('starts and stops audio keep alive', () => {
    startAudioKeepAlive()
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled()

    stopAudioKeepAlive()
  })

  it('plays countdown pip', () => {
    playCountdownPip()
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled()
  })

  it('plays rest complete chime with dual-engine and vibration', () => {
    const vibrateSpy = vi.fn()
    ;(navigator as any).vibrate = vibrateSpy

    playRestCompleteChime()

    expect(vibrateSpy).toHaveBeenCalledWith([300, 150, 300, 150, 450])
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled()
  })

  it('plays set complete chime chord', () => {
    playSetCompleteChime()
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled()
  })

  it('triggers manual test sound alert', () => {
    vi.useFakeTimers()
    testSoundAlert()
    vi.advanceTimersByTime(150)
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('triggers vibration with custom pattern', () => {
    const vibrateSpy = vi.fn()
    ;(navigator as any).vibrate = vibrateSpy
    triggerVibration([100, 50, 100])
    expect(vibrateSpy).toHaveBeenCalledWith([100, 50, 100])
  })
})
