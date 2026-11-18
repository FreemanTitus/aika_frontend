// composables/useRiderTracker.ts
import { ref } from 'vue'
import { useCookie, useRuntimeConfig } from '#app'

const isTracking = ref(false)
const trackingStatus = ref('Idle')
const assignedHub = ref<string | null>(null)
const coverageError = ref<string | null>(null)
let watchId: number | null = null

export const useRiderTracker = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const authToken = useCookie('auth_token')

  const clearWatcher = () => {
    if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }

  const checkInitialStatus = async (
    onStatusLoaded?: (status: string, hubName?: string | null) => void
  ) => {
    if (!authToken.value || !import.meta.client) return
    try {
      const res: any = await $fetch(`${apiBase}/api/v1/logistics/tracking-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken.value}`,
          'ngrok-skip-browser-warning': 'true',
        },
      })

      if (res?.base_location) {
        assignedHub.value = res.base_location
      }

      if (res?.is_online) {
        startTracking(true, onStatusLoaded)
      } else {
        isTracking.value = false
        trackingStatus.value = 'Offline'
      }

      if (onStatusLoaded && res?.status) {
        onStatusLoaded(res.status, res?.base_location ?? assignedHub.value)
      }
    } catch (err) {
      console.error('Failed to check rider tracking status', err)
    }
  }

  const startTracking = (
    isResuming = false,
    onStatusChange?: (status: string, hubName?: string | null) => void
  ) => {
    if (!import.meta.client) return

    if (!authToken.value) {
      trackingStatus.value = 'Waiting for authentication...'
      return
    }

    if (!navigator.geolocation) {
      coverageError.value = 'Geolocation is not supported by your browser.'
      trackingStatus.value = 'GPS Unavailable'
      return
    }

    if (isTracking.value && !isResuming && watchId !== null) return

    clearWatcher()
    coverageError.value = null
    isTracking.value = true
    trackingStatus.value = 'Acquiring satellite lock...'

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (!authToken.value) return

        const lat = position.coords.latitude
        const lng = position.coords.longitude

        try {
          const res: any = await $fetch(`${apiBase}/api/v1/logistics/update-location`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken.value}`,
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            },
            body: { latitude: lat, longitude: lng },
          })

          if (res?.base_location) {
            assignedHub.value = res.base_location
          }

          coverageError.value = null
          trackingStatus.value = assignedHub.value
            ? `Live (${assignedHub.value}): ${lat.toFixed(4)}, ${lng.toFixed(4)}`
            : `Live: ${lat.toFixed(4)}, ${lng.toFixed(4)}`

          if (onStatusChange) {
            onStatusChange(res?.rider_status || 'available', assignedHub.value)
          }
        } catch (err: any) {
          console.error('Failed to sync GPS location to server', err)
          const statusCode = err?.status || err?.response?.status

          if (statusCode === 403) {
            // Outside regional coverage hub: stop watcher and revert to offline
            clearWatcher()
            isTracking.value = false
            coverageError.value =
              err?.data?.detail || 'Your current GPS location is outside your assigned coverage region.'
            trackingStatus.value = 'Out of Coverage Region'
            if (onStatusChange) {
              onStatusChange('offline', assignedHub.value)
            }
          } else if (statusCode === 401) {
            clearWatcher()
            isTracking.value = false
            trackingStatus.value = 'Auth session expired'
            if (onStatusChange) {
              onStatusChange('offline', assignedHub.value)
            }
          } else {
            trackingStatus.value = 'GPS Sync Retrying...'
          }
        }
      },
      (error) => {
        clearWatcher()
        isTracking.value = false
        coverageError.value = `Location access denied or unavailable: ${error.message}`
        trackingStatus.value = `Error: ${error.message}`
        if (onStatusChange) {
          onStatusChange('offline', assignedHub.value)
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    )
  }

  const stopTracking = async () => {
    clearWatcher()

    if (authToken.value) {
      try {
        await $fetch(`${apiBase}/api/v1/logistics/go-offline`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken.value}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        })
      } catch (err) {
        console.error('Failed to clear live rider tracking state', err)
      }
    }

    coverageError.value = null
    isTracking.value = false
    trackingStatus.value = 'Offline'
  }

  return {
    isTracking,
    trackingStatus,
    assignedHub,
    coverageError,
    startTracking,
    stopTracking,
    checkInitialStatus,
  }
}