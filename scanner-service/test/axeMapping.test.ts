import test from 'node:test'
import assert from 'node:assert/strict'
import type { AxeResults } from 'axe-core'
import { countBySeverity, mapAxeResults, severityFromImpact, wcagTagsOf } from '../src/utils/axeMapping.js'

const results = {
  violations: [
    {
      id: 'color-contrast',
      impact: 'serious',
      description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
      help: 'Elements must meet minimum color contrast ratio thresholds',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/color-contrast',
      tags: ['cat.color', 'wcag2aa', 'wcag143'],
      nodes: [{ target: ['p.muted'] }, { target: ['#footer'] }, { target: ['a.cta'] }],
    },
    {
      id: 'image-alt',
      impact: 'critical',
      description: 'Ensures <img> elements have alternate text',
      help: 'Images must have alternate text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/image-alt',
      tags: ['cat.text-alternatives', 'wcag2a', 'wcag111'],
      nodes: [{ target: ['img.hero'] }],
    },
    {
      id: 'region',
      impact: 'moderate',
      description: 'Ensures all page content is contained by landmarks',
      help: 'All page content should be contained by landmarks',
      helpUrl: '',
      tags: ['cat.keyboard', 'best-practice'],
      nodes: [{ target: ['div.notice'] }, { target: ['div.banner'] }],
    },
    {
      id: 'heading-order',
      impact: null,
      description: 'Ensures the order of headings is semantically correct',
      help: 'Heading levels should only increase by one',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/heading-order',
      tags: ['cat.semantics', 'best-practice'],
      nodes: [],
    },
  ],
  passes: [],
  incomplete: [],
  inapplicable: [],
} as unknown as AxeResults

test('maps axe violations into aggregated issues with severity and WCAG tags', () => {
  const issues = mapAxeResults(results, 'https://example.com/')

  assert.equal(issues.length, 4)
  assert.deepEqual(
    issues.map((issue) => issue.ruleId),
    ['image-alt', 'color-contrast', 'region', 'heading-order'],
  )
  assert.deepEqual(
    issues.map((issue) => issue.impact),
    ['critical', 'serious', 'moderate', 'minor'],
  )

  const contrast = issues.find((issue) => issue.ruleId === 'color-contrast')
  assert.ok(contrast)
  assert.equal(contrast.nodeCount, 3)
  assert.deepEqual(contrast.wcagTags, ['wcag2aa', 'wcag143'])
  assert.equal(contrast.helpUrl?.includes('color-contrast'), true)
  assert.equal(contrast.pageUrl, 'https://example.com/')
  assert.deepEqual(contrast.elements, ['p.muted', '#footer', 'a.cta'])
})

test('counts by severity and keeps null impacts as minor', () => {
  const issues = mapAxeResults(results, 'https://example.com/')
  assert.deepEqual(countBySeverity(issues), { critical: 1, serious: 1, moderate: 1, minor: 1 })
  assert.equal(severityFromImpact(null), 'minor')
  assert.equal(severityFromImpact('unexpected'), 'minor')
})

test('filters tags to WCAG references only', () => {
  assert.deepEqual(wcagTagsOf(['cat.color', 'wcag2aa', 'wcag143', 'best-practice']), [
    'wcag2aa',
    'wcag143',
  ])
})

test('returns no issues for a clean result set', () => {
  const clean = { violations: [] } as unknown as AxeResults
  assert.deepEqual(mapAxeResults(clean, 'https://example.com/'), [])
})
