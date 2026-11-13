/**
 * Renders the correlation matrix exactly as returned by the R engine.
 * Colour intensity encodes the magnitude; the sign selects the hue.
 * No values are recomputed in the browser.
 */
export function CorrelationMatrix({
  variables,
  matrix,
}: {
  variables: string[]
  matrix: number[][]
}) {
  const values = matrix.flat().filter((value) => Number.isFinite(value))
  const maxAbs = Math.max(0.0001, ...values.map((value) => Math.abs(value)))

  function cellColor(value: number): string {
    if (!Number.isFinite(value)) return 'rgba(148, 176, 214, 0.06)'
    const alpha = 0.06 + 0.46 * (Math.abs(value) / maxAbs)
    return value < 0 ? `rgba(139, 124, 246, ${alpha})` : `rgba(34, 211, 238, ${alpha})`
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-[11px]">
          <caption className="sr-only">
            Correlation matrix across {variables.length} variables, as computed by R
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-28" />
              {variables.map((variable) => (
                <th
                  key={variable}
                  scope="col"
                  title={variable}
                  className="max-w-[76px] truncate px-1 pb-1 text-center font-medium text-ink-faint"
                >
                  {variable}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIndex) => (
              <tr key={variables[rowIndex] ?? rowIndex}>
                <th
                  scope="row"
                  title={variables[rowIndex]}
                  className="max-w-[112px] truncate pr-2 text-left font-medium text-ink-muted"
                >
                  {variables[rowIndex] ?? `Row ${rowIndex + 1}`}
                </th>
                {row.map((value, columnIndex) => (
                  <td
                    key={`${rowIndex}-${columnIndex}`}
                    title={`${variables[rowIndex] ?? rowIndex} × ${
                      variables[columnIndex] ?? columnIndex
                    }: ${Number.isFinite(value) ? value.toFixed(3) : 'not available'}`}
                    style={{ backgroundColor: cellColor(value) }}
                    className="num rounded-sm px-1.5 py-2 text-center text-[10.5px] text-ink"
                  >
                    {Number.isFinite(value) ? value.toFixed(2) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-ink-faint">
        <span className="font-mono uppercase tracking-[0.1em]">Coefficient</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: 'rgba(139, 124, 246, 0.5)' }} aria-hidden="true" />
          Negative
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-line-strong" aria-hidden="true" />
          0
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: 'rgba(34, 211, 238, 0.5)' }} aria-hidden="true" />
          Positive
        </span>
        <span className="ml-auto font-mono">range −1 … +1</span>
      </div>
    </div>
  )
}
