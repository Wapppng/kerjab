"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { KATEGORI_LIST, getKpiList, formatMenit } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

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
  selesai_at: string | null
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", dot: "bg-yellow-400" },
  { value: "progress", label: "Progress", dot: "bg-blue-400" },
  { value: "review", label: "Review", dot: "bg-purple-400" },
  { value: "selesai", label: "Selesai", dot: "bg-green-400" },
]

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [judul, setJudul] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [kategori, setKategori] = useState("")
  const [kpiLevel, setKpiLevel] = useState("")
  const [status, setStatus] = useState("")
  const [linkHasil, setLinkHasil] = useState("")
  const [waktuTerselesaikan, setWaktuTerselesaikan] = useState("")
  const [kuantitasOutput, setKuantitasOutput] = useState("1")
  const [realisasi, setRealisasi] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { id } = await params
      const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single()
      if (error || !data) { router.push("/dashboard/tasks"); return }
      setTask(data)
      setJudul(data.judul)
      setDeskripsi(data.deskripsi || "")
      setKategori(data.kategori)
      setKpiLevel(String(data.kpi_level))
      setStatus(data.status)
      setLinkHasil(data.link_hasil || "")
      setWaktuTerselesaikan(data.waktu_terselesaikan ? data.waktu_terselesaikan.slice(0, 16) : "")
      setKuantitasOutput(data.kuantitas_output ? String(data.kuantitas_output) : "1")
      setRealisasi(data.realisasi_waktu_menit ? String(data.realisasi_waktu_menit) : "")
      setLoading(false)

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user_id).single()
      setUserRole(profile?.role ?? null)
    }
    load()
  }, [params, supabase, router])

  const kpiList = getKpiList(userRole)

  async function handleSave() {
    setSaving(true)
    const now = new Date()
    const completionTime = status === "selesai" && task?.status !== "selesai" && !waktuTerselesaikan
      ? now.toISOString()
      : (waktuTerselesaikan ? new Date(waktuTerselesaikan).toISOString() : null)

    const updates: Record<string, unknown> = {
      judul,
      deskripsi: deskripsi || null,
      kategori,
      kpi_level: Number(kpiLevel),
      status,
      link_hasil: linkHasil || null,
      waktu_terselesaikan: completionTime,
      kuantitas_output: Number(kuantitasOutput) || 1,
      realisasi_waktu_menit: realisasi ? Number(realisasi) : null,
    }

    if (status === "selesai" && task?.status !== "selesai") updates.selesai_at = now.toISOString()

    await supabase.from("tasks").update(updates).eq("id", task!.id)
    setSaving(false)
    router.refresh()
  }

  if (loading) return <div className="text-sm text-neutral-400 py-8">Memuat...</div>
  if (!task) return null

  const kpiInfo = kpiList.find((k) => k.level === Number(kpiLevel))

  return (
    <div className="max-w-2xl space-y-8">
      <Link href="/dashboard/tasks" className="notion-btn text-sm text-neutral-400 hover:text-neutral-700">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex items-center gap-3">
        <span className={`notion-dot ${STATUS_OPTIONS.find(s => s.value === status)?.dot || "bg-neutral-300"}`} />
        <h1 className="text-2xl font-semibold tracking-tight">Edit Task</h1>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-neutral-700">Judul</label>
          <input className="notion-input mt-1" value={judul} onChange={(e) => setJudul(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Deskripsi</label>
          <textarea
            className="notion-input mt-1 min-h-[80px] resize-y"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Kategori</label>
            <select className="notion-select mt-1 w-full" value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {KATEGORI_LIST.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">KPI Level</label>
            <select className="notion-select mt-1 w-full" value={kpiLevel} onChange={(e) => setKpiLevel(e.target.value)}>
              {kpiList.map((k) => (
                <option key={k.level} value={k.level}>{k.label} (bobot {k.bobot})</option>
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
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
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
              onChange={(e) => setRealisasi(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Link Hasil</label>
            <input
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
            />
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

        <div className="flex gap-3 pt-2">
          <button className="notion-btn notion-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  )
}
