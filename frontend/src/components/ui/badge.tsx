import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-2xs font-medium uppercase tracking-[0.07em]',
  {
    variants: {
      tone: {
        neutral: 'border-line-strong bg-white/[0.03] text-ink-muted',
        cyan: 'border-cyan/25 bg-cyan-dim text-cyan-soft',
        violet: 'border-violet/25 bg-violet-dim text-violet-soft',
        critical: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical',
        serious: 'border-severity-serious/25 bg-severity-serious/10 text-severity-serious',
        moderate: 'border-severity-moderate/25 bg-severity-moderate/10 text-severity-moderate',
        minor: 'border-severity-minor/25 bg-severity-minor/10 text-severity-minor',
        success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
