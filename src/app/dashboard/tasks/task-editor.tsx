"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Calendar, CheckCircle2, ChevronDown, Clock, ExternalLink, FileText, Layers, Link as LinkIcon, Tag, User, UserPlus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { KATEGORI_LIST, cn, getJakartaDate, getKpiList, formatMenit, formatTaskDateLabel, toTaskRole, type KpiItem } from "@/lib/utils"
import { STATUS_CONFIG } from "./task-types"
import type { TaskProfile, TaskRole } from "./task-types"
import NotionEditor from "@/components/tiptap/notion-editor"
import { NotionSelect } from "@/components/ui/notion-select"

export type TaskEditorData = {
  id: string
  user_id: string
  judul: string
  deskripsi: string | null
  kategori: string
  kpi_level: number
  kpi_bobot?: number
  estimasi_waktu_menit: number
  realisasi_waktu_menit: number | null
  link_hasil: string | null
  status: string
  waktu_terselesaikan: string | null
  selesai_at?: string | null
  kuantitas_output: number | null
  task_date?: string
  created_by?: string
  created_at?: string
}

export function TaskEditor({
  taskId,
  mode = "page",
  onClose,
  initialTask,
  initialRole,
  assignee,
  creator,
  profiles = [],
  isAdmin = false,
}: {
  taskId: string
  mode?: "page" | "panel"
  onClose?: () => void
  initialTask?: TaskEditorData
  initialRole?: TaskRole
  assignee?: TaskProfile | null
  creator?: TaskProfile | null
  profiles?: TaskProfile[]
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [task, setTask] = useState<TaskEditorData | null>(initialTask ?? null)
  const [loading, setLoading] = useState(!initialTask)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [judul, setJudul] = useState(initialTask?.judul ?? "")
  const [deskripsi, setDeskripsi] = useState(initialTask?.deskripsi ?? "")
  const [kategori, setKategori] = useState(initialTask?.kategori ?? "")
  const [kpiLevel, setKpiLevel] = useState(initialTask ? String(initialTask.kpi_level) : "")
  const [status, setStatus] = useState(initialTask?.status ?? "")
  const [linkHasil, setLinkHasil] = useState(initialTask?.link_hasil ?? "")
  const [waktuTerselesaikan, setWaktuTerselesaikan] = useState(
    initialTask?.waktu_terselesaikan ? initialTask.waktu_terselesaikan.slice(0, 16) : ""
  )
  const [kuantitasOutput, setKuantitasOutput] = useState(
    initialTask?.kuantitas_output ? String(initialTask.kuantitas_output) : "1"
  )
  const [realisasi, setRealisasi] = useState(
    initialTask?.realisasi_waktu_menit ? String(initialTask.realisasi_waktu_menit) : ""
  )
  const realisasiTouched = useRef(false)

  const [taskDate, setTaskDate] = useState(
    initialTask?.task_date ?? getJakartaDate(initialTask?.created_at ? new Date(initialTask.created_at) : new Date())
  )
  const [assigneeId, setAssigneeId] = useState(initialTask?.user_id ?? assignee?.id ?? "")
  const [userRole, setUserRole] = useState<TaskRole>(initialRole ?? "designer")
  const [kpiList, setKpiList] = useState<readonly KpiItem[]>(
    initialTask ? getKpiList(initialRole ?? "designer") : []
  )

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

  const filteredJudulSuggestions = kategori && judulSuggestions[kategori]
    ? judulSuggestions[kategori].filter((s) => !judul || s.toLowerCase().includes(judul.toLowerCase()))
    : []

  useEffect(() => {
    if (initialTask?.realisasi_waktu_menit != null) {
      if (realisasi !== String(initialTask.realisasi_waktu_menit)) {
        setRealisasi(String(initialTask.realisasi_waktu_menit))
      }
      return
    }

    if (realisasiTouched.current) return

    const kpiInfo = kpiList.find((item) => item.level === Number(kpiLevel))
    const estimatedValue = kpiInfo?.estimasi || task?.estimasi_waktu_menit
    const outputCount = Number(kuantitasOutput) || 1
    if (estimatedValue) {
      setRealisasi(String(estimatedValue * outputCount))
    }
  }, [kpiLevel, kpiList, kuantitasOutput, task, initialTask?.realisasi_waktu_menit])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(!initialTask)
      setError("")

      let taskData = initialTask

      if (!taskData) {
        const { data, error: taskError } = await supabase.from("tasks").select("*").eq("id", taskId).single()
        if (taskError || !data) {
          if (mode === "page") {
            router.push("/dashboard/tasks")
          } else if (active) {
            setError("Task tidak ditemukan.")
            setLoading(false)
          }
          return
        }

        taskData = data
      }

      if (!taskData) return

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", taskData.user_id).single()
      const role = toTaskRole(profile?.role)
      const { data: config } = await supabase
        .from("kpi_config")
        .select("level, label, bobot, estimasi_waktu_menit")
        .eq("role", role)
        .order("level", { ascending: true })

      if (!active) return

      if (!initialTask) {
        setTask(taskData)
        setJudul(taskData.judul)
        setDeskripsi(taskData.deskripsi || "")
        setKategori(taskData.kategori)
        setKpiLevel(String(taskData.kpi_level))
        setStatus(taskData.status)
        setLinkHasil(taskData.link_hasil || "")
        setWaktuTerselesaikan(taskData.waktu_terselesaikan ? taskData.waktu_terselesaikan.slice(0, 16) : "")
        setKuantitasOutput(taskData.kuantitas_output ? String(taskData.kuantitas_output) : "1")
        setRealisasi(taskData.realisasi_waktu_menit ? String(taskData.realisasi_waktu_menit) : "")
        setTaskDate(taskData.task_date ?? getJakartaDate(taskData.created_at ? new Date(taskData.created_at) : new Date()))
        setAssigneeId(taskData.user_id)
      }
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
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [initialRole, initialTask, mode, router, supabase, taskId])

  const kpiInfo = kpiList.find((item) => item.level === Number(kpiLevel))
  const selectedAssignee = profiles.find((profile) => profile.id === assigneeId) ?? assignee ?? null
  const taskCreator = creator ?? profiles.find((profile) => profile.id === task?.created_by) ?? null

  async function handleAssigneeChange(nextAssigneeId: string) {
    setAssigneeId(nextAssigneeId)
    const nextProfile = profiles.find((profile) => profile.id === nextAssigneeId)
    const role: TaskRole = toTaskRole(nextProfile?.role)
    setUserRole(role)
    setKpiList(getKpiList(role))

    const { data: config } = await supabase
      .from("kpi_config")
      .select("level, label, bobot, estimasi_waktu_menit")
      .eq("role", role)
      .order("level", { ascending: true })

    if (config?.length) {
      setKpiList(config.map((item) => ({
        level: item.level,
        label: item.label,
        bobot: item.bobot,
        estimasi: item.estimasi_waktu_menit,
      })))
    }
  }

  async function handleSave() {
    if (!task) return

    setError("")
    setSaving(true)
    const now = new Date()
    const completionTime =
      status === "selesai" ? (waktuTerselesaikan ? new Date(waktuTerselesaikan).toISOString() : now.toISOString()) : null

    const updates: Record<string, unknown> = {
      judul,
      deskripsi: deskripsi || null,
      kategori,
      kpi_level: Number(kpiLevel),
      kpi_bobot: kpiInfo?.bobot ?? task.kpi_bobot ?? Number(kpiLevel),
      estimasi_waktu_menit: kpiInfo?.estimasi ?? task.estimasi_waktu_menit,
      user_id: assigneeId,
      task_date: taskDate,
      status,
      link_hasil: linkHasil || null,
      waktu_terselesaikan: completionTime,
      kuantitas_output: Number(kuantitasOutput) || 1,
      realisasi_waktu_menit: realisasi ? Number(realisasi) : null,
    }

    const { error: saveError } = await supabase.from("tasks").update(updates).eq("id", task.id)
    if (saveError) {
      setError(`Perubahan belum tersimpan: ${saveError.message}`)
      setSaving(false)
      return
    }

    setTask((current) =>
      current
        ? {
            ...current,
            judul,
            deskripsi: deskripsi || null,
            kategori,
            kpi_level: Number(kpiLevel),
            kpi_bobot: kpiInfo?.bobot ?? current.kpi_bobot ?? Number(kpiLevel),
            estimasi_waktu_menit: kpiInfo?.estimasi ?? current.estimasi_waktu_menit,
            user_id: assigneeId,
            task_date: taskDate,
            status,
            link_hasil: linkHasil || null,
            waktu_terselesaikan: completionTime,
            selesai_at: completionTime,
            kuantitas_output: Number(kuantitasOutput) || 1,
            realisasi_waktu_menit: realisasi ? Number(realisasi) : null,
          }
        : current
    )
    setWaktuTerselesaikan(completionTime ? completionTime.slice(0, 16) : "")
    setSaving(false)

    if (panelMode && onClose) {
      onClose()
      router.refresh()
    } else {
      router.push("/dashboard/tasks")
    }
  }

  if (loading) {
    return <div className="py-8 text-sm text-neutral-400">Memuat...</div>
  }

  if (!task) {
    return error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null
  }

  const panelMode = mode === "panel"

  return (
    <div className={panelMode ? "flex h-full min-h-0 flex-col" : "max-w-2xl space-y-8"}>
      {!panelMode && (
        <Link href="/dashboard/tasks" className="notion-btn w-fit text-sm text-neutral-400 hover:text-neutral-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      )}

      <div className={panelMode ? "border-b border-[#e9e9e7] bg-white px-6 py-5" : "space-y-2"}>
        <div className={panelMode ? "flex items-start justify-between gap-4" : "space-y-2"}>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className={`notion-dot ${STATUS_CONFIG.find((item) => item.value === status)?.dot || "bg-neutral-300"}`} />
              <h1 className="truncate text-2xl font-semibold tracking-tight">{panelMode ? task.judul : "Edit Task"}</h1>
            </div>
            {panelMode && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 capitalize text-neutral-700">
                  {task.kategori.replaceAll("_", " ")}
                </span>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-700">
                  KPI {task.kpi_bobot ?? task.kpi_level}
                </span>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-700">
                  {formatTaskDateLabel(taskDate)}
                </span>
                {task.link_hasil && (
                  <a
                    href={task.link_hasil}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 hover:bg-blue-100"
                  >
                    Lihat hasil
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
          {panelMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="notion-btn shrink-0 text-neutral-500 hover:text-neutral-900"
              aria-label="Tutup detail task"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          )}
        </div>
        <p className={panelMode ? "mt-2 text-sm text-neutral-400" : "text-sm text-neutral-400"}>
          KPI mengikuti role {userRole === "designer" ? "Desain Grafis" : userRole === "video_editor" ? "Videografer" : "Copywriter"}
        </p>
      </div>

      <div className={cn(panelMode ? "min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5" : "")}>
        <div className="space-y-3">
          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><Tag className="h-3.5 w-3.5 text-neutral-500" />Kategori</label>
            <div className="flex-1 min-w-0">
              <NotionSelect className="w-full sm:mt-0" value={kategori} onChange={setKategori} options={KATEGORI_LIST.map((item) => ({ value: item.value, label: item.label }))} />
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><BarChart3 className="h-3.5 w-3.5 text-neutral-500" />KPI Level</label>
            <div className="flex-1 min-w-0">
              <NotionSelect className="w-full sm:mt-0" value={kpiLevel} onChange={setKpiLevel} options={kpiList.map((item) => ({ value: String(item.level), label: `${item.label} (bobot ${item.bobot})` }))} />
              {kpiInfo && (
                <p className="mt-1 text-xs text-neutral-400">
                  Estimasi: <span className="text-neutral-500">{formatMenit(kpiInfo.estimasi * (Number(kuantitasOutput) || 1))}</span>
                  {realisasi && <> &middot; Realisasi: <span className="text-neutral-500">{formatMenit(Number(realisasi))}</span></>}
                </p>
              )}
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><FileText className="h-3.5 w-3.5 text-neutral-500" />Judul</label>
            <div className="flex-1 min-w-0 relative">
              <input
                ref={judulRef}
                autoFocus={!panelMode}
                className="notion-input sm:mt-0"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                onFocus={() => setShowJudulSuggestions(true)}
                onBlur={() => setTimeout(() => setShowJudulSuggestions(false), 200)}
              />
              {showJudulSuggestions && filteredJudulSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
                  {filteredJudulSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[#f7f7f5]"
                      onMouseDown={(e) => { e.preventDefault(); setJudul(suggestion); setShowJudulSuggestions(false) }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><User className="h-3.5 w-3.5 text-neutral-500" />Assignee</label>
            <div className="flex-1 min-w-0">
              <NotionSelect className="w-full sm:mt-0" value={assigneeId} onChange={handleAssigneeChange} options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))} />
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <div className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><UserPlus className="h-3.5 w-3.5 text-neutral-500" />Dibuat Oleh</div>
            <div className="flex-1 min-w-0">
              <div className="task-person-field sm:mt-0">
                <span className="task-avatar">{(taskCreator?.name || "P").charAt(0).toUpperCase()}</span>
                <span>{taskCreator?.name || "Pengguna"}</span>
              </div>
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-2 sm:gap-3">
            <div className="sm:flex sm:gap-3 sm:items-start">
              <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0">
                <Calendar className="h-3.5 w-3.5 text-neutral-500" />Tanggal</label>
              <div className="flex-1 min-w-0">
                <input
                  type="date"
                  className="notion-input sm:mt-0"
                  value={taskDate}
                  onChange={(event) => setTaskDate(event.target.value)}
                />
              </div>
            </div>
            <div className="sm:flex sm:gap-3 sm:items-start">
              <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0">
                <Calendar className="h-3.5 w-3.5 text-neutral-500" />Selesai</label>
              <div className="flex-1 min-w-0">
                <input
                  type="datetime-local"
                  className="notion-input sm:mt-0"
                  value={waktuTerselesaikan}
                  onChange={(e) => setWaktuTerselesaikan(e.target.value)}
                  disabled={status !== "selesai"}
                />
                <p className="mt-1 text-xs text-neutral-400">
                  {status === "selesai" ? "Bisa disesuaikan untuk pekerjaan yang dicatat terlambat." : "Aktif setelah status menjadi Selesai."}
                </p>
              </div>
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><CheckCircle2 className="h-3.5 w-3.5 text-neutral-500" />Status</label>
            <div className="flex-1 min-w-0">
              <NotionSelect className="w-full sm:mt-0" value={status} onChange={setStatus} options={STATUS_CONFIG.map((item) => ({ value: item.value, label: item.label, prefix: <span className={`notion-dot ${item.dot}`} />, optionClassName: `${item.bg} ${item.text} rounded-full border-0 font-medium` }))} />
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-2 sm:gap-3">
            <div className="sm:flex sm:gap-3 sm:items-start">
              <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><Layers className="h-3.5 w-3.5 text-neutral-500" />Output</label>
              <div className="flex-1 min-w-0">
                <input
                  type="number"
                  min="1"
                  className="notion-input sm:mt-0"
                  placeholder="1"
                  value={kuantitasOutput}
                  onChange={(e) => setKuantitasOutput(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:flex sm:gap-3 sm:items-start">
              <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><Clock className="h-3.5 w-3.5 text-neutral-500" />Realisasi</label>
              <div className="flex-1 min-w-0">
                <input
                  className="notion-input sm:mt-0"
                  type="number"
                  placeholder="120"
                  value={realisasi}
                  onChange={(e) => { realisasiTouched.current = true; setRealisasi(e.target.value) }}
                />
              </div>
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <label className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><LinkIcon className="h-3.5 w-3.5 text-neutral-500" />Link Hasil</label>
            <div className="flex-1 min-w-0">
              <input
                type="url"
                className="notion-input sm:mt-0"
                placeholder="https://drive.google.com/..."
                value={linkHasil}
                onChange={(e) => setLinkHasil(e.target.value)}
              />
            </div>
          </div>

          <div className="sm:flex sm:gap-3 sm:items-start">
            <div className="sm:w-[130px] sm:shrink-0 sm:pt-1.5 text-sm font-medium text-neutral-700 inline-flex items-center gap-1.5 mb-1 sm:mb-0"><FileText className="h-3.5 w-3.5 text-neutral-500" />Deskripsi</div>
            <div className="flex-1 min-w-0">
              <NotionEditor value={deskripsi} onChange={setDeskripsi} placeholder="Ketik '/' untuk perintah, atau tulis deskripsi..." />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className={cn("flex gap-2", panelMode ? "border-t border-[#e9e9e7] bg-white px-6 py-4" : "pt-2")}>
        <button className="notion-btn notion-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        <button type="button" className="notion-btn" onClick={onClose ?? (() => window.history.back())}>
          Batal
        </button>
      </div>
    </div>
  )
}
