import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const KATEGORI_LIST = [
  { value: "artikel", label: "Artikel" },
  { value: "feed_instagram", label: "Feed Instagram" },
  { value: "thumbnail", label: "Thumbnail" },
  { value: "video", label: "Video" },
  { value: "lain_lain", label: "Lain-lain" },
] as const

export const STATUS_LIST = [
  { value: "pending", label: "Pending" },
  { value: "progress", label: "Progress" },
  { value: "review", label: "Review" },
  { value: "selesai", label: "Selesai" },
] as const

export type KpiItem = { level: number; label: string; bobot: number; estimasi: number }

export const KPI_LIST: readonly KpiItem[] = [
  { level: 1, label: "Sangat Mudah", bobot: 1, estimasi: 1 },
  { level: 2, label: "Mudah", bobot: 2, estimasi: 5 },
  { level: 3, label: "Sedang", bobot: 6, estimasi: 30 },
  { level: 4, label: "Sulit", bobot: 12, estimasi: 60 },
  { level: 5, label: "Sangat Sulit", bobot: 30, estimasi: 150 },
] as const

export const KPI_LIST_VIDEO: readonly KpiItem[] = [
  { level: 1, label: "Sangat Mudah", bobot: 1, estimasi: 30 },
  { level: 2, label: "Mudah", bobot: 2, estimasi: 60 },
  { level: 3, label: "Sedang", bobot: 3, estimasi: 180 },
  { level: 4, label: "Sulit", bobot: 4, estimasi: 360 },
  { level: 5, label: "Sangat Sulit", bobot: 5, estimasi: 600 },
] as const

export function getKpiList(role?: string | null): readonly KpiItem[] {
  return role === "video_editor" ? KPI_LIST_VIDEO : KPI_LIST
}

export function formatMenit(menit: number | null): string {
  if (menit === null) return "-"
  if (menit < 60) return `${menit} menit`
  const jam = Math.floor(menit / 60)
  const sisa = menit % 60
  return sisa > 0 ? `${jam}j ${sisa}m` : `${jam} jam`
}

export const JAKARTA_TIME_ZONE = "Asia/Jakarta"

export function getJakartaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function shiftTaskDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00+07:00`)
  value.setUTCDate(value.getUTCDate() + days)
  return getJakartaDate(value)
}

export function formatTaskDateLabel(date: string, today = getJakartaDate()): string {
  if (date === today) return "Hari ini"
  if (date === shiftTaskDate(today, -1)) return "Kemarin"

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+07:00`))
}

export function getBulanName(bulan: number): string {
  const names = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ]
  return names[bulan - 1] || ""
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800"
    case "progress": return "bg-blue-100 text-blue-800"
    case "review": return "bg-purple-100 text-purple-800"
    case "selesai": return "bg-green-100 text-green-800"
    default: return "bg-gray-100 text-gray-800"
  }
}
