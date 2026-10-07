import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

export async function requireEditorAccess(){
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Migration-safe fallback: while the profiles table is not installed yet,
  // preserve the existing authenticated-admin workflow. Once profiles exists,
  // only editor/admin may continue.
  if (error) return { supabase, user, role: "legacy-authenticated" };

  const role = profile?.role || "user";
  if (!["editor", "admin"].includes(role)) redirect("/admin/forbidden");

  return { supabase, user, role };
}
