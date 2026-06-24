"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Kerjab</h1>
        <p className="mt-1 text-sm text-neutral-400">Masuk ke akun kamu</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-neutral-700">Email</label>
          <input
            className="notion-input mt-1"
            type="email" placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700">Password</label>
          <input
            className="notion-input mt-1"
            type="password" placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" className="notion-btn notion-btn-primary w-full justify-center" disabled={loading}>
          {loading ? "Memuat..." : "Masuk"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-400">
        Belum punya akun?{" "}
        <Link href="/register" className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
          Daftar
        </Link>
      </p>
    </div>
  )
}
