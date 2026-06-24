"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { FileDown, FileSpreadsheet } from "lucide-react"

const KATEGORI_COLORS = ["#0b6bff", "#8B5CF6", "#F97316", "#22C55E", "#6B7280"]

export function LaporanClient({
  taskByUser,
  taskByKategori,
  taskByStatus,
  bulan,
  tahun,
}: {
  taskByUser: Record<string, any>
  taskByKategori: Record<string, number>
  taskByStatus: Record<string, number>
  bulan: number
  tahun: number
  allProfiles: any[]
  isAdmin: boolean
}) {
  const userChartData = useMemo(() =>
    Object.entries(taskByUser).map(([uid, d]) => ({
      name: d.name,
      Total: d.total,
      Selesai: d.selesai,
    })), [taskByUser])

  const kategoriChartData = useMemo(() =>
    Object.entries(taskByKategori).map(([k, v]) => ({
      name: k.replace("_", " "),
      value: v,
    })), [taskByKategori])

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(
      Object.entries(taskByUser).map(([uid, d]) => ({
        Karyawan: d.name, Total: d.total, Selesai: d.selesai,
        "Total KPI": d.totalKpi, Estimasi: d.totalEstimasi, Realisasi: d.totalRealisasi,
      }))
    )
    XLSX.utils.book_append_sheet(wb, ws1, "Per Karyawan")

    const ws2 = XLSX.utils.json_to_sheet(
      Object.entries(taskByKategori).map(([k, v]) => ({
        Kategori: k.replace("_", " "), Jumlah: v,
      }))
    )
    XLSX.utils.book_append_sheet(wb, ws2, "Per Kategori")
    XLSX.writeFile(wb, `Laporan_${bulan}_${tahun}.xlsx`)
  }

  function exportPdf() {
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(`Laporan Bulanan - ${bulan}/${tahun}`, 14, 20)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.text("Rekap per Karyawan", 14, 35)
    autoTable(doc, {
      startY: 40,
      head: [["Karyawan", "Total", "Selesai", "Total KPI", "Estimasi", "Realisasi"]],
      body: Object.entries(taskByUser).map(([uid, d]) => [
        d.name, d.total, d.selesai, d.totalKpi,
        `${Math.floor(d.totalEstimasi / 60)}j ${d.totalEstimasi % 60}m`,
        d.totalRealisasi ? `${Math.floor(d.totalRealisasi / 60)}j ${d.totalRealisasi % 60}m` : "-",
      ]),
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: { fillColor: [55, 53, 47] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.text("Rekap per Kategori", 14, finalY)
    autoTable(doc, {
      startY: finalY + 5,
      head: [["Kategori", "Jumlah"]],
      body: Object.entries(taskByKategori).sort(([, a], [, b]) => b - a).map(([k, v]) => [k.replace("_", " "), v]),
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: { fillColor: [55, 53, 47] },
    })

    doc.save(`Laporan_${bulan}_${tahun}.pdf`)
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {userChartData.length > 0 && (
          <div className="rounded-lg border border-[#e5e5e5] p-5">
            <h3 className="mb-4 text-sm font-medium text-neutral-500">Total Task per Karyawan</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={userChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} tick={{ fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="Total" fill="#0b6bff" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Selesai" fill="#22C55E" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {kategoriChartData.length > 0 && (
          <div className="rounded-lg border border-[#e5e5e5] p-5">
            <h3 className="mb-4 text-sm font-medium text-neutral-500">Distribusi Kategori</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={kategoriChartData}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ""} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                >
                  {kategoriChartData.map((_, i) => (
                    <Cell key={i} fill={KATEGORI_COLORS[i % KATEGORI_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button className="notion-btn border border-[#e5e5e5]" onClick={exportExcel}>
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </button>
        <button className="notion-btn border border-[#e5e5e5]" onClick={exportPdf}>
          <FileDown className="h-4 w-4" />
          Export PDF
        </button>
      </div>
    </>
  )
}
