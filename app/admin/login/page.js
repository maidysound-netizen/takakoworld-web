"use client";
import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";

export default function AdminLogin(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function login(e){
    e.preventDefault(); setBusy(true); setError("");
    const supabase=createClient();
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setError(error.message);setBusy(false);return}
    window.location.href="/admin";
  }

  return <main className="adminLogin" style={{minHeight:"calc(100vh - 150px)",padding:"48px 18px 90px"}}>
    <form onSubmit={login} style={{width:"100%",maxWidth:430,margin:"0 auto",padding:28,border:"1px solid #2b2b2b",background:"#0d0d0d"}}>
      <p className="eyebrow">TAKAKO WORLD</p>
      <h1 style={{fontSize:"clamp(54px,14vw,76px)",lineHeight:.86,margin:"16px 0 20px"}}>ADMIN</h1>
      <p style={{color:"#888",margin:"0 0 28px"}}>Creator access only.</p>

      <label htmlFor="admin-email" style={{display:"block",margin:"18px 0 7px",fontSize:11,letterSpacing:".14em",color:"#aaa"}}>EMAIL</label>
      <input id="admin-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required
        style={{display:"block",width:"100%",height:50,padding:"0 13px",border:"1px solid #383838",background:"#151515",color:"#fff",fontSize:16}} />

      <label htmlFor="admin-password" style={{display:"block",margin:"18px 0 7px",fontSize:11,letterSpacing:".14em",color:"#aaa"}}>PASSWORD</label>
      <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required
        style={{display:"block",width:"100%",height:50,padding:"0 13px",border:"1px solid #383838",background:"#151515",color:"#fff",fontSize:16}} />

      {error&&<p className="loginError">{error}</p>}
      <button disabled={busy} style={{display:"block",width:"100%",height:50,marginTop:24,border:"1px solid #ff2f92",background:"#ff2f92",color:"#fff",fontWeight:900,letterSpacing:".12em"}}>
        {busy?"SIGNING IN...":"SIGN IN"}
      </button>
    </form>
  </main>;
}
