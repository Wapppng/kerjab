export type TaskRole = "designer" | "video_editor" | "copywriter"

export type TaskProfile = {
  id: string
  name: string
  role: string
}

export const STATUS_CONFIG = [
  { value: "pending", label: "Pending", dot: "bg-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700" },
  { value: "progress", label: "Progress", dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700" },
  { value: "review", label: "Review", dot: "bg-purple-400", bg: "bg-purple-50", text: "text-purple-700" },
  { value: "selesai", label: "Selesai", dot: "bg-green-400", bg: "bg-green-50", text: "text-green-700" },
] as const
