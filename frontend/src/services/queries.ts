import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { createAnalyticsClient, createScannerClient } from '@/services/api'
import type { AnalysisRequest, ReportRecord, ScanFilters, StartScanInput } from '@/types'

export const queryKeys = {
  scannerHealth: (url: string) => ['health', 'scanner', url] as const,
  analyticsHealth: (url: string) => ['health', 'analytics', url] as const,
  stats: (url: string) => ['stats', url] as const,
  scans: (url: string, filters: ScanFilters) => ['scans', url, filters] as const,
  latestAnalysis: (url: string) => ['analysis', 'latest', url] as const,
  modelRuns: (url: string) => ['ml', 'runs', url] as const,
  recommendations: (url: string) => ['recommendations', url] as const,
  reports: (url: string) => ['reports', url] as const,
}

export function useScanner() {
  const { settings } = useSettings()
  return useMemo(() => createScannerClient(settings.scannerBaseUrl), [settings.scannerBaseUrl])
}

export function useAnalytics() {
  const { settings } = useSettings()
  return useMemo(() => createAnalyticsClient(settings.analyticsBaseUrl), [settings.analyticsBaseUrl])
}

const ONLINE_POLL = 30_000
const OFFLINE_POLL = 15_000

export function useScannerHealth() {
  const scanner = useScanner()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.scannerHealth(settings.scannerBaseUrl),
    queryFn: ({ signal }) => scanner.health(signal),
    retry: 0,
    refetchInterval: settings.healthPolling
      ? (query) => (query.state.status === 'success' ? ONLINE_POLL : OFFLINE_POLL)
      : false,
    staleTime: 10_000,
  })
}

export function useAnalyticsHealth() {
  const analytics = useAnalytics()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.analyticsHealth(settings.analyticsBaseUrl),
    queryFn: ({ signal }) => analytics.health(signal),
    retry: 0,
    refetchInterval: settings.healthPolling
      ? (query) => (query.state.status === 'success' ? ONLINE_POLL : OFFLINE_POLL)
      : false,
    staleTime: 10_000,
  })
}

export function useDatasetStats() {
  const scanner = useScanner()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.stats(settings.scannerBaseUrl),
    queryFn: ({ signal }) => scanner.stats(signal),
    retry: 0,
    staleTime: 15_000,
  })
}

export function useScans(filters: ScanFilters) {
  const scanner = useScanner()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.scans(settings.scannerBaseUrl, filters),
    queryFn: ({ signal }) => scanner.scans(filters, signal),
    retry: 0,
    placeholderData: (previous) => previous,
  })
}

export function useStartScan() {
  const scanner = useScanner()
  const queryClient = useQueryClient()
  const { settings } = useSettings()
  return useMutation({
    mutationFn: (input: StartScanInput) => scanner.startScan(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scans', settings.scannerBaseUrl] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats(settings.scannerBaseUrl) })
    },
  })
}

export function useLatestAnalysis() {
  const analytics = useAnalytics()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.latestAnalysis(settings.analyticsBaseUrl),
    queryFn: ({ signal }) => analytics.latestAnalysis(signal),
    retry: 0,
  })
}

export function useRunAnalysis() {
  const analytics = useAnalytics()
  const queryClient = useQueryClient()
  const { settings } = useSettings()
  return useMutation({
    mutationFn: (request: AnalysisRequest) => analytics.runAnalysis(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.latestAnalysis(settings.analyticsBaseUrl) })
    },
  })
}

export function useModelRuns() {
  const analytics = useAnalytics()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.modelRuns(settings.analyticsBaseUrl),
    queryFn: ({ signal }) => analytics.modelRuns(signal),
    retry: 0,
  })
}

export function useRecommendations() {
  const analytics = useAnalytics()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.recommendations(settings.analyticsBaseUrl),
    queryFn: ({ signal }) => analytics.recommendations(signal),
    retry: 0,
  })
}

export function useReports() {
  const analytics = useAnalytics()
  const { settings } = useSettings()
  return useQuery({
    queryKey: queryKeys.reports(settings.analyticsBaseUrl),
    queryFn: ({ signal }) => analytics.reports(signal),
    retry: 0,
  })
}

export function useGenerateReport() {
  const analytics = useAnalytics()
  const queryClient = useQueryClient()
  const { settings } = useSettings()
  return useMutation({
    mutationFn: ({ title, format }: { title: string; format: ReportRecord['format'] }) =>
      analytics.generateReport(title, format),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports(settings.analyticsBaseUrl) })
    },
  })
}
