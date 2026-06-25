export type ReportUserSummary = {
  name: string
  totalCreated: number
  totalCompleted: number
  totalOutput: number
  totalKpi: number
  totalEstimasi: number
  totalRealisasi: number
  rasioRealisasi?: number
}

export type ReportCategorySummary = {
  completedTasks: number
  totalOutput: number
}
