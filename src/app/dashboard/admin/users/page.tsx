import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserSettings } from "./user-settings"

export type UserWithTaskCount = {
  id: string
  name: string
  email: string
  role: string
  created_at: string | null
  task_count: number
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: users } = await supabase
    .from("profiles")
    .select("id, name, email, role, created_at, tasks!tasks_created_by_fkey(count)")
    .order("created_at", { ascending: false })

  const usersWithCounts: UserWithTaskCount[] = (users ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email ?? "",
    role: u.role,
    created_at: u.created_at,
    task_count: (u.tasks as unknown as [{ count: number }] | null)?.[0]?.count ?? 0,
  }))

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
        <p className="mt-1 text-sm text-neutral-400">Kelola akun pengguna yang terdaftar</p>
      </div>
      <UserSettings users={usersWithCounts} />
    </div>
  )
}
