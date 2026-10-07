import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
export default async function AdminComicsLayout({children}){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/admin/login"); return children;
}
