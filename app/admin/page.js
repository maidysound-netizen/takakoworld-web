import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
export default async function Admin(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/admin/login");
 return <main className="page adminHome"><p className="eyebrow">PRIVATE CMS</p><h1>ADMIN</h1><p className="lead">Takako World creator tools.</p><section className="grid"><a className="card" href="/admin/comics/editor"><span>COMIC LETTERING</span><p>Dialogue · SFX · KR / JP / EN</p></a><div className="card"><span>NOVELS</span><p>Coming next.</p></div><div className="card"><span>GAMES</span><p>Coming next.</p></div></section></main>
}
