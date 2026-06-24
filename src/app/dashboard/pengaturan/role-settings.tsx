"use client"

import { useActionState } from "react"
import { Palette, Video } from "lucide-react"
import { updateRole, type RoleFormState } from "./actions"

type RoleSettingsProps = {
  initialRole: "designer" | "video_editor"
}

const initialState: RoleFormState = {
  status: "idle",
  message: "",
}

const roles = [
  {
    value: "designer",
    label: "Desain Grafis",
    description: "Untuk pekerjaan visual, ilustrasi, dan materi desain.",
    icon: Palette,
  },
  {
    value: "video_editor",
    label: "Videografer",
    description: "Untuk produksi, penyuntingan, dan konten video.",
    icon: Video,
  },
] as const

export default function RoleSettings({ initialRole }: RoleSettingsProps) {
  const [state, formAction, pending] = useActionState(updateRole, initialState)

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-neutral-700">Pilih role pekerjaan</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map(({ value, label, description, icon: Icon }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={initialRole === value}
                className="peer sr-only"
                disabled={pending}
              />
              <span className="flex h-full gap-3 rounded-lg border border-[#e5e5e5] p-4 transition-colors hover:bg-neutral-50 peer-checked:border-neutral-900 peer-checked:bg-neutral-50 peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 peer-focus-visible:ring-offset-2">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" />
                <span>
                  <span className="block text-sm font-medium text-neutral-900">{label}</span>
                  <span className="mt-1 block text-sm leading-5 text-neutral-500">{description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.message && (
        <p className={state.status === "success" ? "text-sm text-green-600" : "text-sm text-red-500"}>
          {state.message}
        </p>
      )}

      <button type="submit" className="notion-btn notion-btn-primary" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan Role"}
      </button>
    </form>
  )
}
