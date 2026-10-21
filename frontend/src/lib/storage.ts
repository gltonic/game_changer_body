// Robust multi-tier storage: IndexedDB + LocalStorage + Cloud Sync (Supabase / Backend)
import type { DisciplineData } from '../components/MainDashboard'

const DB_NAME = 'gc_body_pwa_db'
const DB_VERSION = 1
const STORE_DISCIPLINES = 'disciplines'
const STORE_SETTINGS = 'settings'
const STORE_HISTORY = 'history'

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase
        if (!db.objectStoreNames.contains(STORE_DISCIPLINES)) {
          db.createObjectStore(STORE_DISCIPLINES)
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS)
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { autoIncrement: true })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

// Get or create a persistent device / guest user identifier
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'device_server'

  try {
    const existing = localStorage.getItem('gc_device_id')
    if (existing && existing.length > 5) {
      return existing
    }

    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `device_${crypto.randomUUID()}`
        : `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    localStorage.setItem('gc_device_id', newId)

    // Also persist to IndexedDB asynchronously
    openDB().then((db) => {
      if (!db) return
      const tx = db.transaction(STORE_SETTINGS, 'readwrite')
      tx.objectStore(STORE_SETTINGS).put(newId, 'device_id')
    }).catch(() => {})

    return newId
  } catch {
    return 'device_fallback'
  }
}

// Save disciplines to IndexedDB and LocalStorage
export async function saveLocalDisciplines(disciplines: Record<string, DisciplineData>): Promise<void> {
  // 1. LocalStorage
  try {
    localStorage.setItem('gc_body_disciplines', JSON.stringify(disciplines))
  } catch (err) {
    console.warn('LocalStorage save failed:', err)
  }

  // 2. IndexedDB (Survives Safari / PWA cache purges)
  try {
    const db = await openDB()
    if (!db) return
    const tx = db.transaction(STORE_DISCIPLINES, 'readwrite')
    const store = tx.objectStore(STORE_DISCIPLINES)
    store.put(disciplines, 'all_disciplines')
  } catch (err) {
    console.warn('IndexedDB save failed:', err)
  }
}

// Load disciplines from LocalStorage with IndexedDB fallback
export async function loadLocalDisciplines(): Promise<Record<string, DisciplineData>> {
  // 1. Try LocalStorage
  try {
    const raw = localStorage.getItem('gc_body_disciplines')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed
      }
    }
  } catch {}

  // 2. Try IndexedDB if LocalStorage was cleared
  try {
    const db = await openDB()
    if (db) {
      const result = await new Promise<any>((resolve) => {
        const tx = db.transaction(STORE_DISCIPLINES, 'readonly')
        const req = tx.objectStore(STORE_DISCIPLINES).get('all_disciplines')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      })

      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        // Restore back to LocalStorage
        try {
          localStorage.setItem('gc_body_disciplines', JSON.stringify(result))
        } catch {}
        return result
      }
    }
  } catch {}

  return {}
}

// Cloud API: Fetch disciplines for user or device
export async function fetchDisciplinesFromCloud(
  backendUrl: string,
  userId: string
): Promise<Record<string, DisciplineData> | null> {
  try {
    const res = await fetch(`${backendUrl}/api/disciplines/${encodeURIComponent(userId)}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.disciplines || null
  } catch (err) {
    console.warn('Cloud fetch failed, using offline cache:', err)
    return null
  }
}

// Cloud API: Save single discipline to cloud
export async function saveDisciplineToCloud(
  backendUrl: string,
  userId: string,
  discipline: string,
  data: DisciplineData
): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/api/disciplines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        discipline,
        maxBaseline: data.max_baseline,
        weightKg: data.weight_kg,
        totalWorkouts: data.total_workouts,
        currentWorkoutIndex: data.current_workout_index,
        trailData: data.trail_data
      })
    })
    return res.ok
  } catch (err) {
    console.warn('Cloud save failed, saved locally:', err)
    return false
  }
}

// Cloud API: Delete discipline
export async function deleteDisciplineFromCloud(
  backendUrl: string,
  userId: string,
  discipline: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${backendUrl}/api/disciplines/${encodeURIComponent(userId)}/${encodeURIComponent(discipline)}`,
      { method: 'DELETE' }
    )
    return res.ok
  } catch (err) {
    console.warn('Cloud delete failed:', err)
    return false
  }
}

// Cloud API: Migrate guest device data to authenticated user
export async function migrateGuestDataToUser(
  backendUrl: string,
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/api/disciplines/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId, toUserId })
    })
    return res.ok
  } catch (err) {
    console.warn('Cloud migration failed:', err)
    return false
  }
}

// Cloud API: Save workout history item
export async function saveHistoryToCloud(
  backendUrl: string,
  userId: string,
  item: {
    discipline: string
    workout_index: number
    completed_sets: number[]
    feedback: string
    completed_at?: string
  }
): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        discipline: item.discipline,
        workoutIndex: item.workout_index,
        completedSets: item.completed_sets,
        feedback: item.feedback,
        completedAt: item.completed_at
      })
    })
    return res.ok
  } catch (err) {
    console.warn('History save failed:', err)
    return false
  }
}
