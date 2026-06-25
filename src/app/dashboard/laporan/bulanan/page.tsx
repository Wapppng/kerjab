import Link from "next/link"
import { CalendarRange, Filter, RotateCcw } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatMenit, getBulanName, KATEGORI_LIST } from "@/lib/utils"
import { LaporanClient } from "./laporan-client"
import type { ReportCategorySummary, ReportJudulSummary, ReportUserSummary } from "./laporan-types"

type ReportSearchParams = Promise<{
  bulan?: string | string[]
  tahun?: string | string[]
  user?: string | string[]
  kategori?: string | string[]
}>

type ProfileOption = {
  id: string
  name: string
}

type ReportTask = {
  user_id: string
  judul: string
  kategori: string
  kpi_level: number
  kpi_bobot: number | null
  estimasi_waktu_menit: number
  realisasi_waktu_menit: number | null
  kuantitas_output: number | null
  assignee: { name: string }[] | null
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function periodBoundaries(year: number, month: number) {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthText = String(month).padStart(2, "0")
  const nextMonthText = String(nextMonth).padStart(2, "0")

  return {
    start: new Date(`${year}-${monthText}-01T00:00:00+07:00`).toISOString(),
    end: new Date(`${nextYear}-${nextMonthText}-01T00:00:00+07:00`).toISOString(),
  }
}

function getUserSummary(summaries: Record<string, ReportUserSummary>, task: ReportTask, profileNameMap: Map<string, string>) {
  if (!summaries[task.user_id]) {
    summaries[task.user_id] = {
      name: profileNameMap.get(task.user_id) || task.assignee?.[0]?.name || "Tanpa Nama",
      totalCreated: 0,
      totalCompleted: 0,
      totalOutput: 0,
      totalKpi: 0,
      totalEstimasi: 0,
      totalRealisasi: 0,
      rasioRealisasi: 0,
    }
  }

  return summaries[task.user_id]
}

export default async function LaporanBulananPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"
  const query = await searchParams
  const now = new Date()
  const requestedMonth = Number(firstValue(query.bulan))
  const requestedYear = Number(firstValue(query.tahun))
  const month = requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : now.getMonth() + 1
  const year = requestedYear >= 2020 && requestedYear <= 2100 ? requestedYear : now.getFullYear()
  const selectedUser = isAdmin ? firstValue(query.user) || "" : user.id
  const selectedCategory = firstValue(query.kategori) || ""
  const validCategory = KATEGORI_LIST.some((category) => category.value === selectedCategory)
    ? selectedCategory
    : ""
  const period = periodBoundaries(year, month)

  let createdQuery = supabase
    .from("tasks")
    .select("user_id, judul, kategori, kpi_level, kpi_bobot, estimasi_waktu_menit, realisasi_waktu_menit, kuantitas_output, assignee:profiles!tasks_user_id_fkey(name)")
    .gte("created_at", period.start)
    .lt("created_at", period.end)

  let completedQuery = supabase
    .from("tasks")
    .select("user_id, judul, kategori, kpi_level, kpi_bobot, estimasi_waktu_menit, realisasi_waktu_menit, kuantitas_output, assignee:profiles!tasks_user_id_fkey(name)")
    .eq("status", "selesai")
    .gte("waktu_terselesaikan", period.start)
    .lt("waktu_terselesaikan", period.end)

  if (selectedUser) {
    createdQuery = createdQuery.eq("user_id", selectedUser)
    completedQuery = completedQuery.eq("user_id", selectedUser)
  }

  if (validCategory) {
    createdQuery = createdQuery.eq("kategori", validCategory)
    completedQuery = completedQuery.eq("kategori", validCategory)
  }

  const [createdResult, completedResult, profilesResult] = await Promise.all([
    createdQuery,
    completedQuery,
    supabase.from("profiles").select("id, name").order("name"),
  ])

  const createdTasks = (createdResult.data || []) as unknown as ReportTask[]
  const completedTasks = (completedResult.data || []) as unknown as ReportTask[]
  const allProfiles = (profilesResult.data || []) as ProfileOption[]
  const profileNameMap = new Map(allProfiles.map((p) => [p.id, p.name]))
  const taskByUser: Record<string, ReportUserSummary> = {}
  const taskByCategory: Record<string, ReportCategorySummary> = {}

  for (const task of createdTasks) {
    getUserSummary(taskByUser, task, profileNameMap).totalCreated += 1
  }

  for (const task of completedTasks) {
    const summary = getUserSummary(taskByUser, task, profileNameMap)
    const output = task.kuantitas_output || 1
    summary.totalCompleted += 1
    summary.totalOutput += output
    summary.totalKpi += task.kpi_bobot ?? task.kpi_level
    summary.totalEstimasi += task.estimasi_waktu_menit * output
    const realisasi = task.realisasi_waktu_menit || 0
    summary.totalRealisasi += realisasi

    if (!taskByCategory[task.kategori]) {
      taskByCategory[task.kategori] = { completedTasks: 0, totalOutput: 0 }
    }
    taskByCategory[task.kategori].completedTasks += 1
    taskByCategory[task.kategori].totalOutput += output
  }

  const kpiLevelSet = new Set<number>()

  const taskByJudul: Record<string, ReportJudulSummary> = {}
  for (const task of completedTasks) {
    const output = task.kuantitas_output || 1
    const key = `${task.kategori}::${task.judul}`
    if (!taskByJudul[key]) {
      taskByJudul[key] = {
        judul: task.judul,
        kategori: task.kategori,
        totalTasks: 0,
        totalEstimasi: 0,
        totalRealisasi: 0,
        totalKpi: 0,
        totalOutput: 0,
        outputByKpiLevel: {},
      }
    }
    taskByJudul[key].totalTasks += 1
    taskByJudul[key].totalEstimasi += task.estimasi_waktu_menit * output
    taskByJudul[key].totalRealisasi += task.realisasi_waktu_menit || 0
    taskByJudul[key].totalKpi += task.kpi_bobot ?? task.kpi_level
    taskByJudul[key].totalOutput += output
    taskByJudul[key].outputByKpiLevel[task.kpi_level] = (taskByJudul[key].outputByKpiLevel[task.kpi_level] || 0) + output
    kpiLevelSet.add(task.kpi_level)
  }

  const kpiLevels = Array.from(kpiLevelSet).sort((a, b) => a - b)

  const outputByKpiLevel: Record<number, number> = {}
  const kpiScoreByKpiLevel: Record<number, number> = {}
  for (const task of completedTasks) {
    const output = task.kuantitas_output || 1
    outputByKpiLevel[task.kpi_level] = (outputByKpiLevel[task.kpi_level] || 0) + output
    kpiScoreByKpiLevel[task.kpi_level] = (kpiScoreByKpiLevel[task.kpi_level] || 0) + (task.kpi_bobot ?? task.kpi_level)
  }

  for (const summary of Object.values(taskByUser)) {
    summary.rasioRealisasi = summary.totalEstimasi > 0 ? summary.totalRealisasi / summary.totalEstimasi : 0
  }

  const validSummaries = Object.values(taskByUser).filter((summary) => summary.totalEstimasi > 0)
  const overallRasioRealisasi = validSummaries.reduce((total, summary) => total + (summary.rasioRealisasi || 0), 0) / validSummaries.length || 0

  const totalKpi = completedTasks.reduce((total, task) => total + (task.kpi_bobot ?? task.kpi_level), 0)
  const totalOutput = completedTasks.reduce((total, task) => total + (task.kuantitas_output || 1), 0)
  const totalEstimasiMenit = completedTasks.reduce((total, task) => total + task.estimasi_waktu_menit * (task.kuantitas_output || 1), 0)
  const totalRealisasiMenit = completedTasks.reduce((total, task) => total + (task.realisasi_waktu_menit || 0), 0)

  // hitung hari kerja (Sen-Jum=1, Sab=0.5) dalam bulan ini
  let workingDays = 0
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) workingDays += 1
    else if (dayOfWeek === 6) workingDays += 0.5
  }
  const avgEstimasiJamPerHari = workingDays > 0 ? totalEstimasiMenit / 60 / workingDays : 0

  const years = Array.from({ length: 6 }, (_, index) => now.getFullYear() + 1 - index)
  if (!years.includes(year)) years.push(year)
  years.sort((left, right) => right - left)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-neutral-400">
            <CalendarRange className="h-4 w-4" />
            Laporan berdasarkan zona waktu Jakarta
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Laporan Bulanan</h1>
          <p className="mt-1 text-sm text-neutral-500">{getBulanName(month)} {year}</p>
        </div>
      </div>

      <form method="get" className="grid gap-3 rounded-lg border border-[#e5e5e5] bg-[#fbfbfa] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-neutral-500">
          Bulan
          <select name="bulan" defaultValue={month} className="notion-select mt-1 w-full">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{getBulanName(value)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-neutral-500">
          Tahun
          <select name="tahun" defaultValue={year} className="notion-select mt-1 w-full">
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label className="text-xs font-medium text-neutral-500">
            Karyawan
            <select name="user" defaultValue={selectedUser} className="notion-select mt-1 w-full">
              <option value="">Semua karyawan</option>
              {allProfiles.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs font-medium text-neutral-500">
          Kategori
          <select name="kategori" defaultValue={validCategory} className="notion-select mt-1 w-full">
            <option value="">Semua kategori</option>
            {KATEGORI_LIST.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="notion-btn notion-btn-primary flex-1 justify-center">
            <Filter className="h-4 w-4" /> Terapkan
          </button>
          <Link href="/dashboard/laporan/bulanan" className="notion-btn border border-[#e5e5e5] p-2" aria-label="Reset filter">
            <RotateCcw className="h-4 w-4" />
          </Link>
        </div>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Deskripsi Bulanan</h2>
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fbfbfa] p-4 space-y-3">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Total KPI Earned:</span>
              <span className="font-medium text-neutral-900">{totalKpi} (hanya dari task selesai)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Kuantitas Output:</span>
              <span className="font-medium text-neutral-900">{totalOutput} (berdasarkan kuanta output per task)</span>
            </div>
          </div>
        </div>
      </section>

      <LaporanClient 
        taskByUser={taskByUser} 
        taskByCategory={taskByCategory} 
        taskByJudul={taskByJudul}
        kpiLevels={kpiLevels}
        outputByKpiLevel={outputByKpiLevel}
        kpiScoreByKpiLevel={kpiScoreByKpiLevel}
        totalEstimasiMenit={totalEstimasiMenit}
        totalRealisasiMenit={totalRealisasiMenit}
        avgEstimasiJamPerHari={avgEstimasiJamPerHari}
        workingDays={workingDays}
        month={month} 
        year={year}
        overallRasioRealisasi={overallRasioRealisasi}
      />

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Rekap per Karyawan</h2>
        {Object.keys(taskByUser).length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#dededb] py-12 text-center text-sm text-neutral-400">
            Belum ada aktivitas pada periode dan filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="notion-table min-w-[920px]">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Dibuat</th>
                  <th>Selesai</th>
                  <th>Output</th>
                  <th>KPI</th>
                  <th>Estimasi</th>
                  <th>Realisasi</th>
                  <th>R. Realisasi</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(taskByUser).map(([userId, data]) => (
                  <tr key={userId}>
                    <td className="font-medium">{data.name}</td>
                    <td>{data.totalCreated}</td>
                    <td>{data.totalCompleted}</td>
                    <td>{data.totalOutput}</td>
                    <td>{data.totalKpi}</td>
                    <td className="text-neutral-500">{formatMenit(data.totalEstimasi)}</td>
                    <td className="text-neutral-500">{data.totalRealisasi ? formatMenit(data.totalRealisasi) : "-"}</td>
                    <td className="text-neutral-500">{data.rasioRealisasi ? (data.rasioRealisasi * 100).toFixed(1) + "%" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Output per Kategori</h2>
        {Object.keys(taskByCategory).length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#dededb] py-12 text-center text-sm text-neutral-400">
            Belum ada output selesai pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="notion-table min-w-[480px]">
              <thead>
                <tr><th>Kategori</th><th>Task Selesai</th><th>Kuantitas Output</th></tr>
              </thead>
              <tbody>
                {Object.entries(taskByCategory)
                  .sort(([, left], [, right]) => right.totalOutput - left.totalOutput)
                  .map(([category, data]) => (
                    <tr key={category}>
                      <td className="font-medium capitalize">{category.replaceAll("_", " ")}</td>
                      <td>{data.completedTasks}</td>
                      <td>{data.totalOutput}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Output per Judul</h2>
        {Object.keys(taskByJudul).length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#dededb] py-12 text-center text-sm text-neutral-400">
            Belum ada output selesai pada periode ini.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(
              Object.values(taskByJudul).reduce<Record<string, ReportJudulSummary[]>>((groups, entry) => {
                if (!groups[entry.kategori]) groups[entry.kategori] = []
                groups[entry.kategori].push(entry)
                return groups
              }, {})
            )
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([kategori, entries]) => (
                <div key={kategori}>
                  <h3 className="mb-2 text-sm font-semibold capitalize text-neutral-700">{kategori.replaceAll("_", " ")}</h3>
                  <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
                    <table className="notion-table min-w-[640px]">
                      <thead>
                        <tr>
                          <th>Judul</th>
                          <th className="text-center">Total Output</th>
                          {kpiLevels.map((level) => (
                            <th key={level} className="text-center">L{level}</th>
                          ))}
                          <th className="text-center">Total KPI</th>
                          <th className="text-center">Estimasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries
                          .sort((left, right) => right.totalOutput - left.totalOutput)
                          .map((data) => (
                            <tr key={`${data.kategori}::${data.judul}`}>
                              <td className="font-medium max-w-[240px] truncate" title={data.judul}>{data.judul}</td>
                              <td className="text-center">{data.totalOutput}</td>
                              {kpiLevels.map((level) => (
                                <td key={level} className="text-center text-neutral-600">{data.outputByKpiLevel[level] || "-"}</td>
                              ))}
                              <td className="text-center font-medium">{data.totalKpi}</td>
                              <td className="text-center text-neutral-500">{formatMenit(data.totalEstimasi)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
