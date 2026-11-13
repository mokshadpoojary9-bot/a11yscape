import { cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactElement } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-refined focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[linear-gradient(135deg,#7ceefc_0%,#22d3ee_46%,#4f7cff_100%)] text-midnight-950 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_12px_32px_-14px_rgba(34,211,238,0.75)] hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_16px_38px_-14px_rgba(63,109,255,0.7)] active:translate-y-0 active:scale-[0.985]',
        secondary:
          'border border-line-strong bg-white/[0.035] text-ink backdrop-blur-sm hover:-translate-y-px hover:border-cyan/30 hover:bg-white/[0.055] hover:text-cyan-soft active:translate-y-0',
        outline:
          'border border-line-strong bg-transparent text-ink-muted hover:border-cyan/20 hover:bg-white/[0.035] hover:text-ink',
        ghost: 'text-ink-muted hover:bg-white/[0.04] hover:text-ink active:bg-white/[0.06]',
        subtle: 'bg-cyan-dim text-cyan-soft hover:bg-cyan/20',
        violet: 'bg-violet-dim text-violet-soft hover:bg-violet/20',
        danger: 'bg-severity-critical/12 text-severity-critical hover:bg-severity-critical/20',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  /** Render the single child element (e.g. a Router Link) with button styles. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, disabled, children, asChild = false, ...props },
  ref,
) {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>
    return cloneElement(child, {
      className: cn(buttonVariants({ variant, size }), className, child.props.className),
    })
  }

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
})
