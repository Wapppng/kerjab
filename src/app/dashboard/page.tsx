import Link from "next/link"
import { ArrowRight, CheckCircle2, CircleDot, ListTodo, PackageCheck, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

type DashboardTask = {
  id: string
  judul: string
  kategori: string
  status: string
  kpi_level: number
  kpi_bobot: number | null
  kuantitas_output: number | null
  created_at: string
  profiles: { name: string }[] | null
}

const statusMeta: Record<string, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-yellow-400" },
  progress: { label: "Dikerjakan", dot: "bg-blue-400" },
  review: { label: "Perlu Review", dot: "bg-purple-400" },
}

function currentMonthBoundaries() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  return {
    now,
    start: new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`).toISOString(),
    end: new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`).toISOString(),
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"
  const period = currentMonthBoundaries()
  const fields = "id, judul, kategori, status, kpi_level, kpi_bobot, kuantitas_output, created_at, profiles(name)"

  let createdQuery = supabase.from("tasks").select(fields).gte("created_at", period.start).lt("created_at", period.end)
  let completedQuery = supabase.from("tasks").select(fields).eq("status", "selesai").gte("waktu_terselesaikan", period.start).lt("waktu_terselesaikan", period.end)
  let focusQuery = supabase.from("tasks").select(fields).neq("status", "selesai").order("created_at", { ascending: false }).limit(8)

  if (!isAdmin) {
    createdQuery = createdQuery.eq("user_id", user.id)
    completedQuery = completedQuery.eq("user_id", user.id)
    focusQuery = focusQuery.eq("user_id", user.id)
  }

  const [createdResult, completedResult, focusResult] = await Promise.all([
    createdQuery,
    completedQuery,
    focusQuery,
  ])

  const createdTasks = (createdResult.data || []) as DashboardTask[]
  const completedTasks = (completedResult.data || []) as DashboardTask[]
  const focusTasks = (focusResult.data || []) as DashboardTask[]
  const totalKpi = completedTasks.reduce((total, task) => total + (task.kpi_bobot ?? task.kpi_level), 0)
  const totalOutput = completedTasks.reduce((total, task) => total + (task.kuantitas_output || 1), 0)

  const stats = [
    { label: "Masuk Bulan Ini", value: createdTasks.length, icon: ListTodo },
    { label: "Selesai Bulan Ini", value: completedTasks.length, icon: CheckCircle2 },
    { label: "Perlu Ditindak", value: focusTasks.length, icon: CircleDot },
    { label: "KPI Earned", value: totalKpi, icon: TrendingUp },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Halo, {profile?.name || "User"}</h1>
        <span className="text-sm text-neutral-400">
          — {period.now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-[#e5e5e5] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">{label}</span>
              <Icon className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium text-neutral-800">Fokus Sekarang</h2>
            <p className="mt-0.5 text-sm text-neutral-400">Pekerjaan terbuka yang membutuhkan tindakan.</p>
          </div>
          <Link href="/dashboard/tasks" className="notion-btn shrink-0 text-neutral-500">
            Lihat semua <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {focusTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#dededb] px-4 py-12 text-center">
            <PackageCheck className="mx-auto h-6 w-6 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-600">Tidak ada pekerjaan terbuka</p>
            <p className="mt-1 text-sm text-neutral-400">Semua pekerjaan sudah ditangani.</p>
            {!isAdmin && (
              <Link href="/dashboard/tasks/baru" className="notion-btn notion-btn-primary mt-4">Buat Task</Link>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#e5e5e5]">
            {focusTasks.map((task, index) => {
              const meta = statusMeta[task.status] || statusMeta.pending
              return (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-[#fbfbfa] ${index > 0 ? "border-t border-[#f0f0f0]" : ""}`}
                >
                  <span className={`notion-dot ${meta.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-neutral-800">{task.judul}</span>
                    <span className="mt-0.5 block truncate text-xs capitalize text-neutral-400">
                      {task.kategori.replaceAll("_", " ")}
                      {isAdmin && task.profiles?.[0]?.name ? ` · ${task.profiles[0].name}` : ""}
                    </span>
                  </span>
                  <span className="hidden text-xs text-neutral-400 sm:block">{meta.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <div className="rounded-lg bg-[#fbfbfa] px-4 py-3 text-sm text-neutral-500">
        Kuantitas output selesai bulan ini: <strong className="text-neutral-700">{totalOutput}</strong>
      </div>
    </div>
  )
}
