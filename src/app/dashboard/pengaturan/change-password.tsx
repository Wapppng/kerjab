"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { KeyRound } from "lucide-react"

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password baru minimal 6 karakter." })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Konfirmasi password tidak sesuai." })
      return
    }

    setLoading(true)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.email) {
      setMessage({ type: "error", text: "Sesi kamu sudah berakhir. Silakan masuk kembali." })
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setMessage({ type: "error", text: "Password saat ini tidak sesuai." })
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setMessage({ type: "error", text: `Gagal mengubah password: ${updateError.message}` })
      setLoading(false)
      return
    }

    setMessage({ type: "success", text: "Password berhasil diubah." })
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium text-neutral-700">Password Saat Ini</label>
        <input
          className="notion-input mt-1"
          type="password"
          placeholder="••••••••"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700">Password Baru</label>
        <input
          className="notion-input mt-1"
          type="password"
          placeholder="Minimal 6 karakter"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700">Konfirmasi Password Baru</label>
        <input
          className="notion-input mt-1"
          type="password"
          placeholder="Ketik ulang password baru"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>

      {message && (
        <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-red-500"}>
          {message.text}
        </p>
      )}

      <button type="submit" className="notion-btn notion-btn-primary" disabled={loading}>
        {loading ? "Menyimpan..." : "Simpan Password"}
      </button>
    </form>
  )
}
