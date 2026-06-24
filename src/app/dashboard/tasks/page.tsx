import { createClient } from "@/lib/supabase/server"
import { Plus } from "lucide-react"
import Link from "next/link"
import { TaskList } from "./task-list"

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  let query = supabase
    .from("tasks")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false })

  if (!isAdmin) query = query.eq("user_id", user.id)

  const { data: tasks } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Task Harian</h1>
        <Link
          href="/dashboard/tasks/baru"
          className="notion-btn notion-btn-primary"
        >
          <Plus className="h-4 w-4" />
          Task Baru
        </Link>
      </div>

      <TaskList tasks={tasks || []} isAdmin={isAdmin} userId={user.id} />
    </div>
  )
}
