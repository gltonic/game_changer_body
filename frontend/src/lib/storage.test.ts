import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getDeviceId,
  saveLocalDisciplines,
  loadLocalDisciplines,
  fetchDisciplinesFromCloud,
  saveDisciplineToCloud,
  migrateGuestDataToUser
} from './storage'

describe('Multi-tier Storage & Cloud Sync', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('generates and persists a stable deviceId in localStorage', () => {
    const id1 = getDeviceId()
    expect(id1).toMatch(/^device_/)

    const id2 = getDeviceId()
    expect(id2).toBe(id1)
  })

  it('saves and loads disciplines from local storage', async () => {
    const mockData = {
      pullups: {
        max_baseline: 12,
        total_workouts: 30,
        current_workout_index: 1,
        trail_data: []
      }
    }

    await saveLocalDisciplines(mockData as any)
    const loaded = await loadLocalDisciplines()
    expect(loaded.pullups).toBeDefined()
    expect(loaded.pullups.max_baseline).toBe(12)
  })

  it('fetches disciplines from cloud backend', async () => {
    const mockResponse = {
      disciplines: {
        pushups: {
          max_baseline: 30,
          total_workouts: 20,
          current_workout_index: 3,
          trail_data: []
        }
      }
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as any)

    const result = await fetchDisciplinesFromCloud('http://localhost:3001', 'device_123')
    expect(result).toEqual(mockResponse.disciplines)
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3001/api/disciplines/device_123')
  })

  it('saves discipline to cloud backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as any)

    const ok = await saveDisciplineToCloud(
      'http://localhost:3001',
      'device_123',
      'pullups',
      {
        max_baseline: 15,
        total_workouts: 40,
        current_workout_index: 0,
        trail_data: []
      } as any
    )

    expect(ok).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalled()
  })

  it('calls migrateGuestDataToUser on backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, migratedCount: 2 })
    } as any)

    const ok = await migrateGuestDataToUser('http://localhost:3001', 'device_old', 'auth_user_new')
    expect(ok).toBe(true)
  })
})
