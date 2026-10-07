"use client";
import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";
export default function AdminLogin(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
 async function login(e){e.preventDefault();setBusy(true);setError("");const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setError(error.message);setBusy(false);return}window.location.href="/admin";}
 return <main className="adminLogin"><form onSubmit={login}><p className="eyebrow">TAKAKO WORLD</p><h1>ADMIN</h1><p>Creator access only.</p><label>EMAIL</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>PASSWORD</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>{error&&<p className="loginError">{error}</p>}<button disabled={busy}>{busy?"SIGNING IN...":"SIGN IN"}</button></form></main>
}
