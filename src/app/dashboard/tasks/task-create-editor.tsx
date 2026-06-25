"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Calendar, Clock, FileText, Layers, Link as LinkIcon, Plus, Tag, User, UserPlus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { KATEGORI_LIST, formatMenit, getJakartaDate, getKpiList, toTaskRole, type KpiItem } from "@/lib/utils"
import type { TaskProfile, TaskRole } from "./task-types"
import NotionEditor from "@/components/tiptap/notion-editor"

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
  const [judulSuggestions, setJudulSuggestions] = useState<Record<string, string[]>>({})
  const [showJudulSuggestions, setShowJudulSuggestions] = useState(false)
  const judulRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    async function fetchJudulSuggestions() {
      const { data } = await supabase
        .from("tasks")
        .select("judul, kategori")
        .order("created_at", { ascending: false })
        .limit(500)
      if (!active || !data) return
      const map: Record<string, string[]> = {}
      for (const row of data) {
        const cat = row.kategori || ""
        if (!map[cat]) map[cat] = []
        if (!map[cat].includes(row.judul)) map[cat].push(row.judul)
      }
      setJudulSuggestions(map)
    }
    fetchJudulSuggestions()
    return () => { active = false }
  }, [supabase])

  const filteredJudulSuggestions = form.kategori && judulSuggestions[form.kategori]
    ? judulSuggestions[form.kategori].filter((s) => !form.judul || s.toLowerCase().includes(form.judul.toLowerCase()))
    : []

  useEffect(() => {
    let active = true

    async function loadKpiForRole() {
      let selectedUserId = assigneeId
      let role: TaskRole | undefined = profiles.find((profile) => profile.id === selectedUserId)?.role as TaskRole | undefined
      role = role ?? initialRole

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
          role = toTaskRole(localProfile.role)
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", selectedUserId)
            .single()

          role = toTaskRole(profile?.role)
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
        user_id: assigneeId,
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

    window.location.href = "/dashboard/tasks"
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
              KPI mengikuti role {userRole === "designer" ? "Desain Grafis" : userRole === "video_editor" ? "Videografer" : "Copywriter"}
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
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-neutral-500" />Kategori</label>
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
            <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-neutral-500" />KPI Level</label>
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
            Estimasi: <strong>{formatMenit(selectedKpi.estimasi * (Number(form.kuantitas_output) || 1))}</strong> &middot; Bobot: {selectedKpi.bobot}
          </div>
        )}

        <div className="relative">
          <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-neutral-500" />Judul</label>
          <input
            ref={judulRef}
            autoFocus={panelMode}
            className="notion-input mt-1"
            placeholder="Contoh: Buat feed campaign Q3"
            value={form.judul}
            onChange={(event) => setForm({ ...form, judul: event.target.value })}
            onFocus={() => setShowJudulSuggestions(true)}
            onBlur={() => setTimeout(() => setShowJudulSuggestions(false), 200)}
            required
          />
          {showJudulSuggestions && filteredJudulSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
              {filteredJudulSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[#f7f7f5]"
                  onMouseDown={(e) => { e.preventDefault(); setForm({ ...form, judul: suggestion }); setShowJudulSuggestions(false) }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-neutral-500" />Tanggal Task</label>
            <input
              type="date"
              className="notion-input mt-1"
              value={taskDate}
              onChange={(event) => setTaskDate(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-neutral-500" />Assignee</label>
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
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5 text-neutral-500" />Dibuat Oleh</label>
          <div className="task-person-field mt-1">
            <span className="task-avatar">{(currentUserName || "P").charAt(0).toUpperCase()}</span>
            <span>{currentUserName || "Kamu"}</span>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-neutral-500" />Kuantitas Output</label>
            <input
              type="number"
              min="1"
              className="notion-input mt-1"
              value={form.kuantitas_output}
              onChange={(event) => setForm({ ...form, kuantitas_output: event.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5 text-neutral-500" />Link Hasil</label>
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

        <div>
          <label className="text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-neutral-500" />Deskripsi <span className="text-neutral-400 font-normal">(opsional)</span></label>
          <div className="mt-1">
            <NotionEditor value={form.deskripsi} onChange={(val) => setForm({ ...form, deskripsi: val })} placeholder="Ketik '/' untuk perintah, atau tulis deskripsi..." />
          </div>
        </div>

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
