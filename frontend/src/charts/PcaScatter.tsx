import { formatDecimal, formatPercent } from '@/lib/format'
import type { PcaScore } from '@/types'

export const pcaClusterPalette = ['#22d3ee', '#8b7cf6', '#f59e6a', '#5ec8b0', '#f0567a', '#e7c15a']

/**
 * A two-component PCA score plot. Coordinates are plotted exactly as returned
 * by R; the browser only maps them into the SVG viewport.
 */
export function PcaScatter({
  scores,
  explainedVariance,
}: {
  scores: PcaScore[]
  explainedVariance: number[]
}) {
  if (scores.length === 0) {
    return <p className="text-[12px] text-ink-faint">No PCA scores were returned for this run.</p>
  }

  const width = 560
  const height = 250
  const padding = { top: 18, right: 18, bottom: 34, left: 46 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const xs = scores.map((score) => score.pc1)
  const ys = scores.map((score) => score.pc2)
  const rawXMin = Math.min(...xs)
  const rawXMax = Math.max(...xs)
  const rawYMin = Math.min(...ys)
  const rawYMax = Math.max(...ys)
  const xSpan = rawXMax - rawXMin || 1
  const ySpan = rawYMax - rawYMin || 1
  const xMin = rawXMin - xSpan * 0.12
  const xMax = rawXMax + xSpan * 0.12
  const yMin = rawYMin - ySpan * 0.12
  const yMax = rawYMax + ySpan * 0.12

  const clusterIds = Array.from(new Set(scores.map((score) => score.clusterId))).sort(
    (a, b) => a - b,
  )
  const colorFor = (clusterId: number) =>
    pcaClusterPalette[Math.max(0, clusterIds.indexOf(clusterId)) % pcaClusterPalette.length]

  const scaleX = (value: number) =>
    padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth
  const scaleY = (value: number) =>
    padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight

  const pc1Share = explainedVariance[0] ?? 0
  const pc2Share = explainedVariance[1] ?? 0
  const zeroX = xMin <= 0 && xMax >= 0 ? scaleX(0) : null
  const zeroY = yMin <= 0 && yMax >= 0 ? scaleY(0) : null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`PCA score plot: ${scores.length} scans on the first two components, coloured by K-means cluster.`}
    >
      <rect
        x={padding.left}
        y={padding.top}
        width={plotWidth}
        height={plotHeight}
        fill="rgba(255,255,255,0.012)"
        stroke="rgba(148,176,214,0.16)"
      />
      {[0.25, 0.5, 0.75].map((fraction) => (
        <g key={fraction}>
          <line
            x1={padding.left + plotWidth * fraction}
            x2={padding.left + plotWidth * fraction}
            y1={padding.top}
            y2={padding.top + plotHeight}
            stroke="rgba(148,176,214,0.09)"
            strokeDasharray="3 5"
          />
          <line
            x1={padding.left}
            x2={padding.left + plotWidth}
            y1={padding.top + plotHeight * fraction}
            y2={padding.top + plotHeight * fraction}
            stroke="rgba(148,176,214,0.09)"
            strokeDasharray="3 5"
          />
        </g>
      ))}
      {zeroX !== null ? (
        <line
          x1={zeroX}
          x2={zeroX}
          y1={padding.top}
          y2={padding.top + plotHeight}
          stroke="rgba(148,176,214,0.28)"
        />
      ) : null}
      {zeroY !== null ? (
        <line
          x1={padding.left}
          x2={padding.left + plotWidth}
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(148,176,214,0.28)"
        />
      ) : null}

      {scores.map((score) => {
        const cx = scaleX(score.pc1)
        const cy = scaleY(score.pc2)
        return (
          <g key={score.scanId}>
            <circle cx={cx} cy={cy} r={8} fill={colorFor(score.clusterId)} opacity={0.16} />
            <circle
              cx={cx}
              cy={cy}
              r={4.5}
              fill={colorFor(score.clusterId)}
              stroke="#07111f"
              strokeWidth={1.5}
            >
              <title>
                {`${score.domain} · Cluster ${score.clusterId} · PC1 ${formatDecimal(
                  score.pc1,
                  3,
                )} · PC2 ${formatDecimal(score.pc2, 3)}`}
              </title>
            </circle>
            <text
              x={cx}
              y={cy - 9}
              textAnchor="middle"
              className="fill-ink-muted font-mono text-[8px]"
            >
              {score.domain}
            </text>
          </g>
        )
      })}

      <text
        x={padding.left + plotWidth / 2}
        y={height - 6}
        textAnchor="middle"
        className="fill-ink-faint font-mono text-[9px]"
      >
        {`PC1 · ${formatPercent(pc1Share * 100)} variance`}
      </text>
      <text
        x={12}
        y={padding.top + plotHeight / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${padding.top + plotHeight / 2})`}
        className="fill-ink-faint font-mono text-[9px]"
      >
        {`PC2 · ${formatPercent(pc2Share * 100)} variance`}
      </text>
    </svg>
  )
}
