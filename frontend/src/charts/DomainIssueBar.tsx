import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import type { DomainSummary } from '@/types'

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line-strong bg-midnight-800 px-3 py-2 text-[12px] shadow-lift">
      <p className="mb-0.5 font-mono text-ink">{label}</p>
      <p className="text-ink-muted">
        Mean issues: <span className="num text-ink">{payload[0].value}</span>
      </p>
    </div>
  )
}

export function DomainIssueBar({ data }: { data: DomainSummary[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(148,176,214,0.08)" vertical={false} />
          <XAxis
            dataKey="domain"
            tickLine={false}
            axisLine={{ stroke: 'rgba(148,176,214,0.12)' }}
            tick={{ fill: '#9aa9c4', fontSize: 10.5 }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={54}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#697a97', fontSize: 11 }} width={48} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,176,214,0.05)' }} />
          <Bar dataKey="meanIssues" fill="#8b7cf6" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
