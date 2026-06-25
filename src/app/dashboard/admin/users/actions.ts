"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export type DeleteUserState = {
  status: "idle" | "success" | "error"
  message: string
}

export async function deleteUser(
  _prevState: DeleteUserState,
  formData: FormData
): Promise<DeleteUserState> {
  const userId = formData.get("userId")
  const transferToUserId = formData.get("transferToUserId")

  if (typeof userId !== "string" || !userId) {
    return { status: "error", message: "ID pengguna tidak valid." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { status: "error", message: "Sesi kamu sudah berakhir." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { status: "error", message: "Hanya admin yang bisa menghapus pengguna." }
  }

  const service = createServiceClient()

  if (typeof transferToUserId === "string" && transferToUserId) {
    const { error: transferError } = await service
      .from("tasks")
      .update({ created_by: transferToUserId })
      .eq("created_by", userId)

    if (transferError) {
      return { status: "error", message: `Gagal transfer task: ${transferError.message}` }
    }
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(userId)

  if (deleteError) {
    return { status: "error", message: `Gagal menghapus: ${deleteError.message}` }
  }

  revalidatePath("/dashboard/admin/users")
  return { status: "success", message: "Pengguna berhasil dihapus." }
}
