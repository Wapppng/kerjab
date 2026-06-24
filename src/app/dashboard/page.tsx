import { createClient } from "@/lib/supabase/server"
import { ListTodo, CheckCircle2, Clock, TrendingUp } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: allTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)

  const tasks = allTasks || []
  const totalTask = tasks.length
  const selesai = tasks.filter((t) => t.status === "selesai").length
  const pending = tasks.filter((t) => t.status === "pending").length
  const totalKpi = tasks.reduce((sum, t) => sum + t.kpi_level, 0)

  const todayTasks = tasks.filter((t) => {
    if (!t.waktu_terselesaikan) return false
    const d = new Date(t.waktu_terselesaikan)
    return d.toDateString() === today.toDateString()
  })

  const stats = [
    { label: "Total Task", value: totalTask, icon: ListTodo },
    { label: "Selesai", value: selesai, icon: CheckCircle2 },
    { label: "Pending", value: pending, icon: Clock },
    { label: "Total KPI", value: totalKpi, icon: TrendingUp },
  ]

  return (
    <div className="space-y-10">
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {profile?.name || "User"}
        </h1>
        <span className="text-sm text-neutral-400">
          — {today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
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

      {todayTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Waktu Terselesaikan Hari Ini</h2>
          <div className="space-y-1">
            {todayTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-[#e5e5e5] px-4 py-2.5 text-sm"
              >
                <span className="notion-dot bg-yellow-400" />
                <span className="flex-1">{task.judul}</span>
                <span className="text-neutral-400">
                  {new Date(task.waktu_terselesaikan).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
