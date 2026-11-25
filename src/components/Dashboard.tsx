"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  Globe,
  AtSign,
  Smartphone,
  Search,
  LogOut,
  Radar,
  History,
  ShieldCheck,
} from "lucide-react";

const modules = [
  {
    id: "ip",
    name: "IP Intelligence",
    desc: "Metadata jaringan & perkiraan geolokasi IP publik",
    field: "ip",
    placeholder: "8.8.8.8",
    icon: Globe,
  },
  {
    id: "domain",
    name: "Domain Intelligence",
    desc: "DNS, HTTP headers, dan sertifikat TLS",
    field: "domain",
    placeholder: "example.com",
    icon: Search,
  },
  {
    id: "email",
    name: "Email Intelligence",
    desc: "Syntax, MX, SPF, dan DMARC",
    field: "email",
    placeholder: "user@example.com",
    icon: AtSign,
  },
  {
    id: "username",
    name: "Username Checker",
    desc: "Pemeriksaan URL profil publik pada platform tertentu",
    field: "username",
    placeholder: "username",
    icon: Activity,
  },
  {
    id: "phone",
    name: "Phone Intelligence",
    desc: "Normalisasi dan petunjuk format nomor",
    field: "phone",
    placeholder: "+628123456789",
    icon: Smartphone,
  },
] as const;

type Scan = {
  id: string;
  module: string;
  query_value: string;
  result_json: unknown;
  created_at: string;
};

export default function Dashboard({
  email,
  initialScans,
}: {
  email: string;
  initialScans: Scan[];
}) {
  const [selected, setSelected] =
    useState<(typeof modules)[number]["id"]>("ip");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scans, setScans] = useState(initialScans);
  const active = modules.find((m) => m.id === selected)!;

  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: selected,
          input: { [active.field]: value },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Scan gagal.");
      setResult(data.result);
      const h = await fetch("/api/scans/history");
      const history = await h.json();
      if (history.scans) setScans(history.scans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    location.href = "/login";
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">
            <Radar size={22} />
          </span>
          <span>
            OSINTARA<small>DISCOVER DIGITAL FOOTPRINTS</small>
          </span>
        </div>
        <p className="side-label">WORKSPACE</p>
        <button className="nav-active">
          <Activity size={17} /> Intelligence Dashboard
        </button>
        <button
          className="nav-item"
          onClick={() =>
            document
              .getElementById("history")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <History size={17} /> Scan History
        </button>
        <div className="side-bottom">
          <div className="user-chip">
            <div className="avatar">{email.slice(0, 1).toUpperCase()}</div>
            <span>{email}</span>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <section className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">INTELLIGENCE WORKSPACE</p>
            <h1>Dashboard</h1>
          </div>
          <div className="status">
            <span /> SYSTEM OPERATIONAL
          </div>
        </header>
        <div className="welcome">
          <div>
            <p className="eyebrow">OSINTARA / OVERVIEW</p>
            <h2>Digital footprint analysis.</h2>
            <p className="muted">
              Kumpulkan dan analisis metadata yang tersedia secara publik.
            </p>
          </div>
          <div className="welcome-icon">
            <Radar size={48} />
          </div>
        </div>
        <div className="section-heading">
          <div>
            <h3>Intelligence modules</h3>
            <p className="muted">Pilih modul untuk memulai pemeriksaan.</p>
          </div>
          <span className="count">05 MODULES</span>
        </div>
        <div className="module-grid">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                className={`module-card ${selected === m.id ? "chosen" : ""}`}
                onClick={() => {
                  setSelected(m.id);
                  setValue("");
                  setResult(null);
                  setError("");
                }}
              >
                <div className="module-icon">
                  <Icon size={20} />
                </div>
                <h4>{m.name}</h4>
                <p>{m.desc}</p>
                <span className="module-action">SELECT MODULE ↗</span>
              </button>
            );
          })}
        </div>
        <section className="scan-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">ACTIVE MODULE</p>
              <h3>{active.name}</h3>
            </div>
            <span className="live-tag">READY</span>
          </div>
          <div className="scan-form">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={active.placeholder}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <button
              className="primary-btn"
              disabled={busy || !value.trim()}
              onClick={run}
            >
              {busy ? "Analyzing..." : "Run analysis"} <Activity size={16} />
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {result != null && (
            <div className="result-box">
              <div className="result-head">
                <h4>Analysis result</h4>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(result, null, 2),
                    )
                  }
                >
                  Copy JSON
                </button>
              </div>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </section>
        <section id="history" className="history-section">
          <div className="section-heading">
            <div>
              <h3>Recent scans</h3>
              <p className="muted">Riwayat analisis akun ini.</p>
            </div>
            <span className="count">{scans.length} RECORDS</span>
          </div>
          <div className="history-list">
            {scans.length === 0 ? (
              <p className="empty">Belum ada riwayat analisis.</p>
            ) : (
              scans.map((s) => (
                <div className="history-row" key={s.id}>
                  <div className="history-icon">
                    <ShieldCheck size={17} />
                  </div>
                  <div className="history-meta">
                    <b>{s.module.toUpperCase()}</b>
                    <span>{s.query_value}</span>
                  </div>
                  <time dateTime={s.created_at}>
                    {new Date(s.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
                  </time>
                  <button onClick={() => setResult(s.result_json)}>VIEW</button>
                </div>
              ))
            )}
          </div>
        </section>
        <footer>
          OSINTARA © {new Date().getFullYear()} · PUBLIC DATA ONLY · RESPONSIBLE
          INTELLIGENCE
        </footer>
      </section>
    </main>
  );
}
