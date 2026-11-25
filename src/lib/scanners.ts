import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";
import { z } from "zod";

const validPublicIp = (ip: string) => {
  const v = net.isIP(ip);
  if (!v) return false;
  if (v === 4) {
    const [a,b] = ip.split(".").map(Number);
    return !(a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      a >= 224);
  }
  const x = ip.toLowerCase();
  return !(x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") ||
    x.startsWith("fe80:") || x.startsWith("ff"));
};

const hostSchema = z.string().min(3).max(253).regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/i);

async function publicHost(host: string) {
  const normalized = host.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
  if (!hostSchema.safeParse(normalized).success) throw new Error("Hostname/domain tidak valid.");
  const records = await dns.lookup(normalized, { all: true, verbatim: true });
  if (!records.length || records.some(r => !validPublicIp(r.address))) {
    throw new Error("Domain tidak dapat di-resolve atau mengarah ke IP privat/reserved.");
  }
  return normalized;
}

export async function runScan(moduleName: string, raw: Record<string, unknown>) {
  switch (moduleName) {
    case "phone": {
      const phone = String(raw.phone ?? "").trim();
      if (!/^\+?[0-9][0-9\s().-]{5,24}$/.test(phone)) throw new Error("Format nomor tidak valid. Contoh: +628123456789.");
      const digits = phone.replace(/\D/g, "");
      return {
        input: phone, normalized_digits: digits,
        country_hint: phone.startsWith("+62") ? "Indonesia (+62)" : phone.startsWith("+1") ? "North America (+1)" : "Tidak dapat ditentukan",
        assessment: phone.startsWith("+62") && digits.length >= 10 && digits.length <= 15
          ? "Kemungkinan nomor Indonesia; validasi operator tidak dilakukan" : "Format dasar diterima",
        note: "Bukan validasi nomor aktif, identitas pemilik, atau lokasi perangkat."
      };
    }
    case "ip": {
      const ip = String(raw.ip ?? "").trim();
      if (!validPublicIp(ip)) throw new Error("Masukkan IP publik yang valid. IP privat/reserved tidak diproses.");
      const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(9000), cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Metadata IP tidak tersedia.");
      return {
        ip: data.ip, type: data.type, continent: data.continent, country: data.country,
        region: data.region, city: data.city, postal: data.postal,
        latitude: data.latitude, longitude: data.longitude, timezone: data.timezone?.id,
        isp: data.connection?.isp, organization: data.connection?.org,
        note: "Geolokasi IP adalah perkiraan lokasi jaringan, bukan GPS atau lokasi fisik seseorang."
      };
    }
    case "email": {
      const email = String(raw.email ?? "").trim();
      if (!z.string().email().safeParse(email).success) throw new Error("Format email tidak valid.");
      const domain = email.split("@").pop()!;
      const [mx, txt, dmarc] = await Promise.all([
        dns.resolveMx(domain).catch(() => []),
        dns.resolveTxt(domain).catch(() => []),
        dns.resolveTxt(`_dmarc.${domain}`).catch(() => [])
      ]);
      return {
        email, syntax: "Valid", domain, mx_present: mx.length > 0,
        mx_hosts: mx.map(x => ({ exchange: x.exchange, priority: x.priority })),
        spf_records: txt.flat().filter(x => x.toLowerCase().startsWith("v=spf1")),
        dmarc_records: dmarc.flat().filter(x => x.toLowerCase().startsWith("v=dmarc1")),
        note: "Tidak mengirim email dan tidak membuktikan mailbox dapat menerima pesan."
      };
    }
    case "domain": {
      const domain = await publicHost(String(raw.domain ?? "").trim());
      const [a, aaaa, mx, ns, txt] = await Promise.all([
        dns.resolve4(domain).catch(() => []), dns.resolve6(domain).catch(() => []),
        dns.resolveMx(domain).catch(() => []), dns.resolveNs(domain).catch(() => []),
        dns.resolveTxt(domain).catch(() => [])
      ]);
      const response = await fetch(`https://${domain}`, {
        method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(9000),
        headers: { "User-Agent": "OSINTARA/1.0 public-metadata-check" }
      }).catch(() => null);
      let tlsInfo: Record<string, unknown> = { checked: false };
      try {
        tlsInfo = await new Promise((resolve) => {
          const socket = tls.connect({ host: domain, port: 443, servername: domain, rejectUnauthorized: true, timeout: 7000 }, () => {
            const cert = socket.getPeerCertificate();
            resolve({ checked: true, subject: cert.subject?.CN ?? null, issuer: cert.issuer?.CN ?? null, valid_from: cert.valid_from, valid_to: cert.valid_to });
            socket.end();
          });
          socket.on("error", () => resolve({ checked: false }));
          socket.on("timeout", () => { socket.destroy(); resolve({ checked: false }); });
        });
      } catch {}
      return {
        domain, dns: { A: a, AAAA: aaaa, MX: mx, NS: ns, TXT: txt.flat().slice(0, 20) },
        https: response ? { status: response.status, headers: Object.fromEntries(response.headers.entries()) } : { reachable: false },
        tls: tlsInfo,
        note: "Metadata publik saja. Redirect tidak diikuti; bukan pemindaian kerentanan."
      };
    }
    case "username": {
      const username = String(raw.username ?? "").trim();
      if (!/^[A-Za-z0-9._-]{2,30}$/.test(username)) throw new Error("Username harus 2–30 karakter: huruf, angka, titik, _ atau -.");
      const sites = [
        ["GitHub", `https://github.com/${encodeURIComponent(username)}`],
        ["GitLab", `https://gitlab.com/${encodeURIComponent(username)}`],
        ["Reddit", `https://www.reddit.com/user/${encodeURIComponent(username)}`],
        ["Instagram", `https://www.instagram.com/${encodeURIComponent(username)}/`],
        ["TikTok", `https://www.tiktok.com/@${encodeURIComponent(username)}`]
      ] as const;
      const checks = await Promise.all(sites.map(async ([platform, url]) => {
        try {
          const r = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(7000), headers: { "User-Agent": "OSINTARA/1.0" } });
          return { platform, url, http_status: r.status, reachable: r.status >= 200 && r.status < 400 };
        } catch { return { platform, url, http_status: 0, reachable: false }; }
      }));
      return { username, checks, note: "Respons HTTP bukan bukti identitas atau kepemilikan akun. Platform dapat membatasi bot atau mengubah respons." };
    }
    default:
      throw new Error("Modul tidak dikenal.");
  }
}
