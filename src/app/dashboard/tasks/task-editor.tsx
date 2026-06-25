"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { KATEGORI_LIST, getJakartaDate, getKpiList, formatMenit, formatTaskDateLabel, type KpiItem } from "@/lib/utils"
import type { TaskProfile, TaskRole } from "./task-types"

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

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", dot: "bg-yellow-400" },
  { value: "progress", label: "Progress", dot: "bg-blue-400" },
  { value: "review", label: "Review", dot: "bg-purple-400" },
  { value: "selesai", label: "Selesai", dot: "bg-green-400" },
] as const

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
    if (estimatedValue) {
      setRealisasi(String(estimatedValue))
    }
  }, [kpiLevel, kpiList, task, initialTask?.realisasi_waktu_menit])

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
      const role = profile?.role === "video_editor" ? "video_editor" : "designer"
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
    const role: TaskRole = nextProfile?.role === "video_editor" ? "video_editor" : "designer"
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
    router.refresh()
  }

  if (loading) {
    return <div className="py-8 text-sm text-neutral-400">Memuat...</div>
  }

  if (!task) {
    return error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null
  }

  const panelMode = mode === "panel"

  return (
    <div className={panelMode ? "flex h-full flex-col" : "max-w-2xl space-y-8"}>
      {!panelMode && (
        <Link href="/dashboard/tasks" className="notion-btn w-fit text-sm text-neutral-400 hover:text-neutral-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      )}

      <div className={panelMode ? "border-b border-[#e9e9e7] bg-white px-6 py-5" : "space-y-2"}>
        <div className={panelMode ? "flex items-start justify-between gap-4" : "space-y-2"}>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className={`notion-dot ${STATUS_OPTIONS.find((item) => item.value === status)?.dot || "bg-neutral-300"}`} />
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
          KPI mengikuti role {userRole === "designer" ? "Desain Grafis" : "Videografer"}
        </p>
      </div>

      <div className={panelMode ? "flex-1 space-y-6 overflow-y-auto bg-white px-6 py-5" : "space-y-6"}>
        <div>
          <label className="text-sm font-medium text-neutral-700">Judul</label>
          <input className="notion-input mt-1" value={judul} onChange={(e) => setJudul(e.target.value)} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Tanggal Task</label>
            <input
              type="date"
              className="notion-input mt-1"
              value={taskDate}
              onChange={(event) => setTaskDate(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Assignee</label>
            {isAdmin ? (
              <select
                className="notion-select mt-1 w-full"
                value={assigneeId}
                onChange={(event) => handleAssigneeChange(event.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            ) : (
              <div className="task-person-field mt-1">
                <span className="task-avatar">{(selectedAssignee?.name || "P").charAt(0).toUpperCase()}</span>
                <span>{selectedAssignee?.name || "Pengguna"}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Dibuat Oleh</label>
          <div className="task-person-field mt-1">
            <span className="task-avatar">{(taskCreator?.name || "P").charAt(0).toUpperCase()}</span>
            <span>{taskCreator?.name || "Pengguna"}</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Deskripsi</label>
          <textarea
            className="notion-input mt-1 min-h-[100px] resize-y"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Kategori</label>
            <select className="notion-select mt-1 w-full" value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {KATEGORI_LIST.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">KPI Level</label>
            <select className="notion-select mt-1 w-full" value={kpiLevel} onChange={(e) => setKpiLevel(e.target.value)}>
              {kpiList.map((item) => (
                <option key={item.level} value={item.level}>{item.label} (bobot {item.bobot})</option>
              ))}
            </select>
          </div>
        </div>

        {kpiInfo && (
          <div className="rounded-md border border-[#e5e5e5] px-4 py-3 text-sm text-neutral-600">
            Estimasi: <strong>{formatMenit(kpiInfo.estimasi)}</strong>
            {realisasi && <> &middot; Realisasi: <strong>{formatMenit(Number(realisasi))}</strong></>}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Status</label>
            <select className="notion-select mt-1 w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Realisasi (menit)</label>
            <input
              className="notion-input mt-1"
              type="number"
              placeholder="120"
              value={realisasi}
              onChange={(e) => { realisasiTouched.current = true; setRealisasi(e.target.value) }}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Link Hasil</label>
            <input
              type="url"
              className="notion-input mt-1"
              placeholder="https://drive.google.com/..."
              value={linkHasil}
              onChange={(e) => setLinkHasil(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Waktu Terselesaikan</label>
            <input
              type="datetime-local"
              className="notion-input mt-1"
              value={waktuTerselesaikan}
              onChange={(e) => setWaktuTerselesaikan(e.target.value)}
              disabled={status !== "selesai"}
            />
            <p className="mt-1 text-xs text-neutral-400">
              {status === "selesai" ? "Bisa disesuaikan untuk pekerjaan yang dicatat terlambat." : "Aktif setelah status menjadi Selesai."}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Kuantitas Output</label>
            <input
              type="number"
              min="1"
              className="notion-input mt-1"
              placeholder="1"
              value={kuantitasOutput}
              onChange={(e) => setKuantitasOutput(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className={panelMode ? "border-t border-[#e9e9e7] bg-white px-6 py-4" : "pt-2"}>
        <button className="notion-btn notion-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  )
}
