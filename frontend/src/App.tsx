import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { OverviewPage } from '@/pages/OverviewPage'
import { ScannerPage } from '@/pages/ScannerPage'
import { DatasetPage } from '@/pages/DatasetPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { MachineLearningPage } from '@/pages/MachineLearningPage'
import { UniversePage } from '@/pages/UniversePage'
import { RecommendationsPage } from '@/pages/RecommendationsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="scanner" element={<ScannerPage />} />
        <Route path="dataset" element={<DatasetPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="machine-learning" element={<MachineLearningPage />} />
        <Route path="universe" element={<UniversePage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
