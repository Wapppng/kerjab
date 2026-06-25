"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { KATEGORI_LIST, formatMenit, getJakartaDate, getKpiList, type KpiItem } from "@/lib/utils"
import type { TaskProfile, TaskRole } from "./task-types"

export function TaskCreateEditor({
  mode = "page",
  initialRole,
  initialDate,
  profiles = [],
  isAdmin = false,
  currentUserId,
  currentUserName,
  onClose,
  onCreated,
}: {
  mode?: "page" | "panel"
  initialRole?: TaskRole
  initialDate?: string
  profiles?: TaskProfile[]
  isAdmin?: boolean
  currentUserId?: string
  currentUserName?: string
  onClose?: () => void
  onCreated?: (taskId: string) => void
}) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [kpiLoading, setKpiLoading] = useState(!initialRole)
  const [userRole, setUserRole] = useState<TaskRole>(initialRole ?? "designer")
  const [kpiList, setKpiList] = useState<readonly KpiItem[]>(
    initialRole ? getKpiList(initialRole) : []
  )
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    kategori: "",
    kpi_level: "",
    kuantitas_output: "1",
    link_hasil: "",
  })
  const [taskDate, setTaskDate] = useState(initialDate ?? getJakartaDate())
  const [assigneeId, setAssigneeId] = useState(currentUserId ?? "")

  useEffect(() => {
    let active = true

    async function loadKpiForRole() {
      let selectedUserId = assigneeId
      let role = profiles.find((profile) => profile.id === selectedUserId)?.role === "video_editor"
        ? "video_editor" as const
        : initialRole

      if (!selectedUserId || !role) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (active) setKpiLoading(false)
          return
        }

        selectedUserId = selectedUserId || user.id
        if (!assigneeId && active) setAssigneeId(selectedUserId)

        const localProfile = profiles.find((profile) => profile.id === selectedUserId)
        if (localProfile) {
          role = localProfile.role === "video_editor" ? "video_editor" : "designer"
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", selectedUserId)
            .single()

          role = profile?.role === "video_editor" ? "video_editor" : "designer"
        }
      }

      role = role || "designer"

      const { data: config } = await supabase
        .from("kpi_config")
        .select("level, label, bobot, estimasi_waktu_menit")
        .eq("role", role)
        .order("level", { ascending: true })

      if (!active) return

      setUserRole(role)
      setKpiList(
        config?.length
          ? config.map((item) => ({
              level: item.level,
              label: item.label,
              bobot: item.bobot,
              estimasi: item.estimasi_waktu_menit,
            }))
          : getKpiList(role)
      )
      setKpiLoading(false)
    }

    loadKpiForRole()
    return () => {
      active = false
    }
  }, [assigneeId, initialRole, profiles, supabase])

  const selectedKpi = kpiList.find((item) => item.level === Number(form.kpi_level))
  const panelMode = mode === "panel"

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.judul.trim() || !form.kategori || !form.kpi_level || !selectedKpi || !assigneeId || !taskDate) return

    setError("")
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Sesi kamu sudah berakhir. Silakan masuk kembali.")
      setSaving(false)
      return
    }

    const { data, error: createError } = await supabase
      .from("tasks")
      .insert({
        user_id: isAdmin ? assigneeId : user.id,
        judul: form.judul.trim(),
        deskripsi: form.deskripsi || null,
        kategori: form.kategori,
        kpi_level: Number(form.kpi_level),
        kpi_bobot: selectedKpi.bobot,
        estimasi_waktu_menit: selectedKpi.estimasi,
        kuantitas_output: Number(form.kuantitas_output) || 1,
        link_hasil: form.link_hasil || null,
        task_date: taskDate,
      })
      .select("id")
      .single()

    if (createError || !data) {
      setError(`Task belum tersimpan: ${createError?.message || "Data task tidak ditemukan."}`)
      setSaving(false)
      return
    }

    if (onCreated) {
      onCreated(data.id)
      return
    }

    router.push("/dashboard/tasks")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={panelMode ? "flex h-full flex-col" : "max-w-2xl space-y-8"}>
      {!panelMode && (
        <Link href="/dashboard/tasks" className="notion-btn w-fit text-sm text-neutral-400 hover:text-neutral-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      )}

      <div className={panelMode ? "border-b border-[#e9e9e7] bg-white px-6 py-5" : "space-y-2"}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {panelMode && (
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                  <Plus className="h-4 w-4" />
                </span>
              )}
              <h1 className="text-2xl font-semibold tracking-tight">Task Baru</h1>
            </div>
            <p className="mt-2 text-sm text-neutral-400">
              KPI mengikuti role {userRole === "designer" ? "Desain Grafis" : "Videografer"}
            </p>
          </div>
          {panelMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="notion-btn shrink-0 text-neutral-500 hover:text-neutral-900"
              aria-label="Tutup form task baru"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          )}
        </div>
      </div>

      <div className={panelMode ? "flex-1 space-y-6 overflow-y-auto bg-white px-6 py-5" : "space-y-6"}>
        <div>
          <label className="text-sm font-medium text-neutral-700">Judul</label>
          <input
            autoFocus={panelMode}
            className="notion-input mt-1"
            placeholder="Contoh: Buat feed campaign Q3"
            value={form.judul}
            onChange={(event) => setForm({ ...form, judul: event.target.value })}
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Tanggal Task</label>
            <input
              type="date"
              className="notion-input mt-1"
              value={taskDate}
              onChange={(event) => setTaskDate(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Assignee</label>
            {isAdmin ? (
              <select
                className="notion-select mt-1 w-full"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                required
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            ) : (
              <div className="task-person-field mt-1">
                <span className="task-avatar">{(currentUserName || "P").charAt(0).toUpperCase()}</span>
                <span>{currentUserName || "Kamu"}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Dibuat Oleh</label>
          <div className="task-person-field mt-1">
            <span className="task-avatar">{(currentUserName || "P").charAt(0).toUpperCase()}</span>
            <span>{currentUserName || "Kamu"}</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Deskripsi</label>
          <textarea
            className="notion-input mt-1 min-h-[100px] resize-y"
            placeholder="Detail tugas (opsional)"
            value={form.deskripsi}
            onChange={(event) => setForm({ ...form, deskripsi: event.target.value })}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Kategori</label>
            <select
              className="notion-select mt-1 w-full"
              value={form.kategori}
              onChange={(event) => setForm({ ...form, kategori: event.target.value })}
              required
            >
              <option value="" disabled>Pilih kategori</option>
              {KATEGORI_LIST.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">KPI Level</label>
            <select
              className="notion-select mt-1 w-full"
              value={form.kpi_level}
              onChange={(event) => setForm({ ...form, kpi_level: event.target.value })}
              disabled={kpiLoading}
              required
            >
              <option value="" disabled>{kpiLoading ? "Memuat aturan KPI..." : "Pilih tingkat kesulitan"}</option>
              {kpiList.map((item) => (
                <option key={item.level} value={item.level}>{item.label} (bobot {item.bobot})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedKpi && (
          <div className="rounded-md border border-[#e5e5e5] px-4 py-3 text-sm text-neutral-600">
            Estimasi: <strong>{formatMenit(selectedKpi.estimasi)}</strong> &middot; Bobot: {selectedKpi.bobot}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Kuantitas Output</label>
            <input
              type="number"
              min="1"
              className="notion-input mt-1"
              value={form.kuantitas_output}
              onChange={(event) => setForm({ ...form, kuantitas_output: event.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Link Hasil</label>
            <input
              type="url"
              className="notion-input mt-1"
              placeholder="https://drive.google.com/..."
              value={form.link_hasil}
              onChange={(event) => setForm({ ...form, link_hasil: event.target.value })}
            />
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          Waktu selesai dicatat otomatis ketika status task diubah menjadi Selesai.
        </p>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className={panelMode ? "flex gap-2 border-t border-[#e9e9e7] bg-white px-6 py-4" : "flex gap-3 pt-2"}>
        <button type="submit" className="notion-btn notion-btn-primary" disabled={saving || kpiLoading}>
          {saving ? "Menyimpan..." : "Simpan Task"}
        </button>
        <button type="button" className="notion-btn" onClick={onClose ?? (() => router.back())}>
          Batal
        </button>
      </div>
    </form>
  )
}
