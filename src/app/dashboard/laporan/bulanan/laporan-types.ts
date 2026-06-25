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

export type ReportJudulSummary = {
  judul: string
  kategori: string
  totalTasks: number
  totalEstimasi: number
  totalRealisasi: number
  totalKpi: number
  totalOutput: number
  outputByKpiLevel: Record<number, number>
}
