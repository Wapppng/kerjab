"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, TriangleAlert } from "lucide-react"
import { deleteUser } from "./actions"
import type { UserWithTaskCount } from "./page"

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "designer", label: "Desain Grafis" },
  { value: "video_editor", label: "Videografer" },
  { value: "copywriter", label: "Copywriter" },
]

export function UserSettings({ users: initialUsers }: { users: UserWithTaskCount[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<UserWithTaskCount[]>(initialUsers)
  const [savingRole, setSavingRole] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [transferUser, setTransferUser] = useState<UserWithTaskCount | null>(null)
  const [transferToId, setTransferToId] = useState("")
  const [deleting, setDeleting] = useState(false)

  async function handleRoleChange(userId: string, newRole: string) {
    setSavingRole(userId)
    setError("")
    setSuccess("")

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)

    if (saveError) {
      setError(`Gagal mengubah role: ${saveError.message}`)
      setSavingRole(null)
      return
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
    setSavingRole(null)
    setSuccess("Role berhasil diperbarui!")
    router.refresh()
  }

  function openTransferDialog(user: UserWithTaskCount) {
    setError("")
    setSuccess("")
    setTransferUser(user)
    setTransferToId("")
  }

  async function handleTransferAndDelete() {
    if (!transferUser) return

    setDeleting(true)
    setError("")
    setSuccess("")

    const formData = new FormData()
    formData.set("userId", transferUser.id)
    if (transferToId) {
      formData.set("transferToUserId", transferToId)
    }

    const result = await deleteUser(
      { status: "idle", message: "" },
      formData
    )

    setDeleting(false)
    setTransferUser(null)

    if (result.status === "error") {
      setError(result.message)
    } else {
      setSuccess(result.message)
      setUsers((prev) => prev.filter((u) => u.id !== transferUser.id))
    }
  }

  const transferCandidates = users.filter((u) => u.id !== transferUser?.id)

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-600">{success}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-[#e5e5e5]">
        <table className="notion-table w-full">
          <thead>
            <tr className="border-b border-[#e9e9e7] text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3">Nama</th>
              <th className="hidden px-4 py-3 md:table-cell">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="hidden px-4 py-3 sm:table-cell">Bergabung</th>
              <th className="w-16 px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#f0f0f0] last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-600">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-neutral-800">{user.name}</span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-sm text-neutral-500 md:table-cell">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <select
                    className="notion-select text-sm"
                    value={user.role}
                    disabled={savingRole === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
                <td className="hidden px-4 py-3 text-sm text-neutral-500 sm:table-cell">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="notion-btn p-1.5 text-neutral-400 hover:text-red-500"
                    title="Hapus pengguna"
                    onClick={() => openTransferDialog(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-400">Belum ada pengguna terdaftar.</p>
      )}

      <Dialog open={!!transferUser} onOpenChange={(open) => !open && !deleting && setTransferUser(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <DialogTitle className="text-base">Hapus Pengguna</DialogTitle>
                <p className="text-sm text-neutral-500">
                  {transferUser?.task_count && transferUser.task_count > 0 ? (
                    <>
                      <strong>{transferUser.name}</strong> memiliki <strong>{transferUser.task_count}</strong> task
                      yang dibuat. Transfer task ini ke pengguna lain sebelum menghapus.
                    </>
                  ) : (
                    <>Yakin ingin menghapus <strong>{transferUser?.name}</strong>?</>
                  )}
                </p>
              </div>
            </div>
          </DialogHeader>

          {transferUser && transferUser.task_count > 0 && (
            <div className="pt-2">
              <label className="text-sm font-medium text-neutral-700">Transfer task ke</label>
              <select
                className="notion-select mt-1 w-full"
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
              >
                <option value="" disabled>Pilih pengguna</option>
                {transferCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {ROLE_OPTIONS.find((r) => r.value === c.role)?.label ?? c.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="notion-btn h-8 px-3 text-sm"
              onClick={() => setTransferUser(null)}
              disabled={deleting}
            >
              Batal
            </button>
            <button
              type="button"
              className="notion-btn h-8 px-3 text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              disabled={deleting || (!!transferUser?.task_count && !transferToId)}
              onClick={handleTransferAndDelete}
            >
              {deleting ? "Menghapus..." : transferUser?.task_count && transferUser.task_count > 0 ? "Transfer & Hapus" : "Hapus"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
