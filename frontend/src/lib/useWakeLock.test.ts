import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWakeLock } from './useWakeLock'

describe('useWakeLock Hook', () => {
  let mockSentinel: { release: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockSentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn()
    }

    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: vi.fn().mockResolvedValue(mockSentinel)
      },
      writable: true,
      configurable: true
    })
  })

  it('detects wakeLock support and requests lock when enabled', async () => {
    const { result } = renderHook(() => useWakeLock(true))

    expect(result.current.isSupported).toBe(true)

    // Wait for the async lock request to resolve
    await act(async () => {
      await Promise.resolve()
    })

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')
    expect(result.current.isLocked).toBe(true)
  })

  it('releases lock when disabled or unmounted', async () => {
    const { result, unmount, rerender } = renderHook(({ enabled }) => useWakeLock(enabled), {
      initialProps: { enabled: true }
    })

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.isLocked).toBe(true)

    // Disable
    rerender({ enabled: false })
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockSentinel.release).toHaveBeenCalled()
    expect(result.current.isLocked).toBe(false)

    // Unmount
    unmount()
    expect(mockSentinel.release).toHaveBeenCalled()
  })
})
