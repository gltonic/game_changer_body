import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseWakeLockResult {
  isSupported: boolean
  isLocked: boolean
  requestLock: () => Promise<void>
  releaseLock: () => Promise<void>
}

/**
 * Screen Wake Lock hook: keeps the phone screen awake during active workout/rest.
 * Automatically re-acquires wake lock when user switches back to the app (visibilitychange).
 */
export function useWakeLock(enabled: boolean = true): UseWakeLockResult {
  const [isLocked, setIsLocked] = useState(false)
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const sentinelRef = useRef<any>(null)
  const enabledRef = useRef(enabled)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  const releaseLock = useCallback(async () => {
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release()
      } catch {
        // Sentinel may already have been released
      }
      sentinelRef.current = null
      setIsLocked(false)
    }
  }, [])

  const requestLock = useCallback(async () => {
    if (!isSupported || !enabledRef.current || sentinelRef.current) return

    try {
      const sentinel = await (navigator as any).wakeLock.request('screen')
      sentinelRef.current = sentinel
      setIsLocked(true)

      sentinel.addEventListener('release', () => {
        // If released by OS (e.g. system lock or tab switch)
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null
          setIsLocked(false)
        }
      })
    } catch {
      // Screen wake lock request failed (e.g. low battery mode or permission denied)
      setIsLocked(false)
    }
  }, [isSupported])

  useEffect(() => {
    if (enabled) {
      requestLock()
    } else {
      releaseLock()
    }

    return () => {
      releaseLock()
    }
  }, [enabled, requestLock, releaseLock])

  // Re-acquire lock when app comes back to foreground
  useEffect(() => {
    if (!isSupported) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        requestLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isSupported, requestLock])

  return {
    isSupported,
    isLocked,
    requestLock,
    releaseLock
  }
}
