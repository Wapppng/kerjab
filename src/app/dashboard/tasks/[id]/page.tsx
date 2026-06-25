import { createClient } from "@/lib/supabase/server"
import { TaskEditor, type TaskEditorData } from "../task-editor"
import type { TaskProfile, TaskRole } from "../task-types"

function firstProfile(profile?: TaskProfile | TaskProfile[] | null) {
  return Array.isArray(profile) ? profile[0] ?? null : profile ?? null
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"
  const [{ data: task }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_user_id_fkey(id, name, role), creator:profiles!tasks_created_by_fkey(id, name, role)")
      .eq("id", id)
      .single(),
    supabase
      .from("profiles")
      .select("id, name, role")
      .order("name", { ascending: true }),
  ])

  const taskData = task as (TaskEditorData & {
    assignee?: TaskProfile | TaskProfile[] | null
    creator?: TaskProfile | TaskProfile[] | null
  }) | null
  const assignee = firstProfile(taskData?.assignee)
  const creator = firstProfile(taskData?.creator)
  const initialRole: TaskRole = assignee?.role === "video_editor" ? "video_editor" : "designer"

  return (
    <TaskEditor
      taskId={id}
      mode="page"
      initialTask={taskData ?? undefined}
      initialRole={initialRole}
      assignee={assignee}
      creator={creator}
      profiles={profiles || []}
      isAdmin={isAdmin}
    />
  )
}
