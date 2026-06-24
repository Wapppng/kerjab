import { createClient } from "@/lib/supabase/server"
import { getBulanName, formatMenit } from "@/lib/utils"
import { LaporanClient } from "./laporan-client"

export default async function LaporanBulananPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  const now = new Date()
  const bulan = now.getMonth() + 1
  const tahun = now.getFullYear()
  const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`
  const endDate = new Date(tahun, bulan, 0).toISOString().split("T")[0]

  let query = supabase
    .from("tasks")
    .select("*, profiles(name)")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59.999Z")

  if (!isAdmin) query = query.eq("user_id", user.id)

  const { data: tasks } = await query

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("name")

  const taskByUser: Record<string, { name: string; total: number; selesai: number; totalKpi: number; totalEstimasi: number; totalRealisasi: number }> = {}
  const taskByKategori: Record<string, number> = {}
  const taskByStatus: Record<string, number> = {}

  for (const task of tasks || []) {
    const uid = task.user_id
    if (!taskByUser[uid]) {
      taskByUser[uid] = { name: task.profiles?.name || "Unknown", total: 0, selesai: 0, totalKpi: 0, totalEstimasi: 0, totalRealisasi: 0 }
    }
    taskByUser[uid].total++
    taskByUser[uid].totalKpi += task.kpi_level
    taskByUser[uid].totalEstimasi += task.estimasi_waktu_menit
    if (task.realisasi_waktu_menit) taskByUser[uid].totalRealisasi += task.realisasi_waktu_menit
    if (task.status === "selesai") taskByUser[uid].selesai++
    taskByKategori[task.kategori] = (taskByKategori[task.kategori] || 0) + 1
    taskByStatus[task.status] = (taskByStatus[task.status] || 0) + 1
  }

  const totalTask = tasks?.length || 0
  const totalSelesai = tasks?.filter((t) => t.status === "selesai").length || 0
  const totalKpi = tasks?.reduce((s, t) => s + t.kpi_level, 0) || 0

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Laporan Bulanan</h1>
        <p className="text-sm text-neutral-400">{getBulanName(bulan)} {tahun}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Total Task", value: totalTask },
          { label: "Selesai", value: totalSelesai },
          { label: "Total KPI", value: totalKpi },
          { label: "Sisa Task", value: totalTask - totalSelesai },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-[#e5e5e5] p-4">
            <div className="text-sm text-neutral-500">{label}</div>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <LaporanClient
        taskByUser={taskByUser}
        taskByKategori={taskByKategori}
        taskByStatus={taskByStatus}
        bulan={bulan}
        tahun={tahun}
        allProfiles={allProfiles || []}
        isAdmin={isAdmin}
      />

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Rekap per Karyawan</h2>
        <div className="rounded-lg border border-[#e5e5e5] overflow-hidden">
          <table className="notion-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Total</th>
                <th>Selesai</th>
                <th>Total KPI</th>
                <th>Estimasi</th>
                <th>Realisasi</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(taskByUser).map(([uid, data]) => (
                <tr key={uid}>
                  <td className="font-medium">{data.name}</td>
                  <td>{data.total}</td>
                  <td>{data.selesai}</td>
                  <td>{data.totalKpi}</td>
                  <td className="text-neutral-500">{formatMenit(data.totalEstimasi)}</td>
                  <td className="text-neutral-500">{data.totalRealisasi ? formatMenit(data.totalRealisasi) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Rekap per Kategori</h2>
        <div className="rounded-lg border border-[#e5e5e5] overflow-hidden">
          <table className="notion-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(taskByKategori)
                .sort(([, a], [, b]) => b - a)
                .map(([kategori, jumlah]) => (
                  <tr key={kategori}>
                    <td className="capitalize font-medium">{kategori.replace("_", " ")}</td>
                    <td>{jumlah}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
