import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { toTaskRole } from "@/lib/utils"
import RoleSettings from "./role-settings"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role === "admin") redirect("/dashboard")

  const initialRole = toTaskRole(profile?.role)

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Atur role pekerjaan yang menentukan konfigurasi KPI kamu.
        </p>
      </div>

      <section className="rounded-lg border border-[#e5e5e5] p-6">
        <div className="mb-6">
          <h2 className="font-medium text-neutral-900">Role Pekerjaan</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Pilihan ini dapat diubah kembali kapan saja.
          </p>
        </div>
        <RoleSettings initialRole={initialRole} />
      </section>
    </div>
  )
}
