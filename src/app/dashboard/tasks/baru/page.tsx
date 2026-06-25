import { createClient } from "@/lib/supabase/server"
import { toTaskRole } from "@/lib/utils"
import { TaskCreateEditor } from "../task-create-editor"
import type { TaskRole } from "../task-types"

export default async function NewTaskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"
  const userRole: TaskRole = toTaskRole(profile?.role)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, role")
    .order("name", { ascending: true })

  return (
    <TaskCreateEditor
      initialRole={userRole}
      profiles={profiles || []}
      isAdmin={isAdmin}
      currentUserId={user.id}
      currentUserName={profile?.name || user.email || "Pengguna"}
    />
  )
}
