import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runScan } from "@/lib/scanners";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });

  try {
    const body = await request.json();
    const moduleName = String(body.module ?? "");
    const input = (body.input ?? {}) as Record<string, unknown>;
    const result = await runScan(moduleName, input);
    const queryValue = String(Object.values(input)[0] ?? "").slice(0, 255);
    const { data, error } = await supabase.from("scans").insert({
      user_id: user.id, module: moduleName, query_value: queryValue, result_json: result
    }).select("id, created_at").single();
    if (error) throw new Error("Hasil scan berhasil dibuat tetapi gagal disimpan ke riwayat: " + error.message);
    return NextResponse.json({ result, scan: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan." }, { status: 400 });
  }
}
