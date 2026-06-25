import { createClient } from "@/lib/supabase/server"
import { TaskList } from "./task-list"

export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"
  const userRole = profile?.role === "video_editor" ? "video_editor" : "designer"

  const [tasksResult, profilesResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_user_id_fkey(id, name, role), creator:profiles!tasks_created_by_fkey(id, name, role)")
      .order("task_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, name, role")
      .order("name", { ascending: true }),
  ])

  return (
    <TaskList
      tasks={tasksResult.data || []}
      profiles={profilesResult.data || []}
      isAdmin={isAdmin}
      userId={user.id}
      userName={profile?.name || user.email || "Pengguna"}
      userRole={userRole}
    />
  )
}
