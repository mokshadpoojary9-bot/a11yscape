import {
  BrainCircuit,
  Database,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Orbit,
  Radar,
  Settings,
  Sigma,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  description: string
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Observatory',
    items: [
      {
        label: 'Overview',
        to: '/',
        icon: LayoutDashboard,
        description: 'Mission control and live instrument status',
        end: true,
      },
      {
        label: 'Website Scanner',
        to: '/scanner',
        icon: Radar,
        description: 'Run Playwright and axe-core scans',
      },
      {
        label: 'Dataset Explorer',
        to: '/dataset',
        icon: Database,
        description: 'Inspect and filter collected scan records',
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Statistical Analysis',
        to: '/analysis',
        icon: Sigma,
        description: 'Descriptive statistics and WCAG distribution analysis in R',
      },
      {
        label: 'Machine Learning Lab',
        to: '/machine-learning',
        icon: BrainCircuit,
        description: 'Clustering and anomaly detection in R',
      },
      {
        label: 'Accessibility Universe',
        to: '/universe',
        icon: Orbit,
        description: 'Three-dimensional view of the dataset',
      },
    ],
  },
  {
    label: 'Output',
    items: [
      {
        label: 'Recommendation Centre',
        to: '/recommendations',
        icon: Lightbulb,
        description: 'Evidence-backed remediation priorities',
      },
      {
        label: 'Research Reports',
        to: '/reports',
        icon: FileText,
        description: 'Export datasets and generated reports',
      },
    ],
  },
]

export const settingsNav: NavItem = {
  label: 'Settings',
  to: '/settings',
  icon: Settings,
  description: 'Service endpoints and display preferences',
}

export const allNavItems: NavItem[] = [...navGroups.flatMap((group) => group.items), settingsNav]
