"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  KATEGORI_LIST,
  formatMenit,
  formatTaskDateLabel,
  getJakartaDate,
  shiftTaskDate,
} from "@/lib/utils"
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TaskCreateEditor } from "./task-create-editor"
import { TaskEditor, type TaskEditorData } from "./task-editor"
import type { TaskProfile, TaskRole } from "./task-types"

type Task = TaskEditorData & {
  created_at: string
  assignee?: TaskProfile | TaskProfile[] | null
  creator?: TaskProfile | TaskProfile[] | null
}

type PeekState = { type: "create"; date?: string } | { type: "edit"; taskId: string } | null
type DatePreset = "all" | "today" | "week" | "month" | "custom"

const STATUS_META: Record<string, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-yellow-400" },
  progress: { label: "Progress", dot: "bg-blue-400" },
  review: { label: "Review", dot: "bg-purple-400" },
  selesai: { label: "Selesai", dot: "bg-green-400" },
}

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "today", label: "Hari ini" },
  { value: "week", label: "7 hari" },
  { value: "month", label: "Bulan ini" },
  { value: "custom", label: "Custom" },
]

function validDatePreset(value: string | null): DatePreset {
  return DATE_PRESETS.some((item) => item.value === value) ? (value as DatePreset) : "all"
}

function taskDate(task: Task) {
  return task.task_date ?? getJakartaDate(new Date(task.created_at))
}

function monthPrefix(date: string) {
  return date.slice(0, 7)
}

function personInitial(name?: string | null) {
  return (name || "P").charAt(0).toUpperCase()
}

function firstProfile(profile?: TaskProfile | TaskProfile[] | null) {
  return Array.isArray(profile) ? profile[0] ?? null : profile ?? null
}

function PersonBadge({ profile }: { profile?: TaskProfile | TaskProfile[] | null }) {
  const person = firstProfile(profile)
  return (
    <span className="inline-flex max-w-40 items-center gap-2 truncate text-xs text-neutral-600">
      <span className="task-avatar">{personInitial(person?.name)}</span>
      <span className="truncate">{person?.name || "Tanpa assignee"}</span>
    </span>
  )
}

export function TaskList({
  tasks,
  profiles,
  isAdmin,
  userId,
  userName,
  userRole,
}: {
  tasks: Task[]
  profiles: TaskProfile[]
  isAdmin: boolean
  userId: string
  userName: string
  userRole: TaskRole
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const today = getJakartaDate()
  const taskIdFromUrl = searchParams.get("task")
  const initialPeek: PeekState = searchParams.get("new") === "task"
    ? { type: "create", date: searchParams.get("new_date") || undefined }
    : taskIdFromUrl
      ? { type: "edit", taskId: taskIdFromUrl }
      : null

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "all")
  const [filterKategori, setFilterKategori] = useState(searchParams.get("kategori") || "all")
  const [filterAssignee, setFilterAssignee] = useState(isAdmin ? searchParams.get("assignee") || "all" : "all")
  const [datePreset, setDatePreset] = useState<DatePreset>(validDatePreset(searchParams.get("tanggal")))
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "")
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "")
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(() => new Set())
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updatingTitleId, setUpdatingTitleId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [activePeek, setActivePeek] = useState<PeekState>(initialPeek)
  const [renderedPeek, setRenderedPeek] = useState<PeekState>(initialPeek)
  const selectedTaskId = activePeek?.type === "edit" ? activePeek.taskId : null

  function replaceUrlParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    window.history.replaceState(null, "", nextUrl)
  }

  function setPeek(nextPeek: PeekState) {
    setActivePeek(nextPeek)
    if (nextPeek) setRenderedPeek(nextPeek)

    const params = new URLSearchParams(window.location.search)
    params.delete("task")
    params.delete("new")
    params.delete("new_date")

    if (nextPeek?.type === "edit") {
      params.set("task", nextPeek.taskId)
    } else if (nextPeek?.type === "create") {
      params.set("new", "task")
      if (nextPeek.date) params.set("new_date", nextPeek.date)
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    window.history.replaceState(null, "", nextUrl)
  }

  function openCreate(date = today) {
    setPeek({ type: "create", date })
  }

  function handleDatePresetChange(nextPreset: DatePreset) {
    setDatePreset(nextPreset)
    if (nextPreset !== "custom") {
      setDateFrom("")
      setDateTo("")
      replaceUrlParams({ tanggal: nextPreset === "all" ? null : nextPreset, from: null, to: null })
    } else {
      replaceUrlParams({ tanggal: "custom", from: dateFrom || null, to: dateTo || null })
    }
  }

  function handleDateRangeChange(nextFrom: string, nextTo: string) {
    setDatePreset("custom")
    setDateFrom(nextFrom)
    setDateTo(nextTo)
    replaceUrlParams({ tanggal: "custom", from: nextFrom || null, to: nextTo || null })
  }

  function handleStatusFilterChange(value: string) {
    setFilterStatus(value)
    replaceUrlParams({ status: value === "all" ? null : value })
  }

  function handleKategoriFilterChange(value: string) {
    setFilterKategori(value)
    replaceUrlParams({ kategori: value === "all" ? null : value })
  }

  function handleAssigneeFilterChange(value: string) {
    setFilterAssignee(value)
    replaceUrlParams({ assignee: value === "all" ? null : value })
  }

  function resetFilters() {
    setSearch("")
    setFilterStatus("all")
    setFilterKategori("all")
    setFilterAssignee("all")
    setDatePreset("all")
    setDateFrom("")
    setDateTo("")
    replaceUrlParams({ status: null, kategori: null, assignee: null, tanggal: null, from: null, to: null })
  }

  function matchesDateFilter(date: string) {
    if (datePreset === "today") return date === today
    if (datePreset === "week") return date >= shiftTaskDate(today, -6) && date <= today
    if (datePreset === "month") return monthPrefix(date) === monthPrefix(today)
    if (datePreset === "custom") {
      if (dateFrom && date < dateFrom) return false
      if (dateTo && date > dateTo) return false
    }
    return true
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = tasks.filter((task) => {
    const date = taskDate(task)
    if (!matchesDateFilter(date)) return false
    if (filterStatus !== "all" && task.status !== filterStatus) return false
    if (filterKategori !== "all" && task.kategori !== filterKategori) return false
    if (isAdmin && filterAssignee !== "all" && task.user_id !== filterAssignee) return false
    if (normalizedSearch && !task.judul.toLowerCase().includes(normalizedSearch)) return false
    return true
  })

  const groupedTasks = Array.from(
    filtered.reduce((groups, task) => {
      const date = taskDate(task)
      const group = groups.get(date) ?? []
      group.push(task)
      groups.set(date, group)
      return groups
    }, new Map<string, Task[]>())
  ).sort(([dateA], [dateB]) => dateB.localeCompare(dateA))

  const hasActiveFilters =
    Boolean(search) ||
    filterStatus !== "all" ||
    filterKategori !== "all" ||
    (isAdmin && filterAssignee !== "all") ||
    datePreset !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo)

  async function handleDelete(id: string) {
    if (!confirm("Hapus task ini?")) return
    setError("")
    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id)
    if (deleteError) {
      setError(`Task belum terhapus: ${deleteError.message}`)
      return
    }
    router.refresh()
  }

  async function handleStatusChange(task: Task, status: string) {
    setError("")
    setUpdatingId(task.id)
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task.id)

    if (updateError) {
      setError(`Status belum berubah: ${updateError.message}`)
      setUpdatingId(null)
      return
    }

    router.refresh()
    setUpdatingId(null)
  }

  async function handleTitleChange(task: Task, input: HTMLInputElement) {
    const nextTitle = input.value.trim()
    if (!nextTitle || nextTitle === task.judul) {
      input.value = task.judul
      return
    }

    setError("")
    setUpdatingTitleId(task.id)
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ judul: nextTitle })
      .eq("id", task.id)

    if (updateError) {
      input.value = task.judul
      setError(`Judul belum berubah: ${updateError.message}`)
      setUpdatingTitleId(null)
      return
    }

    setUpdatingTitleId(null)
    router.refresh()
  }

  function toggleDate(date: string) {
    setCollapsedDates((current) => {
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const renderedTaskId = renderedPeek?.type === "edit" ? renderedPeek.taskId : null
  const renderedTask = tasks.find((task) => task.id === renderedTaskId)
  const renderedAssignee = firstProfile(renderedTask?.assignee)
  const renderedCreator = firstProfile(renderedTask?.creator)
  const renderedTaskRole = renderedAssignee?.role === "video_editor" ? "video_editor" : "designer"

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pekerjaan</h1>
            <p className="mt-1 hidden text-sm text-neutral-400 sm:block">Kelola pekerjaan, status, tanggal, dan assignee dalam satu tempat.</p>
          </div>
          <button
            type="button"
            className="notion-btn notion-btn-primary"
            onClick={() => openCreate()}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Task Baru</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-xs lg:flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                className="notion-input notion-search-input"
                placeholder="Cari task..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="notion-select w-full lg:w-auto"
              value={filterStatus}
              onChange={(event) => handleStatusFilterChange(event.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="progress">Progress</option>
              <option value="review">Review</option>
              <option value="selesai">Selesai</option>
            </select>
            <select
              className="notion-select w-full lg:w-auto"
              value={filterKategori}
              onChange={(event) => handleKategoriFilterChange(event.target.value)}
            >
              <option value="all">Semua Kategori</option>
              {KATEGORI_LIST.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            {isAdmin && (
              <select
                className="notion-select w-full lg:w-auto"
                value={filterAssignee}
                onChange={(event) => handleAssigneeFilterChange(event.target.value)}
              >
                <option value="all">Semua Assignee</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`task-filter-chip ${datePreset === preset.value ? "active" : ""}`}
                  onClick={() => handleDatePresetChange(preset.value)}
                >
                  {preset.value === "custom" && <CalendarDays className="h-3.5 w-3.5" />}
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {datePreset === "custom" && (
                <>
                  <input
                    type="date"
                    className="notion-input sm:w-auto"
                    value={dateFrom}
                    onChange={(event) => handleDateRangeChange(event.target.value, dateTo)}
                    aria-label="Tanggal mulai"
                  />
                  <span className="hidden text-xs text-neutral-400 sm:inline">sampai</span>
                  <input
                    type="date"
                    className="notion-input sm:w-auto"
                    value={dateTo}
                    onChange={(event) => handleDateRangeChange(dateFrom, event.target.value)}
                    aria-label="Tanggal selesai"
                  />
                </>
              )}
              {hasActiveFilters && (
                <button type="button" className="notion-btn text-neutral-500" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className={`notion-table ${filtered.length === 0 ? "min-w-full" : "min-w-[620px] lg:min-w-[920px]"}`}>
              <thead>
                <tr>
                  <th className="w-3"></th>
                  <th>Nama</th>
                  <th className="hidden md:table-cell">Kategori</th>
                  <th className="hidden lg:table-cell">KPI</th>
                  <th className="hidden lg:table-cell">Estimasi</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <>
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-neutral-400">
                        Belum ada task yang sesuai
                      </td>
                    </tr>
                    <tr className="task-new-row">
                      <td colSpan={8}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-400 transition-colors hover:bg-[#f7f7f5] hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2383e2]"
                          onClick={() => openCreate()}
                        >
                          <Plus className="h-4 w-4" />
                          New task
                        </button>
                      </td>
                    </tr>
                  </>
                )}

                {groupedTasks.map(([date, group]) => {
                  const collapsed = collapsedDates.has(date)
                  return (
                    <FragmentGroup
                      key={date}
                      date={date}
                      group={group}
                      collapsed={collapsed}
                      selectedTaskId={selectedTaskId}
                      updatingId={updatingId}
                      updatingTitleId={updatingTitleId}
                      isAdmin={isAdmin}
                      userId={userId}
                      onToggleDate={() => toggleDate(date)}
                      onOpenTask={(taskId) => setPeek({ type: "edit", taskId })}
                      onOpenCreate={() => openCreate(date)}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                      onTitleChange={handleTitleChange}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(activePeek)} onOpenChange={(open) => !open && setPeek(null)}>
        <DialogContent
          showCloseButton={false}
          className="task-side-peek left-auto right-0 top-0 h-dvh max-w-full translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-l border-[#e9e9e7] border-t-0 border-r-0 border-b-0 bg-white p-0 text-[#37352f] shadow-[-12px_0_32px_rgba(15,23,42,0.12)] sm:max-w-[720px]"
        >
          <DialogTitle className="sr-only">
            {renderedPeek?.type === "create" ? "Task baru" : "Detail task"}
          </DialogTitle>
          {renderedPeek?.type === "create" ? (
            <TaskCreateEditor
              mode="panel"
              initialRole={userRole}
              initialDate={renderedPeek.date}
              profiles={profiles}
              isAdmin={isAdmin}
              currentUserId={userId}
              currentUserName={userName}
              onClose={() => setPeek(null)}
              onCreated={() => {
                setPeek(null)
                router.refresh()
              }}
            />
          ) : renderedTaskId ? (
            <TaskEditor
              key={renderedTaskId}
              taskId={renderedTaskId}
              mode="panel"
              initialTask={renderedTask}
              initialRole={renderedTaskRole}
              assignee={renderedAssignee}
              creator={renderedCreator}
              profiles={profiles}
              isAdmin={isAdmin}
              onClose={() => setPeek(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FragmentGroup({
  date,
  group,
  collapsed,
  selectedTaskId,
  updatingId,
  updatingTitleId,
  isAdmin,
  userId,
  onToggleDate,
  onOpenTask,
  onOpenCreate,
  onDelete,
  onStatusChange,
  onTitleChange,
}: {
  date: string
  group: Task[]
  collapsed: boolean
  selectedTaskId: string | null
  updatingId: string | null
  updatingTitleId: string | null
  isAdmin: boolean
  userId: string
  onToggleDate: () => void
  onOpenTask: (taskId: string) => void
  onOpenCreate: () => void
  onDelete: (taskId: string) => void
  onStatusChange: (task: Task, status: string) => void
  onTitleChange: (task: Task, input: HTMLInputElement) => void
}) {
  return (
    <>
      <tr className="task-group-row">
        <td colSpan={8}>
          <button type="button" className="flex w-full items-center gap-2 text-left" onClick={onToggleDate}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="font-medium text-neutral-700">{formatTaskDateLabel(date)}</span>
            <span className="text-xs text-neutral-400">{date}</span>
            <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{group.length}</span>
          </button>
        </td>
      </tr>

      {!collapsed && group.map((task) => {
        const statusMeta = STATUS_META[task.status] || STATUS_META.pending
        const isSelected = selectedTaskId === task.id
        return (
          <tr
            key={task.id}
            tabIndex={0}
            onClick={() => onOpenTask(task.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onOpenTask(task.id)
              }
            }}
            className={isSelected ? "bg-[#f5f9ff]" : "cursor-pointer"}
            aria-selected={isSelected}
          >
            <td>
              <span className={`notion-dot ${statusMeta.dot} ml-3`} />
            </td>
            <td>
              <div className="flex min-w-[260px] items-center gap-2">
                <input
                  key={`${task.id}:${task.judul}`}
                  className="task-title-input min-w-0 flex-1"
                  defaultValue={task.judul}
                  aria-label={`Judul ${task.judul}`}
                  aria-busy={updatingTitleId === task.id}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={(event) => onTitleChange(task, event.currentTarget)}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === "Enter") {
                      event.preventDefault()
                      event.currentTarget.blur()
                    } else if (event.key === "Escape") {
                      event.currentTarget.value = task.judul
                      event.currentTarget.blur()
                    }
                  }}
                />
                {task.kuantitas_output && task.kuantitas_output > 1 && (
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    x{task.kuantitas_output}
                  </span>
                )}
              </div>
            </td>
            <td className="hidden text-xs capitalize text-neutral-500 md:table-cell">{task.kategori.replace("_", " ")}</td>
            <td className="hidden text-xs text-neutral-500 lg:table-cell">
              {task.kpi_bobot ?? task.kpi_level} <span className="text-neutral-300">(L{task.kpi_level})</span>
            </td>
            <td className="hidden text-xs text-neutral-500 lg:table-cell">{formatMenit(task.estimasi_waktu_menit)}</td>
            <td>
              <select
                className="notion-select text-xs"
                value={task.status}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onStatusChange(task, event.target.value)}
                disabled={updatingId === task.id}
                aria-label={`Ubah status ${task.judul}`}
              >
                <option value="pending">Pending</option>
                <option value="progress">Progress</option>
                <option value="review">Review</option>
                <option value="selesai">Selesai</option>
              </select>
            </td>
            <td>
              <PersonBadge profile={task.assignee} />
            </td>
            <td>
              <div className="flex items-center gap-0.5">
                {task.link_hasil && (
                  <a
                    href={task.link_hasil}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="notion-btn p-1"
                    aria-label={`Buka hasil ${task.judul}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpenTask(task.id)
                  }}
                  className="notion-btn p-1"
                  aria-label={`Edit ${task.judul}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {(isAdmin || task.user_id === userId || task.created_by === userId) && (
                  <button
                    className="notion-btn p-1 text-neutral-400 hover:text-red-500"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(task.id)
                    }}
                    aria-label={`Hapus ${task.judul}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )
      })}

      {!collapsed && (
        <tr className="task-new-row">
          <td colSpan={8}>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-400 transition-colors hover:bg-[#f7f7f5] hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2383e2]"
              onClick={onOpenCreate}
            >
              <Plus className="h-4 w-4" />
              New task
            </button>
          </td>
        </tr>
      )}
    </>
  )
}
