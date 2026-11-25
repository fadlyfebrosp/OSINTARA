"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Radar } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login"|"register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (result.error) setMessage(result.error.message);
      else if (mode === "register") setMessage("Pendaftaran berhasil. Periksa email untuk verifikasi jika diminta.");
      else location.href = "/dashboard";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tidak dapat terhubung ke layanan autentikasi.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-wrap"><section className="auth-card">
    <div className="brand-mark"><Radar size={26}/></div>
    <p className="eyebrow">OSINTARA / DIGITAL INTELLIGENCE</p>
    <h1>{mode === "login" ? "Welcome back." : "Create account."}</h1>
    <p className="muted">Discover Digital Footprints.</p>
    <form onSubmit={submit} className="form-stack">
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required placeholder="Minimum 8 characters"/></label>
      <button className="primary-btn" disabled={busy}>{busy ? "Processing..." : mode === "login" ? "Sign in" : "Create account"} <Shield size={16}/></button>
    </form>
    {message && <p className="notice">{message}</p>}
    <button className="link-btn" onClick={()=>{setMode(mode==="login"?"register":"login");setMessage("");}}>
      {mode==="login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Login"}
    </button>
  </section></main>;
}
