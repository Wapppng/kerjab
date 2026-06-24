"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    })

    if (error) { setError(error.message); setLoading(false); return }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Buat Akun</h1>
        <p className="mt-1 text-sm text-neutral-400">Daftar anggota tim baru</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-neutral-700">Nama</label>
          <input
            className="notion-input mt-1"
            placeholder="Nama lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
            type="password" placeholder="Min. 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required minLength={6}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" className="notion-btn notion-btn-primary w-full justify-center" disabled={loading}>
          {loading ? "Memuat..." : "Daftar"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-400">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
          Masuk
        </Link>
      </p>
    </div>
  )
}
