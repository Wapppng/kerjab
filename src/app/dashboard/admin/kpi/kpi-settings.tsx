"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type KpiConfig = {
  level: number
  role: string
  label: string
  bobot: number
  estimasi_waktu_menit: number
}

const ROLES = [
  { key: "designer", label: "Desainer Grafis" },
  { key: "video_editor", label: "Video Editor" },
] as const

const LABELS = ["Sangat Mudah", "Mudah", "Sedang", "Sulit", "Sangat Sulit"]

export function KpiSettings({ designerData, videoData }: { designerData: KpiConfig[]; videoData: KpiConfig[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<"designer" | "video_editor">("designer")
  const [designer, setDesigner] = useState<KpiConfig[]>(designerData)
  const [video, setVideo] = useState<KpiConfig[]>(videoData)
  const [saving, setSaving] = useState(false)

  const current = tab === "designer" ? designer : video
  const setCurrent = tab === "designer" ? setDesigner : setVideo

  function update(level: number, field: keyof KpiConfig, value: string | number) {
    setCurrent((prev) => prev.map((item) => item.level === level ? { ...item, [field]: value } : item))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const data = tab === "designer" ? designer : video
      const dataToSave = data.map((item) => ({ ...item, role: tab }))
      
      console.log("Saving data:", dataToSave)
      
      // Batch upsert - 1 request untuk semua items
      const { data: response, error } = await supabase.from("kpi_config").upsert(dataToSave)
      
      console.log("Response:", response)
      console.log("Error:", error)
      
      if (error) {
        const errorMsg = error?.message || JSON.stringify(error) || "Unknown error"
        alert(`Gagal menyimpan: ${errorMsg}`)
        return
      }
      
      alert("Pengaturan KPI berhasil disimpan!")
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err)
      alert(`Error: ${errorMsg}`)
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border border-[#e5e5e5] p-1">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => setTab(r.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === r.key ? "bg-[#37352f] text-white" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {current.map((item) => (
          <div key={item.level} className="rounded-lg border border-[#e5e5e5] p-5">
            <div className="mb-4 text-sm font-medium">
              Level {item.level} &mdash; {LABELS[item.level - 1]}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs text-neutral-500">Label</label>
                <input
                  className="notion-input mt-1"
                  value={item.label}
                  onChange={(e) => update(item.level, "label", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Bobot</label>
                <input
                  className="notion-input mt-1"
                  type="number"
                  value={item.bobot}
                  onChange={(e) => update(item.level, "bobot", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Estimasi (menit)</label>
                <input
                  className="notion-input mt-1"
                  type="number"
                  value={item.estimasi_waktu_menit}
                  onChange={(e) => update(item.level, "estimasi_waktu_menit", Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="notion-btn notion-btn-primary w-full justify-center" onClick={handleSave} disabled={saving}>
        {saving ? "Menyimpan..." : `Simpan Pengaturan KPI ${tab === "designer" ? "Desainer" : "Video Editor"}`}
      </button>
    </div>
  )
}