import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertTone = 'info' | 'success' | 'warning' | 'error'

const toneStyles: Record<AlertTone, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: 'border-cyan/20 bg-cyan/[0.055] text-cyan-soft',
    icon: <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />,
  },
  success: {
    wrapper: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
    icon: <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />,
  },
  warning: {
    wrapper: 'border-severity-moderate/25 bg-severity-moderate/[0.07] text-severity-moderate',
    icon: <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />,
  },
  error: {
    wrapper: 'border-severity-critical/25 bg-severity-critical/[0.07] text-severity-critical',
    icon: <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />,
  },
}

interface AlertProps {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  className?: string
  action?: ReactNode
}

export function Alert({ tone = 'info', title, children, className, action }: AlertProps) {
  const styles = toneStyles[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border px-4 py-3 text-[13px] leading-5', styles.wrapper, className)}
    >
      {styles.icon}
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-medium text-ink">{title}</p> : null}
        {children ? <div className="text-ink-muted">{children}</div> : null}
        {action ? <div className="pt-1.5">{action}</div> : null}
      </div>
    </div>
  )
}
