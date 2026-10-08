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

  if (error || !profile) redirect("/admin/forbidden");

  const role = profile.role;
  if (!["editor", "admin"].includes(role)) redirect("/admin/forbidden");

  return { supabase, user, role };
}
