"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ListTodo, BarChart3, Settings, LogOut, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Task Harian", icon: ListTodo },
  { href: "/dashboard/laporan/bulanan", label: "Laporan Bulanan", icon: BarChart3 },
  { href: "/dashboard/admin/kpi", label: "Admin KPI", icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-svh">
      <aside className="notion-sidebar flex w-60 flex-col border-r border-[#e9e9e7]">
        <div className="flex h-12 items-center px-4 text-sm font-semibold tracking-tight">
          Kerjab
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "notion-sidebar-item",
                  isActive && "active font-medium"
                )}
              >
                <Icon className="h-4 w-4 opacity-60" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-[#e9e9e7] px-2 py-2">
          <button
            onClick={handleLogout}
            className="notion-sidebar-item w-full text-[#9ca3af]"
          >
            <LogOut className="h-4 w-4 opacity-60" />
            Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-white">
        <div className="mx-auto max-w-5xl px-12 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
