import { useState, type FormEvent } from 'react'
import { Check, Database, RotateCcw, Server, SlidersHorizontal, Wifi } from 'lucide-react'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, FieldHint, Input, Label } from '@/components/ui/input'
import { ServiceStatusChip } from '@/components/feedback/StatusPill'
import { defaultSettings, useSettings } from '@/hooks/useSettings'
import { useAnalyticsHealth, useScannerHealth } from '@/services/queries'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const endpointSchema = z
  .string()
  .trim()
  .min(1, 'A base URL is required.')
  .url('Enter a valid URL, for example http://localhost:4000.')
  .refine((value) => /^https?:\/\//.test(value), 'Only http and https endpoints are supported.')

function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-3.5">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <p className="mt-0.5 text-[12px] leading-5 text-ink-faint">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-cyan/40 bg-cyan/80' : 'border-line-strong bg-midnight-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4.5 rounded-full bg-midnight-950 shadow transition-all duration-200',
            checked ? 'left-[1.15rem]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const scannerHealth = useScannerHealth()
  const analyticsHealth = useAnalyticsHealth()

  const [scannerUrl, setScannerUrl] = useState(settings.scannerBaseUrl)
  const [analyticsUrl, setAnalyticsUrl] = useState(settings.analyticsBaseUrl)
  const [errors, setErrors] = useState<{ scanner?: string; analytics?: string }>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const scannerResult = endpointSchema.safeParse(scannerUrl)
    const analyticsResult = endpointSchema.safeParse(analyticsUrl)
    const nextErrors = {
      scanner: scannerResult.success ? undefined : scannerResult.error.issues[0]?.message,
      analytics: analyticsResult.success ? undefined : analyticsResult.error.issues[0]?.message,
    }
    setErrors(nextErrors)
    if (!scannerResult.success || !analyticsResult.success) return

    updateSettings({
      scannerBaseUrl: scannerResult.data.replace(/\/+$/, ''),
      analyticsBaseUrl: analyticsResult.data.replace(/\/+$/, ''),
    })
    setSavedAt(new Date().toISOString())
  }

  function handleReset() {
    resetSettings()
    setScannerUrl(defaultSettings.scannerBaseUrl)
    setAnalyticsUrl(defaultSettings.analyticsBaseUrl)
    setErrors({})
    setSavedAt(null)
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Local endpoints and display preferences for this observatory installation. Settings are stored in this browser only; no credentials are collected."
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Service endpoints</CardTitle>
            <p className="text-[12.5px] text-ink-faint">
              Phase 1 ships with the expected local addresses. Adjust them if you run services on
              other ports.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSave} noValidate className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <Label htmlFor="scanner-endpoint" className="mb-0">
                    Scanner service base URL
                  </Label>
                  <ServiceStatusChip service="scanner" showLabel={false} />
                </div>
                <div className="relative">
                  <Server
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                    aria-hidden="true"
                  />
                  <Input
                    id="scanner-endpoint"
                    value={scannerUrl}
                    onChange={(event) => {
                      setScannerUrl(event.target.value)
                      if (errors.scanner) setErrors((current) => ({ ...current, scanner: undefined }))
                    }}
                    className="pl-9 font-mono text-[12.5px]"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.scanner)}
                  />
                </div>
                <FieldError>{errors.scanner}</FieldError>
                <FieldHint>Node service · Playwright · axe-core · SQLite</FieldHint>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <Label htmlFor="analytics-endpoint" className="mb-0">
                    R analytics base URL
                  </Label>
                  <ServiceStatusChip service="analytics" showLabel={false} />
                </div>
                <div className="relative">
                  <Database
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                    aria-hidden="true"
                  />
                  <Input
                    id="analytics-endpoint"
                    value={analyticsUrl}
                    onChange={(event) => {
                      setAnalyticsUrl(event.target.value)
                      if (errors.analytics) setErrors((current) => ({ ...current, analytics: undefined }))
                    }}
                    className="pl-9 font-mono text-[12.5px]"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.analytics)}
                  />
                </div>
                <FieldError>{errors.analytics}</FieldError>
                <FieldHint>R Plumber API · analysis, models and report generation</FieldHint>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <Button type="submit">
                  <Check aria-hidden="true" />
                  Save settings
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  <RotateCcw aria-hidden="true" />
                  Restore defaults
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    void scannerHealth.refetch()
                    void analyticsHealth.refetch()
                  }}
                >
                  <Wifi aria-hidden="true" />
                  Test connections
                </Button>
              </div>

              {savedAt ? (
                <p className="flex items-center gap-2 text-[12.5px] text-emerald-300" role="status">
                  <Check className="size-3.5" aria-hidden="true" />
                  Saved locally at {formatDateTime(savedAt)}.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interface</CardTitle>
              <p className="text-[12.5px] text-ink-faint">Applies immediately to this browser.</p>
            </CardHeader>
            <CardContent className="divide-y divide-line pt-0">
              <Toggle
                id="health-polling"
                checked={settings.healthPolling}
                onChange={(value) => updateSettings({ healthPolling: value })}
                label="Live service probing"
                description="Re-check scanner and R engine availability while the app is open."
              />
              <Toggle
                id="reduce-motion"
                checked={settings.reduceMotion}
                onChange={(value) => updateSettings({ reduceMotion: value })}
                label="Reduce motion"
                description="Disable orbit animation and dampen interface transitions."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Build information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {[
                ['Application', 'A11YSCAPE v0.1.0'],
                ['Release', 'Phase 1 — Foundation'],
                ['Frontend', 'React · TypeScript · Vite'],
                ['Storage', 'SQLite (Phase 3)'],
                ['Analysis', 'R Plumber (Phase 4)'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-ink-faint">{label}</span>
                  <span className="font-mono text-[11px] text-ink-muted">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                <span className="text-[12px] text-ink-faint">Status</span>
                <Badge tone="cyan">
                  <SlidersHorizontal className="size-3" aria-hidden="true" />
                  Phase 1
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Alert tone="info" title="Privacy and credentials">
        A11YSCAPE does not store API keys or personal data. Endpoint configuration lives in browser
        local storage, and all collected records remain in the local SQLite database inside this
        repository.
      </Alert>
    </div>
  )
}
