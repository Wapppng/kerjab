"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { FileDown, FileSpreadsheet } from "lucide-react"
import { formatMenit } from "@/lib/utils"
import type { ReportCategorySummary, ReportUserSummary } from "./laporan-types"

const CATEGORY_COLORS = ["#2383e2", "#8b5cf6", "#f97316", "#22c55e", "#6b7280"]

type AutoTableDocument = jsPDF & {
  lastAutoTable?: { finalY: number }
}

export function LaporanClient({
  taskByUser,
  taskByCategory,
  month,
  year,
  overallRasioRealisasi = 0,
}: {
  taskByUser: Record<string, ReportUserSummary>
  taskByCategory: Record<string, ReportCategorySummary>
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

  function exportExcel() {
    const workbook = XLSX.utils.book_new()
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
    XLSX.writeFile(workbook, `Laporan_${month}_${year}.xlsx`)
  }

  function exportPdf() {
    const document = new jsPDF()
    document.setFont("helvetica", "bold")
    document.setFontSize(16)
    document.text(`Laporan Bulanan - ${month}/${year}`, 14, 20)

    document.setFont("helvetica", "normal")
    document.setFontSize(12)
    document.text("Rekap per Karyawan", 14, 35)
    autoTable(document, {
      startY: 40,
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

    const finalY = ((document as AutoTableDocument).lastAutoTable?.finalY || 40) + 15
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

    document.save(`Laporan_${month}_${year}.pdf`)
  }

      return (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Rasio Realisasi", value: overallRasioRealisasi, description: "Rata-rata rasio realisasi terhadap estimasi" },
              { label: "KPI Earned", value: Object.values(taskByUser).reduce((total, data) => total + data.totalKpi, 0), description: "KPI hanya dari task selesai" },
              { label: "Jumlah Task selesai", value: Object.values(taskByUser).reduce((total, data) => total + data.totalCompleted, 0), description: "Jumlah tugas yang selesai" },
              { label: "Jumlah Task dibuat", value: Object.values(taskByUser).reduce((total, data) => total + data.totalCreated, 0), description: "Jumlah tugas yang dibuat" },
              { label: "Jumlah Output", value: Object.values(taskByUser).reduce((total, data) => total + data.totalOutput, 0), description: "Jumlah output yang dihasilkan" },
            ].map(({ label, value, description }) => (
              <div key={label} className="rounded-lg border border-[#e5e5e5] p-4">
                <div className="text-sm text-neutral-500">{label}</div>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {label === "Rasio Realisasi" ? (typeof value === 'number' ? (value * 100).toFixed(2) + '%' : '-') : 
                   typeof value === 'number' ? value : '-'}
                </p>
                <p className="mt-1 text-xs text-neutral-400">{description}</p>
              </div>
            ))}
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

