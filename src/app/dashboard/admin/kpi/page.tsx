import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { KPI_LIST, KPI_LIST_VIDEO } from "@/lib/utils"
import { KpiSettings } from "./kpi-settings"

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

  console.log("📊 KPI Config dari DB:", kpiConfig)

  const hasRoleColumn = kpiConfig && kpiConfig.length > 0 && "role" in kpiConfig[0]
  console.log("✅ Has Role Column:", hasRoleColumn)

  // Filter data dari database, atau gunakan fallback jika kosong
  const designerFromDb = kpiConfig?.filter((k) => k.role === "designer") ?? []
  const videoFromDb = kpiConfig?.filter((k) => k.role === "video_editor") ?? []

  console.log("👨‍🎨 Designer dari DB:", designerFromDb)
  console.log("🎬 Video Editor dari DB:", videoFromDb)

  const designerConfig = designerFromDb.length > 0
    ? designerFromDb.map((k) => ({ level: k.level, role: k.role, label: k.label, bobot: k.bobot, estimasi_waktu_menit: k.estimasi_waktu_menit }))
    : KPI_LIST.map((k) => ({ level: k.level, role: "designer" as const, label: k.label, bobot: k.bobot, estimasi_waktu_menit: k.estimasi }))

  const videoConfig = videoFromDb.length > 0
    ? videoFromDb.map((k) => ({ level: k.level, role: k.role, label: k.label, bobot: k.bobot, estimasi_waktu_menit: k.estimasi_waktu_menit }))
    : KPI_LIST_VIDEO.map((k) => ({ level: k.level, role: "video_editor" as const, label: k.label, bobot: k.bobot, estimasi_waktu_menit: k.estimasi }))

  console.log("📋 Designer Config untuk UI:", designerConfig)
  console.log("📋 Video Config untuk UI:", videoConfig)

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan KPI</h1>
        <p className="mt-1 text-sm text-neutral-400">Konfigurasi level KPI dan estimasi waktu per role</p>
      </div>
      <KpiSettings designerData={designerConfig} videoData={videoConfig} />
    </div>
  )
}
