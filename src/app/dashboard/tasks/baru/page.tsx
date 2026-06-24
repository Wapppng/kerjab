"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { KATEGORI_LIST, getKpiList } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewTaskPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    kategori: "",
    kpi_level: "",
    waktu_terselesaikan: "",
    kuantitas_output: "1",
    link_hasil: "",
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      setUserRole(data?.role ?? null)
    }
    loadProfile()
  }, [supabase])

  const kpiList = getKpiList(userRole)
  const selectedKpi = kpiList.find((k) => k.level === Number(form.kpi_level))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.judul || !form.kategori || !form.kpi_level) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      judul: form.judul,
      deskripsi: form.deskripsi || null,
      kategori: form.kategori,
      kpi_level: Number(form.kpi_level),
      estimasi_waktu_menit: selectedKpi?.estimasi || 0,
      waktu_terselesaikan: form.waktu_terselesaikan ? new Date(form.waktu_terselesaikan).toISOString() : null,
      kuantitas_output: Number(form.kuantitas_output || 1),
      link_hasil: form.link_hasil || null,
    })

    if (error) { alert("Gagal: " + error.message); setLoading(false); return }
    router.push("/dashboard/tasks")
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-8">
      <Link href="/dashboard/tasks" className="notion-btn text-sm text-neutral-400 hover:text-neutral-700">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Task Baru</h1>
        <p className="mt-1 text-sm text-neutral-400">Isi detail tugas yang akan dikerjakan</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-sm font-medium text-neutral-700">Judul</label>
          <input
            className="notion-input mt-1"
            placeholder="Contoh: Buat feed campaign Q3"
            value={form.judul}
            onChange={(e) => setForm({ ...form, judul: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Deskripsi</label>
          <textarea
            className="notion-input mt-1 min-h-[80px] resize-y"
            placeholder="Detail tugas (opsional)"
            value={form.deskripsi}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Kategori</label>
            <select
              className="notion-select mt-1 w-full"
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              required
            >
              <option value="" disabled>Pilih kategori</option>
              {KATEGORI_LIST.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">KPI</label>
            <select
              className="notion-select mt-1 w-full"
              value={form.kpi_level}
              onChange={(e) => setForm({ ...form, kpi_level: e.target.value })}
              required
            >
              <option value="" disabled>Pilih tingkat kesulitan</option>
              {kpiList.map((k) => (
                <option key={k.level} value={k.level}>
                  {k.label} (bobot {k.bobot})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedKpi && (
          <div className="rounded-md border border-[#e5e5e5] px-4 py-3 text-sm text-neutral-600">
            Estimasi: <strong>{selectedKpi.estimasi} menit</strong> &middot; Bobot: {selectedKpi.bobot}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700">Waktu Terselesaikan</label>
            <input
              type="datetime-local"
              className="notion-input mt-1"
              value={form.waktu_terselesaikan}
              onChange={(e) => setForm({ ...form, waktu_terselesaikan: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Kuantitas Output</label>
            <input
              type="number"
              min="1"
              className="notion-input mt-1"
              placeholder="1"
              value={form.kuantitas_output}
              onChange={(e) => setForm({ ...form, kuantitas_output: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Link Hasil</label>
          <input
            className="notion-input mt-1"
            placeholder="https://drive.google.com/..."
            value={form.link_hasil}
            onChange={(e) => setForm({ ...form, link_hasil: e.target.value })}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="notion-btn notion-btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Task"}
          </button>
          <button type="button" className="notion-btn" onClick={() => router.back()}>
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
