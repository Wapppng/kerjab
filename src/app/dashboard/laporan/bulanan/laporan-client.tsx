"use client"

import { useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ChevronDown, ChevronRight, FileDown, FileSpreadsheet } from "lucide-react"
import { formatMenit } from "@/lib/utils"
import type { ReportCategorySummary, ReportJudulSummary, ReportUserSummary } from "./laporan-types"

const CATEGORY_COLORS = ["#2383e2", "#8b5cf6", "#f97316", "#22c55e", "#6b7280"]

type AutoTableDocument = jsPDF & {
  lastAutoTable?: { finalY: number }
}

function JudulGroup({
  kategori,
  entries,
  kpiLevels,
  formatMenit,
}: {
  kategori: string
  entries: ReportJudulSummary[]
  kpiLevels: number[]
  formatMenit: (menit: number | null) => string
}) {
  const [collapsed, setCollapsed] = useState(true)
  return (
    <div className="rounded-lg border border-[#e5e5e5]">
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-[#e5e5e5] bg-[#fbfbfa] px-4 py-2.5 text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
        <span className="font-medium capitalize text-neutral-700">{kategori.replaceAll("_", " ")}</span>
        <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{entries.length}</span>
      </button>
      {!collapsed && (
        <div className="overflow-x-auto">
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
      )}
    </div>
  )
}

export function LaporanClient({
  taskByUser,
  taskByCategory,
  taskByJudul,
  kpiLevels,
  outputByKpiLevel,
  kpiScoreByKpiLevel,
  totalEstimasiMenit,
  totalRealisasiMenit,
  avgEstimasiJamPerHari,
  workingDays,
  month,
  year,
  overallRasioRealisasi = 0,
}: {
  taskByUser: Record<string, ReportUserSummary>
  taskByCategory: Record<string, ReportCategorySummary>
  taskByJudul: Record<string, ReportJudulSummary>
  kpiLevels: number[]
  outputByKpiLevel: Record<number, number>
  kpiScoreByKpiLevel: Record<number, number>
  totalEstimasiMenit: number
  totalRealisasiMenit: number
  avgEstimasiJamPerHari: number
  workingDays: number
  month: number
  year: number
  overallRasioRealisasi?: number
}) {
  const userChartData = useMemo(() =>
    Object.values(taskByUser).map((data) => ({
      name: data.name,
      Dibuat: data.totalCreated,
      Selesai: data.totalCompleted,
    })), [taskByUser])

  const categoryChartData = useMemo(() =>
    Object.entries(taskByCategory).map(([category, data]) => ({
      name: category.replaceAll("_", " "),
      value: data.totalOutput,
    })), [taskByCategory])

  const outputLevelChartData = useMemo(() =>
    kpiLevels.map((level) => ({
      level: `L${level}`,
      value: outputByKpiLevel[level] || 0,
    })), [kpiLevels, outputByKpiLevel])

  const kpiLevelChartData = useMemo(() =>
    kpiLevels.map((level) => ({
      level: `L${level}`,
      value: kpiScoreByKpiLevel[level] || 0,
    })), [kpiLevels, kpiScoreByKpiLevel])

  function exportExcel() {
    const workbook = XLSX.utils.book_new()

    const totalKpiVal = Object.values(taskByUser).reduce((total, data) => total + data.totalKpi, 0)
    const totalOutputVal = Object.values(taskByUser).reduce((total, data) => total + data.totalOutput, 0)
    const totalSelesai = Object.values(taskByUser).reduce((total, data) => total + data.totalCompleted, 0)
    const totalDibuat = Object.values(taskByUser).reduce((total, data) => total + data.totalCreated, 0)

    const ringkasan: Record<string, string | number>[] = [
      { Metrik: "Rasio Realisasi", Nilai: typeof overallRasioRealisasi === 'number' ? (overallRasioRealisasi * 100).toFixed(2) + '%' : '-' },
      { Metrik: "KPI Earned", Nilai: totalKpiVal },
      { Metrik: "Jumlah Output", Nilai: totalOutputVal },
      { Metrik: "Jumlah Task Selesai", Nilai: totalSelesai },
      { Metrik: "Jumlah Task Dibuat", Nilai: totalDibuat },
      { Metrik: "Total Estimasi (menit)", Nilai: totalEstimasiMenit },
      { Metrik: "Total Realisasi (menit)", Nilai: totalRealisasiMenit },
      { Metrik: "Rata-rata Estimasi per Hari (jam)", Nilai: Number(avgEstimasiJamPerHari.toFixed(1)) },
      { Metrik: "Hari Kerja", Nilai: workingDays },
    ]
    const ringkasanSheet = XLSX.utils.json_to_sheet(ringkasan)
    XLSX.utils.book_append_sheet(workbook, ringkasanSheet, "Ringkasan")

    const employeeSheet = XLSX.utils.json_to_sheet(
      Object.values(taskByUser).map((data) => ({
        Karyawan: data.name,
        "Task Dibuat": data.totalCreated,
        "Task Selesai": data.totalCompleted,
        "Kuantitas Output": data.totalOutput,
        "KPI Earned": data.totalKpi,
        "Estimasi (menit)": data.totalEstimasi,
        "Realisasi (menit)": data.totalRealisasi,
        "Rasio Realisasi": data.rasioRealisasi ? Number((data.rasioRealisasi * 100).toFixed(1)) : 0,
      }))
    )
    XLSX.utils.book_append_sheet(workbook, employeeSheet, "Per Karyawan")

    const categorySheet = XLSX.utils.json_to_sheet(
      Object.entries(taskByCategory).map(([category, data]) => ({
        Kategori: category.replaceAll("_", " "),
        "Task Selesai": data.completedTasks,
        "Kuantitas Output": data.totalOutput,
      }))
    )
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Per Kategori")

    const judulSheet = XLSX.utils.json_to_sheet(
      Object.values(taskByJudul)
        .sort((left, right) => right.totalOutput - left.totalOutput)
        .map((data) => {
          const row: Record<string, string | number> = {
            Kategori: data.kategori.replaceAll("_", " "),
            Judul: data.judul,
            "Total Output": data.totalOutput,
          }
          for (const level of kpiLevels) {
            row[`L${level}`] = data.outputByKpiLevel[level] || 0
          }
          row["Total KPI"] = data.totalKpi
          row["Estimasi (menit)"] = data.totalEstimasi
          return row
        })
    )
    XLSX.utils.book_append_sheet(workbook, judulSheet, "Per Judul")

    const outputLevelSheet = XLSX.utils.json_to_sheet(
      kpiLevels.map((level) => ({
        Level: `L${level}`,
        "Kuantitas Output": outputByKpiLevel[level] || 0,
        Persentase: outputLevelChartData.length > 0
          ? Number(((outputByKpiLevel[level] || 0) / outputLevelChartData.reduce((s, d) => s + d.value, 0) * 100).toFixed(1))
          : 0,
      }))
    )
    XLSX.utils.book_append_sheet(workbook, outputLevelSheet, "Output per Level KPI")

    const kpiLevelSheet = XLSX.utils.json_to_sheet(
      kpiLevels.map((level) => ({
        Level: `L${level}`,
        "Skor KPI": kpiScoreByKpiLevel[level] || 0,
        Persentase: kpiLevelChartData.length > 0
          ? Number(((kpiScoreByKpiLevel[level] || 0) / kpiLevelChartData.reduce((s, d) => s + d.value, 0) * 100).toFixed(1))
          : 0,
      }))
    )
    XLSX.utils.book_append_sheet(workbook, kpiLevelSheet, "Skor KPI per Level")

    XLSX.writeFile(workbook, `Laporan_${month}_${year}.xlsx`)
  }

  function exportPdf() {
    const totalKpiVal = Object.values(taskByUser).reduce((total, data) => total + data.totalKpi, 0)
    const totalOutputVal = Object.values(taskByUser).reduce((total, data) => total + data.totalOutput, 0)
    const totalSelesai = Object.values(taskByUser).reduce((total, data) => total + data.totalCompleted, 0)
    const totalDibuat = Object.values(taskByUser).reduce((total, data) => total + data.totalCreated, 0)

    const document = new jsPDF()
    let cursorY = 20

    document.setFont("helvetica", "bold")
    document.setFontSize(16)
    document.text(`Laporan Bulanan - ${month}/${year}`, 14, cursorY)

    cursorY += 10
    document.setFont("helvetica", "normal")
    document.setFontSize(9)
    document.text(`Total Estimasi: ${formatMenit(totalEstimasiMenit)}  |  Total Realisasi: ${formatMenit(totalRealisasiMenit)}  |  Rata-rata/Hari: ${avgEstimasiJamPerHari.toFixed(1)} jam (${workingDays} hari kerja)`, 14, cursorY)

    cursorY += 8
    document.text(`Rasio Realisasi: ${typeof overallRasioRealisasi === 'number' ? (overallRasioRealisasi * 100).toFixed(2) + '%' : '-'}  |  KPI Earned: ${totalKpiVal}  |  Output: ${totalOutputVal}  |  Task: ${totalSelesai} selesai / ${totalDibuat} dibuat`, 14, cursorY)

    cursorY += 12
    document.setFontSize(12)
    document.text("Rekap per Karyawan", 14, cursorY)
    autoTable(document, {
      startY: cursorY + 5,
      head: [["Karyawan", "Dibuat", "Selesai", "Output", "KPI", "Estimasi", "Realisasi", "R. Realisasi"]],
      body: Object.values(taskByUser).map((data) => [
        data.name,
        data.totalCreated,
        data.totalCompleted,
        data.totalOutput,
        data.totalKpi,
        formatMenit(data.totalEstimasi),
        data.totalRealisasi ? formatMenit(data.totalRealisasi) : "-",
        data.rasioRealisasi ? (data.rasioRealisasi * 100).toFixed(1) + "%" : "-",
      ]),
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [55, 53, 47] },
    })

    let finalY = ((document as AutoTableDocument).lastAutoTable?.finalY || cursorY + 5) + 12
    document.setFontSize(12)
    document.text("Rekap per Kategori", 14, finalY)
    autoTable(document, {
      startY: finalY + 5,
      head: [["Kategori", "Task Selesai", "Kuantitas Output"]],
      body: Object.entries(taskByCategory)
        .sort(([, left], [, right]) => right.totalOutput - left.totalOutput)
        .map(([category, data]) => [category.replaceAll("_", " "), data.completedTasks, data.totalOutput]),
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: { fillColor: [55, 53, 47] },
    })

    finalY = ((document as AutoTableDocument).lastAutoTable?.finalY || finalY + 5) + 12
    document.setFontSize(12)
    document.text("Rekap per Judul", 14, finalY)
    autoTable(document, {
      startY: finalY + 5,
      head: [["Kategori", "Judul", "Total Output", ...kpiLevels.map((l) => `L${l}`), "Total KPI", "Estimasi"]],
      body: Object.values(taskByJudul)
        .sort((left, right) => right.totalOutput - left.totalOutput)
        .map((data) => [
          data.kategori.replaceAll("_", " "),
          data.judul,
          data.totalOutput,
          ...kpiLevels.map((level) => data.outputByKpiLevel[level] || "-"),
          data.totalKpi,
          formatMenit(data.totalEstimasi),
        ]),
      styles: { font: "helvetica", fontSize: 8 },
      headStyles: { fillColor: [55, 53, 47] },
    })

    finalY = ((document as AutoTableDocument).lastAutoTable?.finalY || finalY + 5) + 12
    const hasLevelData = outputLevelChartData.some((d) => d.value > 0) || kpiLevelChartData.some((d) => d.value > 0)
    if (hasLevelData) {
      const totalOutputAllLevels = outputLevelChartData.reduce((s, d) => s + d.value, 0)
      const totalKpiAllLevels = kpiLevelChartData.reduce((s, d) => s + d.value, 0)

      document.setFontSize(12)
      document.text("Output per Level KPI", 14, finalY)
      autoTable(document, {
        startY: finalY + 5,
        head: [["Level", "Kuantitas Output", "%"]],
        body: outputLevelChartData.map((d) => [
          d.level,
          d.value,
          totalOutputAllLevels > 0 ? ((d.value / totalOutputAllLevels) * 100).toFixed(1) + "%" : "-",
        ]),
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [55, 53, 47] },
      })

      finalY = ((document as AutoTableDocument).lastAutoTable?.finalY || finalY + 5) + 12
      document.setFontSize(12)
      document.text("Skor KPI per Level", 14, finalY)
      autoTable(document, {
        startY: finalY + 5,
        head: [["Level", "Skor KPI", "%"]],
        body: kpiLevelChartData.map((d) => [
          d.level,
          d.value,
          totalKpiAllLevels > 0 ? ((d.value / totalKpiAllLevels) * 100).toFixed(1) + "%" : "-",
        ]),
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [55, 53, 47] },
      })
    }

    document.save(`Laporan_${month}_${year}.pdf`)
  }

      return (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Rasio Realisasi", value: overallRasioRealisasi, description: "Rata-rata rasio realisasi terhadap estimasi", format: "pct" },
              { label: "KPI Earned", value: Object.values(taskByUser).reduce((total, data) => total + data.totalKpi, 0), description: "KPI hanya dari task selesai", format: "num" },
              { label: "Jumlah Output", value: Object.values(taskByUser).reduce((total, data) => total + data.totalOutput, 0), description: "Jumlah output yang dihasilkan", format: "num" },
              { label: "Jumlah Task selesai", value: Object.values(taskByUser).reduce((total, data) => total + data.totalCompleted, 0), description: "Jumlah tugas yang selesai", format: "num" },
            ].map(({ label, value, description, format }) => (
              <div key={label} className="rounded-lg border border-[#e5e5e5] p-4">
                <div className="text-sm text-neutral-500">{label}</div>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {format === "pct" ? (typeof value === 'number' ? (value * 100).toFixed(2) + '%' : '-') : 
                   typeof value === 'number' ? value : '-'}
                </p>
                <p className="mt-1 text-xs text-neutral-400">{description}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#e5e5e5] p-4">
              <div className="text-sm text-neutral-500">Total Estimasi</div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{formatMenit(totalEstimasiMenit)}</p>
              <p className="mt-1 text-xs text-neutral-400">Total estimasi waktu seluruh task selesai</p>
            </div>
            <div className="rounded-lg border border-[#e5e5e5] p-4">
              <div className="text-sm text-neutral-500">Total Realisasi</div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{formatMenit(totalRealisasiMenit)}</p>
              <p className="mt-1 text-xs text-neutral-400">Total realisasi waktu seluruh task selesai</p>
            </div>
            <div className="rounded-lg border border-[#e5e5e5] p-4">
              <div className="text-sm text-neutral-500">Rata-rata Estimasi per Hari</div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{avgEstimasiJamPerHari.toFixed(1)} jam</p>
              <p className="mt-1 text-xs text-neutral-400">Rata-rata estimasi per hari kerja ({workingDays} hari)</p>
            </div>
          </div>

          {(userChartData.length > 0 || categoryChartData.length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {userChartData.length > 0 && (
                <div className="min-w-0 rounded-lg border border-[#e5e5e5] p-4 sm:p-5">
                  <h3 className="mb-4 text-sm font-medium text-neutral-500">Beban Masuk vs Output Selesai</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={userChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} tick={{ fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="Dibuat" fill="#a3a3a3" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Selesai" fill="#2383e2" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {categoryChartData.length > 0 && (
                <div className="min-w-0 rounded-lg border border-[#e5e5e5] p-4 sm:p-5">
                  <h3 className="mb-4 text-sm font-medium text-neutral-500">Distribusi Kuantitas Output</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        dataKey="value"
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name || ""} ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                      >
                        {categoryChartData.map((item, index) => (
                          <Cell key={item.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {(outputLevelChartData.length > 0 || kpiLevelChartData.length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {outputLevelChartData.length > 0 && (
                <div className="min-w-0 rounded-lg border border-[#e5e5e5] p-4 sm:p-5">
                  <h3 className="mb-4 text-sm font-medium text-neutral-500">Kuantitas Output per Level KPI</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={outputLevelChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        dataKey="value"
                        label={({ level, percent }: { level?: string; percent?: number }) =>
                          `${level || ""} ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                      >
                        {outputLevelChartData.map((item, index) => (
                          <Cell key={item.level} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {kpiLevelChartData.length > 0 && (
                <div className="min-w-0 rounded-lg border border-[#e5e5e5] p-4 sm:p-5">
                  <h3 className="mb-4 text-sm font-medium text-neutral-500">Skor KPI per Level KPI</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={kpiLevelChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        dataKey="value"
                        label={({ level, percent }: { level?: string; percent?: number }) =>
                          `${level || ""} ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                      >
                        {kpiLevelChartData.map((item, index) => (
                          <Cell key={item.level} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          <section>
            <h2 className="mb-3 text-sm font-medium text-neutral-500">Output per Judul</h2>
            {Object.keys(taskByJudul).length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#dededb] py-12 text-center text-sm text-neutral-400">
                Belum ada output selesai pada periode ini.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  Object.values(taskByJudul).reduce<Record<string, ReportJudulSummary[]>>((groups, entry) => {
                    if (!groups[entry.kategori]) groups[entry.kategori] = []
                    groups[entry.kategori].push(entry)
                    return groups
                  }, {})
                )
                  .sort(([left], [right]) => left.localeCompare(right))
                  .map(([kategori, entries]) => (
                    <JudulGroup
                      key={kategori}
                      kategori={kategori}
                      entries={entries}
                      kpiLevels={kpiLevels}
                      formatMenit={formatMenit}
                    />
                  ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <button className="notion-btn border border-[#e5e5e5]" onClick={exportExcel} disabled={userChartData.length === 0}>
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </button>
            <button className="notion-btn border border-[#e5e5e5]" onClick={exportPdf} disabled={userChartData.length === 0}>
              <FileDown className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>
      )
  }

