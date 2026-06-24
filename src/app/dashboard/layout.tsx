import { createClient } from "@/lib/supabase/server"
import DashboardSidebar from "./dashboard-sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single()
    : { data: null }

  return (
    <div className="min-h-svh bg-white lg:flex">
      <DashboardSidebar
        isAdmin={profile?.role === "admin"}
        profileName={profile?.name || user?.email || "Pengguna"}
        profileRole={profile?.role || "anggota"}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  )
}
