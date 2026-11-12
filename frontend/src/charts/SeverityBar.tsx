import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import type { SeverityDistribution } from '@/types'

const severityColor: Record<string, string> = {
  critical: '#f0567a',
  serious: '#f59e6a',
  moderate: '#e7c15a',
  minor: '#5ec8b0',
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line-strong bg-midnight-800 px-3 py-2 text-[12px] shadow-lift">
      <p className="mb-0.5 font-medium capitalize text-ink">{label}</p>
      <p className="text-ink-muted">
        <span className="num text-ink">{payload[0].value}</span> violation
        {payload[0].value === 1 ? '' : 's'}
      </p>
    </div>
  )
}

export function SeverityBar({ data }: { data: SeverityDistribution[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap="28%">
          <CartesianGrid stroke="rgba(148,176,214,0.08)" vertical={false} />
          <XAxis
            dataKey="severity"
            tickLine={false}
            axisLine={{ stroke: 'rgba(148,176,214,0.12)' }}
            tick={{ fill: '#9aa9c4', fontSize: 11 }}
            tickFormatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: '#697a97', fontSize: 11 }}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,176,214,0.05)' }} />
          <Bar dataKey="count" radius={[5, 5, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.severity} fill={severityColor[entry.severity] ?? '#22d3ee'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
