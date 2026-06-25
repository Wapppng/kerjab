import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
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

  const serviceClient = createServiceClient()
  const [tasksResult, profilesResult] = await Promise.all([
    serviceClient
      .from("tasks")
      .select("*, assignee:profiles!tasks_user_id_fkey(id, name, role), creator:profiles!tasks_created_by_fkey(id, name, role)")
      .order("task_date", { ascending: false })
      .order("created_at", { ascending: false }),
    serviceClient
      .from("profiles")
      .select("id, name, role")
      .order("name", { ascending: true }),
  ])

  if (tasksResult.error) {
    console.error("tasks error:", tasksResult.error)
  }
  if (profilesResult.error) {
    console.error("profiles error:", profilesResult.error)
  }

  const tasks = tasksResult.data || []
  const allProfiles = profilesResult.data || []

  return (
    <TaskList
      tasks={tasks}
      profiles={allProfiles}
      isAdmin={isAdmin}
      userId={user.id}
      userName={profile?.name || user.email || "Pengguna"}
      userRole={userRole}
    />
  )
}
