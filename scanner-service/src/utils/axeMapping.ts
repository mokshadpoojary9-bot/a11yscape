import type { AxeResults, Result } from 'axe-core'
import { SEVERITY_ORDER, type ScanIssue, type Severity } from '../types.js'

/** axe impact values are already severity-shaped; unknown values degrade to minor. */
export function severityFromImpact(impact: string | null | undefined): Severity {
  switch (impact) {
    case 'critical':
    case 'serious':
    case 'moderate':
    case 'minor':
      return impact
    default:
      return 'minor'
  }
}

export function wcagTagsOf(tags: string[]): string[] {
  return tags.filter((tag) => tag.startsWith('wcag'))
}

/**
 * Convert axe results into one aggregated record per rule per page. `nodeCount`
 * preserves how many elements the rule flagged without duplicating every node.
 */
export function mapAxeResults(results: AxeResults, pageUrl: string): ScanIssue[] {
  return results.violations
    .map((violation: Result): ScanIssue => {
      const issue: ScanIssue = {
        ruleId: violation.id,
        impact: severityFromImpact(violation.impact),
        description: violation.help || violation.description,
        wcagTags: wcagTagsOf(violation.tags),
        nodeCount: violation.nodes.length,
        pageUrl,
      }
      if (violation.helpUrl) issue.helpUrl = violation.helpUrl
      const selectors = violation.nodes
        .flatMap((node) => node.target)
        .filter((target): target is string => typeof target === 'string')
        .map((target) => target.slice(0, 200))
        .slice(0, 10)
      if (selectors.length > 0) issue.elements = selectors
      return issue
    })
    .sort(
      (left, right) =>
        SEVERITY_ORDER.indexOf(left.impact) - SEVERITY_ORDER.indexOf(right.impact) ||
        left.ruleId.localeCompare(right.ruleId),
    )
}

export function countBySeverity(issues: ScanIssue[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const issue of issues) counts[issue.impact] += 1
  return counts
}
