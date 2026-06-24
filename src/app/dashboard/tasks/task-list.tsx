"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { KATEGORI_LIST, formatMenit } from "@/lib/utils"
import { Pencil, Trash2, ExternalLink, Search } from "lucide-react"

type Task = {
  id: string
  user_id: string
  judul: string
  deskripsi: string | null
  kategori: string
  kpi_level: number
  estimasi_waktu_menit: number
  realisasi_waktu_menit: number | null
  link_hasil: string | null
  status: string
  waktu_terselesaikan: string | null
  kuantitas_output: number | null
  created_at: string
  profiles?: { name: string } | null
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-yellow-400" },
  progress: { label: "Progress", dot: "bg-blue-400" },
  review: { label: "Review", dot: "bg-purple-400" },
  selesai: { label: "Selesai", dot: "bg-green-400" },
}

export function TaskList({ tasks, isAdmin, userId }: { tasks: Task[]; isAdmin: boolean; userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterKategori, setFilterKategori] = useState("all")

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false
    if (filterKategori !== "all" && t.kategori !== filterKategori) return false
    if (search && !t.judul.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleDelete(id: string) {
    if (!confirm("Hapus task ini?")) return
    await supabase.from("tasks").delete().eq("id", id)
    router.refresh()
  }

  async function handleStatusChange(task: Task, status: string) {
    const now = new Date()
    const updates: Record<string, unknown> = { status }
    if (status === "selesai" && task.status !== "selesai") {
      updates.selesai_at = now.toISOString()
      updates.waktu_terselesaikan = task.waktu_terselesaikan || now.toISOString()
    }
    await supabase.from("tasks").update(updates).eq("id", task.id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            className="notion-input pl-8"
            placeholder="Cari task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="notion-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="progress">Progress</option>
          <option value="review">Review</option>
          <option value="selesai">Selesai</option>
        </select>
        <select
          className="notion-select"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
        >
          <option value="all">Semua Kategori</option>
          {KATEGORI_LIST.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-neutral-400">
          Belum ada task
        </div>
      ) : (
        <div className="rounded-lg border border-[#e5e5e5] overflow-hidden">
          <table className="notion-table">
            <thead>
              <tr>
                <th className="w-3"></th>
                <th>Nama</th>
                <th>Kategori</th>
                <th>KPI</th>
                <th>Estimasi</th>
                <th>Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const statusMeta = STATUS_META[task.status] || STATUS_META.pending
                return (
                  <tr key={task.id}>
                    <td>
                      <span className={`notion-dot ${statusMeta.dot} ml-3`} />
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className="font-medium hover:text-[#0b6bff]"
                      >
                        {task.judul}
                      </Link>
                      {task.kuantitas_output && task.kuantitas_output > 1 && (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          x{task.kuantitas_output}
                        </span>
                      )}
                      {isAdmin && task.profiles?.name && (
                        <span className="ml-2 text-xs text-neutral-400">
                          {task.profiles.name}
                        </span>
                      )}
                    </td>
                    <td className="text-neutral-500 text-xs capitalize">{task.kategori.replace("_", " ")}</td>
                    <td className="text-neutral-500 text-xs">{task.kpi_level}</td>
                    <td className="text-neutral-500 text-xs">{formatMenit(task.estimasi_waktu_menit)}</td>
                    <td>
                      <select
                        className="notion-select text-xs"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="progress">Progress</option>
                        <option value="review">Review</option>
                        <option value="selesai">Selesai</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        {task.link_hasil && (
                          <a href={task.link_hasil} target="_blank" rel="noopener noreferrer" className="notion-btn p-1">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <Link href={`/dashboard/tasks/${task.id}`} className="notion-btn p-1">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        {(isAdmin || task.user_id === userId) && (
                          <button className="notion-btn p-1 text-neutral-400 hover:text-red-500" onClick={() => handleDelete(task.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
