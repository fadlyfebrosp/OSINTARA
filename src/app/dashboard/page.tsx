import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: scans } = await supabase.from("scans")
    .select("id,module,query_value,result_json,created_at")
    .order("created_at", { ascending: false }).limit(10);
  return <Dashboard email={user.email ?? ""} initialScans={scans ?? []}/>;
}
