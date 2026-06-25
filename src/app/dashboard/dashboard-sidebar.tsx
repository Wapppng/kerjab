"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRoundCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type DashboardSidebarProps = {
  isAdmin: boolean
  profileName: string
  profileRole: string
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  designer: "Desain Grafis",
  video_editor: "Videografer",
  copywriter: "Copywriter",
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Image
        src="/kerjab-icon.png"
        alt="Kerjab by wapp"
        width={32}
        height={32}
        className="h-7 w-7 object-contain"
        priority
      />
    )
  }

  return (
    <Image
      src="/kerjab-logo.png"
      alt="Kerjab by wapp"
      width={621}
      height={201}
      className="h-7 w-auto object-contain"
      priority
    />
  )
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

function SidebarNavigation({
  compact,
  navItems,
  settingsItems,
  pathname,
  profileName,
  profileRole,
  onNavigate,
  onLogout,
}: {
  compact: boolean
  navItems: NavItem[]
  settingsItems: NavItem[]
  pathname: string
  profileName: string
  profileRole: string
  onNavigate: () => void
  onLogout: () => void
}) {
  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  }

  return (
    <>
      <nav className="flex-1 space-y-0.5 px-2 py-2" aria-label="Navigasi utama">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={compact ? label : undefined}
            onClick={onNavigate}
            className={cn(
              "notion-sidebar-item min-h-8",
              compact && "justify-center px-2",
              isActive(href) && "active font-medium"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-60" />
            {!compact && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </nav>

      <div className="border-t border-[#e9e9e7] p-2">
        <div className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-neutral-600 shadow-sm ring-1 ring-black/5">
            {profileName.charAt(0).toUpperCase()}
          </span>
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-neutral-700">{profileName}</span>
              <span className="block truncate text-[11px] text-neutral-400">{roleLabels[profileRole] || profileRole}</span>
            </span>
          )}
        </div>
        {settingsItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={compact ? label : undefined}
            onClick={onNavigate}
            className={cn(
              "notion-sidebar-item mb-0.5 min-h-7",
              compact && "justify-center px-2",
              isActive(href) && "active font-medium"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-60" />
            {!compact && <span className="truncate">{label}</span>}
          </Link>
        ))}
        <button
          type="button"
          onClick={onLogout}
          title={compact ? "Keluar" : undefined}
          className={cn("notion-sidebar-item w-full text-[#9ca3af]", compact && "justify-center px-2")}
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-60" />
          {!compact && "Keluar"}
        </button>
      </div>
    </>
  )
}

export default function DashboardSidebar({ isAdmin, profileName, profileRole }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createClient()

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
    { href: "/dashboard/tasks", label: "Pekerjaan", icon: ListTodo },
    { href: "/dashboard/laporan/bulanan", label: "Laporan", icon: BarChart3 },
  ]

  const settingsItems: NavItem[] = isAdmin
    ? [
        { href: "/dashboard/admin/users", label: "Pengguna", icon: Users },
        { href: "/dashboard/admin/kpi", label: "Aturan KPI", icon: Settings },
      ]
    : [
        { href: "/dashboard/pengaturan", label: "Pengaturan", icon: UserRoundCog },
      ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[#e9e9e7] bg-white/95 px-4 backdrop-blur lg:hidden">
        <button type="button" className="notion-btn p-1.5" onClick={() => setMobileOpen(true)} aria-label="Buka navigasi">
          <Menu className="h-5 w-5" />
        </button>
        <BrandLogo />
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi" />
          <aside className="notion-sidebar relative flex h-full w-[min(88vw,280px)] flex-col border-r border-[#e9e9e7] shadow-xl">
            <div className="flex h-12 items-center justify-between px-4">
              <BrandLogo />
              <button type="button" className="notion-btn p-1.5" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNavigation
              compact={false}
              navItems={navItems}
              settingsItems={settingsItems}
              pathname={pathname}
              profileName={profileName}
              profileRole={profileRole}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <aside className={cn(
        "notion-sidebar sticky top-0 hidden h-svh shrink-0 flex-col border-r border-[#e9e9e7] transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-60"
      )}>
        <div className={cn("flex h-12 items-center px-3", collapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex min-w-0 items-center", !collapsed && "px-1")}>
            <BrandLogo compact={collapsed} />
          </div>
          <button
            type="button"
            className="notion-btn p-1.5 text-neutral-400"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <SidebarNavigation
          compact={collapsed}
          navItems={navItems}
          settingsItems={settingsItems}
          pathname={pathname}
          profileName={profileName}
          profileRole={profileRole}
          onNavigate={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      </aside>
    </>
  )
}
