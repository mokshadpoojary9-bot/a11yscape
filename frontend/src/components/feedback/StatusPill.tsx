import { useAnalyticsHealth, useScannerHealth } from '@/services/queries'
import { cn } from '@/lib/utils'
import type { ServiceState } from '@/types'

const stateStyles: Record<ServiceState, { dot: string; text: string; label: string }> = {
  checking: { dot: 'bg-ink-faint', text: 'text-ink-faint', label: 'Checking' },
  online: { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'Online' },
  offline: { dot: 'bg-severity-critical', text: 'text-severity-critical', label: 'Offline' },
  degraded: { dot: 'bg-severity-moderate', text: 'text-severity-moderate', label: 'Degraded' },
}

export function StatusDot({ state, pulse = false }: { state: ServiceState; pulse?: boolean }) {
  const styles = stateStyles[state]
  return (
    <span className="relative inline-flex size-1.5">
      {pulse && state === 'online' ? (
        <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-50', styles.dot)} />
      ) : null}
      <span className={cn('relative inline-flex size-1.5 rounded-full', styles.dot)} />
    </span>
  )
}

interface ServiceStatusChipProps {
  service: 'scanner' | 'analytics'
  showLabel?: boolean
  className?: string
}

export function ServiceStatusChip({ service, showLabel = true, className }: ServiceStatusChipProps) {
  const scanner = useScannerHealth()
  const analytics = useAnalyticsHealth()
  const query = service === 'scanner' ? scanner : analytics
  const state: ServiceState = query.isPending ? 'checking' : query.isError ? 'offline' : 'online'
  const styles = stateStyles[state]
  const title =
    state === 'offline'
      ? `${service === 'scanner' ? 'Scanner service' : 'R analytics engine'} unreachable — ${
          query.error instanceof Error ? query.error.message : 'connection failed'
        }`
      : `${service === 'scanner' ? 'Scanner service' : 'R analytics engine'} ${styles.label.toLowerCase()}`

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-line bg-white/[0.025] px-2.5 py-1',
        className,
      )}
      title={title}
    >
      <StatusDot state={state} pulse />
      {showLabel ? (
        <span className="text-2xs font-medium uppercase tracking-[0.08em] text-ink-muted">
          {service === 'scanner' ? 'Scanner' : 'R Engine'}
        </span>
      ) : null}
      <span className={cn('text-2xs font-medium uppercase tracking-[0.08em]', styles.text)}>
        {styles.label}
      </span>
    </span>
  )
}
