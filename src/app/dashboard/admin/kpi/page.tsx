import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { KPI_LIST, KPI_LIST_VIDEO } from "@/lib/utils"
import { KpiSettings } from "./kpi-settings"

const KPI_FALLBACKS: Record<string, readonly { level: number; label: string; bobot: number; estimasi: number }[]> = {
  designer: KPI_LIST,
  video_editor: KPI_LIST_VIDEO,
  copywriter: KPI_LIST,
}

const ROLE_LABELS: Record<string, string> = {
  designer: "Desainer Grafis",
  video_editor: "Video Editor",
  copywriter: "Copywriter",
}

export default async function AdminKpiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: kpiConfig } = await supabase
    .from("kpi_config")
    .select("*")
    .order("level", { ascending: true })

  const roleKeys = ["designer", "video_editor", "copywriter"] as const

  const configByRole: Record<string, { level: number; role: string; label: string; bobot: number; estimasi_waktu_menit: number }[]> = {}

  for (const key of roleKeys) {
    const fromDb = kpiConfig?.filter((k) => k.role === key) ?? []
    if (fromDb.length > 0) {
      configByRole[key] = fromDb.map((k) => ({
        level: k.level,
        role: k.role,
        label: k.label,
        bobot: k.bobot,
        estimasi_waktu_menit: k.estimasi_waktu_menit,
      }))
    } else {
      const fallback = KPI_FALLBACKS[key]
      configByRole[key] = fallback.map((k) => ({
        level: k.level,
        role: key,
        label: k.label,
        bobot: k.bobot,
        estimasi_waktu_menit: k.estimasi,
      }))
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan KPI</h1>
        <p className="mt-1 text-sm text-neutral-400">Konfigurasi level KPI dan estimasi waktu per role</p>
      </div>
      <KpiSettings configByRole={configByRole} roleKeys={[...roleKeys]} roleLabels={ROLE_LABELS} />
    </div>
  )
}
