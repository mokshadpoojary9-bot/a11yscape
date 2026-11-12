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
  className,
}: ErrorStateProps) {
  const { message, hint } = describeError(error)
  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-severity-critical/20 bg-severity-critical/[0.045] px-5 py-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-severity-critical" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">{title}</p>
          <p className="mt-1.5 break-words text-[13px] leading-6 text-ink-muted">{message}</p>
          {hint ? <p className="mt-1 text-[12.5px] leading-5 text-ink-faint">{hint}</p> : null}
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3.5"
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
