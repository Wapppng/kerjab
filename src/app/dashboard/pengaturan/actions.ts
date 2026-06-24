"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type RoleFormState = {
  status: "idle" | "success" | "error"
  message: string
}

const allowedRoles = ["designer", "video_editor"] as const

export async function updateRole(
  _previousState: RoleFormState,
  formData: FormData
): Promise<RoleFormState> {
  const role = formData.get("role")

  if (typeof role !== "string" || !allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    return { status: "error", message: "Pilihan role tidak valid." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { status: "error", message: "Sesi kamu sudah berakhir. Silakan masuk kembali." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return { status: "error", message: "Profil tidak dapat ditemukan." }
  }

  if (profile.role === "admin") {
    return { status: "error", message: "Role admin tidak dapat diubah." }
  }

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id)
    .select("role")
    .single()

  if (error || !updatedProfile) {
    return { status: "error", message: "Gagal menyimpan role. Silakan coba lagi." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/pengaturan")

  const roleLabel = role === "designer" ? "Desain Grafis" : "Videografer"
  return { status: "success", message: `Role berhasil diubah menjadi ${roleLabel}.` }
}
