"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Calendar, Clock, FileText, Layers, Link as LinkIcon, Plus, Tag, User, UserPlus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { KATEGORI_LIST, cn, formatMenit, getJakartaDate, getKpiList, toTaskRole, type KpiItem } from "@/lib/utils"
import type { TaskProfile, TaskRole } from "./task-types"
import NotionEditor from "@/components/tiptap/notion-editor"
import { NotionSelect } from "@/components/ui/notion-select"

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
    <div className={panelMode ? "flex h-full min-h-0 flex-col" : "max-w-2xl space-y-8"}>
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

      <form id="task-create-form" onSubmit={handleSubmit} className={cn(panelMode ? "min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5" : "")}>
        <div className="space-y-3">
          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><Tag className="h-3.5 w-3.5 text-neutral-500" />Kategori</label>
            <div className="flex-1 min-w-0">
              <NotionSelect className="w-full sm:mt-0" value={form.kategori} onChange={(value) => setForm({ ...form, kategori: value })} options={KATEGORI_LIST.map((item) => ({ value: item.value, label: item.label }))} placeholder="Pilih kategori" />
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><BarChart3 className="h-3.5 w-3.5 text-neutral-500" />KPI Level</label>
            <div className="flex-1 min-w-0">
              <NotionSelect className="w-full sm:mt-0" value={form.kpi_level} onChange={(value) => setForm({ ...form, kpi_level: value })} options={kpiList.map((item) => ({ value: String(item.level), label: `${item.label} (bobot ${item.bobot})` }))} placeholder={kpiLoading ? "Memuat aturan KPI..." : "Pilih tingkat kesulitan"} disabled={kpiLoading} />
              {selectedKpi && (
                <p className="mt-1 text-xs text-neutral-400">
                  Estimasi: <span className="text-neutral-500">{formatMenit(selectedKpi.estimasi * (Number(form.kuantitas_output) || 1))}</span>
                  &middot; Bobot: <span className="text-neutral-500">{selectedKpi.bobot}</span>
                </p>
              )}
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><FileText className="h-3.5 w-3.5 text-neutral-500" />Judul</label>
            <div className="flex-1 min-w-0 relative">
              <input
                ref={judulRef}
                autoFocus={panelMode}
                className="notion-input sm:mt-0"
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
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><Calendar className="h-3.5 w-3.5 text-neutral-500" />Tanggal Task</label>
            <div className="flex-1 min-w-0">
              <input
                type="date"
                className="notion-input sm:mt-0"
                value={taskDate}
                onChange={(event) => setTaskDate(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><User className="h-3.5 w-3.5 text-neutral-500" />Assignee</label>
            <div className="flex-1 min-w-0">
              <NotionSelect className="w-full sm:mt-0" value={assigneeId} onChange={setAssigneeId} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} placeholder="Pilih assignee" />
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <div className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><UserPlus className="h-3.5 w-3.5 text-neutral-500" />Dibuat Oleh</div>
            <div className="flex-1 min-w-0">
              <div className="task-person-field sm:mt-0">
                <span className="task-avatar">{(currentUserName || "P").charAt(0).toUpperCase()}</span>
                <span>{currentUserName || "Kamu"}</span>
              </div>
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><Layers className="h-3.5 w-3.5 text-neutral-500" />Output</label>
            <div className="flex-1 min-w-0">
              <input
                type="number"
                min="1"
                className="notion-input sm:mt-0"
                value={form.kuantitas_output}
                onChange={(event) => setForm({ ...form, kuantitas_output: event.target.value })}
              />
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><LinkIcon className="h-3.5 w-3.5 text-neutral-500" />Link Hasil</label>
            <div className="flex-1 min-w-0">
              <input
                type="url"
                className="notion-input sm:mt-0"
                placeholder="https://drive.google.com/..."
                value={form.link_hasil}
                onChange={(event) => setForm({ ...form, link_hasil: event.target.value })}
              />
            </div>
          </div>

          <p className="text-xs text-neutral-400 sm:ml-[130px]">
            Status dan waktu selesai bisa diatur nanti saat mengedit task.
          </p>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <div className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><FileText className="h-3.5 w-3.5 text-neutral-500" />Deskripsi</div>
            <div className="flex-1 min-w-0">
              <NotionEditor value={form.deskripsi} onChange={(val) => setForm({ ...form, deskripsi: val })} placeholder="Ketik '/' untuk perintah, atau tulis deskripsi..." />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </form>

      <div className={cn("flex gap-2", panelMode ? "border-t border-[#e9e9e7] bg-white px-6 py-4" : "pt-2")}>
        <button type="submit" form="task-create-form" className="notion-btn notion-btn-primary" disabled={saving || kpiLoading}>
          {saving ? "Menyimpan..." : "Simpan Task"}
        </button>
        <button type="button" className="notion-btn" onClick={onClose ?? (() => router.back())}>
          Batal
        </button>
      </div>
    </div>
  )
}
