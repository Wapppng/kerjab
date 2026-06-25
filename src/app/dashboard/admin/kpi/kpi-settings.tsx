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

const LABELS = ["Sangat Mudah", "Mudah", "Sedang", "Sulit", "Sangat Sulit"]

export function KpiSettings({
  configByRole,
  roleKeys,
  roleLabels,
}: {
  configByRole: Record<string, KpiConfig[]>
  roleKeys: string[]
  roleLabels: Record<string, string>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<string>(roleKeys[0])
  const [configs, setConfigs] = useState<Record<string, KpiConfig[]>>(configByRole)
  const [saving, setSaving] = useState(false)

  const current = configs[tab] ?? []
  const firstTab = roleKeys[0]

  function update(level: number, field: keyof KpiConfig, value: string | number) {
    setConfigs((prev) => ({
      ...prev,
      [tab]: prev[tab]?.map((item) => item.level === level ? { ...item, [field]: value } : item) ?? [],
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const data = configs[tab] ?? []
      const dataToSave = data.map((item) => ({ ...item, role: tab }))

      const { error } = await supabase.from("kpi_config").upsert(dataToSave)

      if (error) {
        alert(`Gagal menyimpan: ${error.message || JSON.stringify(error)}`)
        return
      }

      alert("Pengaturan KPI berhasil disimpan!")
      router.refresh()
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border border-[#e5e5e5] p-1">
        {roleKeys.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === key ? "bg-[#37352f] text-white" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {roleLabels[key] ?? key}
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
        {saving ? "Menyimpan..." : `Simpan Pengaturan KPI ${roleLabels[tab] ?? tab}`}
      </button>
    </div>
  )
}
