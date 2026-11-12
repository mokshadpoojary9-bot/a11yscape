import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { envAnalyticsUrl, envScannerUrl } from '@/services/api'

export interface AppSettings {
  scannerBaseUrl: string
  analyticsBaseUrl: string
  healthPolling: boolean
  reduceMotion: boolean
}

const STORAGE_KEY = 'a11yscape.settings.v1'

export const defaultSettings: AppSettings = {
  scannerBaseUrl: envScannerUrl,
  analyticsBaseUrl: envAnalyticsUrl,
  healthPolling: true,
  reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
}

function readStoredSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      scannerBaseUrl:
        typeof parsed.scannerBaseUrl === 'string' ? parsed.scannerBaseUrl : defaultSettings.scannerBaseUrl,
      analyticsBaseUrl:
        typeof parsed.analyticsBaseUrl === 'string'
          ? parsed.analyticsBaseUrl
          : defaultSettings.analyticsBaseUrl,
      healthPolling:
        typeof parsed.healthPolling === 'boolean' ? parsed.healthPolling : defaultSettings.healthPolling,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : defaultSettings.reduceMotion,
    }
  } catch {
    return defaultSettings
  }
}

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false'
  }, [settings])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const resetSettings = useCallback(() => setSettings(defaultSettings), [])

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside SettingsProvider')
  return context
}
