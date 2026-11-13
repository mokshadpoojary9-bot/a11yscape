import { RefreshCw, TriangleAlert } from 'lucide-react'
import { ApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function describeError(error: unknown): { message: string; hint?: string } {
  if (error instanceof ApiError) {
    const hints: Record<ApiError['kind'], string> = {
      config: 'Set the service base URL in Settings.',
      network: 'This is expected until the service is running locally — see docs/phase-plan.md.',
      timeout: 'The service answered too slowly. Check its logs.',
      http: 'The service rejected the request. Check its logs for details.',
      parse: 'The service returned an unexpected response format.',
    }
    return { message: error.message, hint: hints[error.kind] }
  }
  if (error instanceof Error) return { message: error.message }
  return { message: 'An unknown error occurred.' }
}

interface ErrorStateProps {
  error: unknown
  title?: string
  onRetry?: () => void
  compact?: boolean
  className?: string
}

export function ErrorState({
  error,
  title = 'Could not load this view',
  onRetry,
  compact = false,
  className,
}: ErrorStateProps) {
  const { message, hint } = describeError(error)
  return (
    <div
      role="alert"
      className={cn(
        'relative overflow-hidden rounded-xl border border-severity-critical/20 bg-[linear-gradient(120deg,rgba(240,86,122,0.06),rgba(5,8,16,0.4))]',
        compact ? 'px-4 py-3.5' : 'px-5 py-5',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-severity-critical/60 to-transparent"
      />
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-severity-critical/20 bg-severity-critical/[0.07]">
          <TriangleAlert className="size-3.5 text-severity-critical" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium text-ink', compact ? 'text-[13px]' : 'text-[14px]')}>
            {title}
          </p>
          <p className="mt-1.5 break-words text-[12.5px] leading-5.5 text-ink-muted">{message}</p>
          {hint ? <p className="mt-1 text-[12px] leading-5 text-ink-faint">{hint}</p> : null}
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
              aria-label="Retry request"
            >
              <RefreshCw aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
