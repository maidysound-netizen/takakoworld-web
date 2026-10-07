"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { comicSeries, episodeImagePath } from "../../../data/comics";
import { createClient } from "../../../../utils/supabase/client";

const emptyText = { ko: "", ja: "", en: "" };
const defaultStyle = {
  fontSize: 28, fontWeight: 900, rotation: 0, letterSpacing: 0,
  color: "#111111", strokeColor: "#ffffff", strokeWidth: 0,
  opacity: 100, align: "center", vertical: false
};

export default function ComicEditor() {
  const episode = comicSeries.episodes[0];
  const [image, setImage] = useState(episode.images[0]);
  const [boxes, setBoxes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [previewLang, setPreviewLang] = useState("ko");
  const [tool, setTool] = useState("dialogue");
  const stageRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("takako-comic-editor-" + episode.slug);
    if (saved) { try { setBoxes(JSON.parse(saved)); } catch {} }
  }, [episode.slug]);

  const imageBoxes = useMemo(() => boxes.filter((b) => b.image === image), [boxes, image]);
  const current = boxes.find((b) => b.id === selected);

  function persist(next) {
    setBoxes(next);
    localStorage.setItem("takako-comic-editor-" + episode.slug, JSON.stringify(next));
  }

  function addBox(e) {
    if (e.target.closest(".editorBox")) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const isSfx = tool === "sfx";
    const box = {
      id: (isSfx ? "sfx-" : "line-") + Date.now(),
      type: tool,
      image,
      universal: false,
      position: {
        left: Math.max(0, x - (isSfx ? 15 : 12)) + "%",
        top: Math.max(0, y - 4) + "%",
        width: isSfx ? "30%" : "24%"
      },
      text: { ...emptyText },
      style: { ...defaultStyle, fontSize: isSfx ? 54 : 28, strokeWidth: isSfx ? 2 : 0 }
    };
    persist([...boxes, box]);
    setSelected(box.id);
  }

  function moveBox(e, id) {
    e.preventDefault(); e.stopPropagation(); setSelected(id);
    const start = boxes.find((b) => b.id === id);
    const stage = stageRef.current.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const left0 = parseFloat(start.position.left), top0 = parseFloat(start.position.top);
    function move(ev) {
      const left = Math.min(95, Math.max(0, left0 + ((ev.clientX - startX) / stage.width) * 100));
      const top = Math.min(98, Math.max(0, top0 + ((ev.clientY - startY) / stage.height) * 100));
      setBoxes((prev) => prev.map((b) => b.id === id ? { ...b, position: { ...b.position, left: left + "%", top: top + "%" } } : b));
    }
    function up() {
      setBoxes((prev) => { localStorage.setItem("takako-comic-editor-" + episode.slug, JSON.stringify(prev)); return prev; });
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  function patchCurrent(patch) {
    persist(boxes.map((b) => b.id === selected ? { ...b, ...patch } : b));
  }
  function updateText(lang, value) {
    persist(boxes.map((b) => b.id === selected ? { ...b, text: { ...b.text, [lang]: value } } : b));
  }
  function updatePosition(key, value) {
    persist(boxes.map((b) => b.id === selected ? { ...b, position: { ...b.position, [key]: value + "%" } } : b));
  }
  function updateStyle(key, value) {
    persist(boxes.map((b) => b.id === selected ? { ...b, style: { ...defaultStyle, ...(b.style || {}), [key]: value } } : b));
  }
  function removeCurrent() {
    if (!selected) return;
    persist(boxes.filter((b) => b.id !== selected)); setSelected(null);
  }
  function importJSONFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
        const valid = parsed.every((b) => b && typeof b.id === "string" && (b.type === "dialogue" || b.type === "sfx") && typeof b.image === "string" && b.position && b.text);
        if (!valid) throw new Error("Invalid lettering data");
        persist(parsed);
        setSelected(null);
        const firstImage = parsed.find((b) => episode.images.includes(b.image))?.image;
        if (firstImage) setImage(firstImage);
        alert("IMPORT COMPLETE · " + parsed.length + " items");
      } catch (err) {
        alert("IMPORT FAILED · 올바른 lettering JSON인지 확인하세요.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  async function saveCloud() {
    setCloudStatus("SAVING...");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCloudStatus("LOGIN REQUIRED"); return; }
    const { error } = await supabase.from("comic_lettering").upsert({
      owner_id: user.id,
      series_slug: comicSeries.slug,
      episode_slug: episode.slug,
      data: boxes,
      updated_at: new Date().toISOString()
    }, { onConflict: "owner_id,series_slug,episode_slug" });
    setCloudStatus(error ? "SAVE FAILED · " + error.message : "SAVED TO SUPABASE");
  }

  async function loadCloud() {
    setCloudStatus("LOADING...");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCloudStatus("LOGIN REQUIRED"); return; }
    const { data, error } = await supabase.from("comic_lettering").select("data").eq("owner_id", user.id).eq("series_slug", comicSeries.slug).eq("episode_slug", episode.slug).maybeSingle();
    if (error) { setCloudStatus("LOAD FAILED · " + error.message); return; }
    if (!data) { setCloudStatus("NO CLOUD DRAFT YET"); return; }
    persist(Array.isArray(data.data) ? data.data : []);
    setSelected(null);
    setCloudStatus("CLOUD DRAFT LOADED");
  }

  function exportJSON() {
    const payload = JSON.stringify(boxes, null, 2);
    navigator.clipboard?.writeText(payload);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = episode.slug + "-lettering.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function renderText(box) {
    if (box.type === "sfx" && box.universal) return box.text.ko || "SFX";
    return box.text[previewLang] || box.text.ko || (box.type === "sfx" ? "SFX" : "대사 입력");
  }

  function boxStyle(box) {
    const s = { ...defaultStyle, ...(box.style || {}) };
    const stroke = s.strokeWidth ? `${s.strokeWidth}px ${s.strokeColor}` : "0 transparent";
    return {
      left: box.position.left, top: box.position.top, width: box.position.width,
      color: s.color, opacity: s.opacity / 100, textAlign: s.align,
      fontSize: `clamp(10px, ${s.fontSize / 760 * 100}vw, ${s.fontSize}px)`,
      fontWeight: s.fontWeight, letterSpacing: s.letterSpacing + "px",
      transform: `rotate(${s.rotation}deg)`,
      WebkitTextStroke: stroke,
      writingMode: s.vertical ? "vertical-rl" : "horizontal-tb"
    };
  }

  const s = current ? { ...defaultStyle, ...(current.style || {}) } : defaultStyle;

  return <main className="comicEditor">
    <aside className="editorPanel">
      <a href="/comics">← COMICS</a>
      <p className="eyebrow">TAKAKO TOOL</p><h1>COMIC<br/>LETTERING</h1>
      <p className="editorHelp">DIALOGUE는 말풍선 대사, SFX는 효과음입니다. 도구를 고르고 이미지의 원하는 위치를 클릭하세요.</p>

      <label>IMAGE</label>
      <select value={image} onChange={(e) => { setImage(e.target.value); setSelected(null); }}>
        {episode.images.map((img) => <option key={img}>{img}</option>)}
      </select>

      <div className="editorTools">
        <button className={tool==="dialogue"?"active":""} onClick={()=>setTool("dialogue")}>+ DIALOGUE</button>
        <button className={tool==="sfx"?"active":""} onClick={()=>setTool("sfx")}>+ SFX 💥</button>
      </div>

      <div className="editorLangs">
        {["ko","ja","en"].map((lang) => <button key={lang} className={previewLang===lang?"active":""} onClick={()=>setPreviewLang(lang)}>{lang.toUpperCase()}</button>)}
      </div>

      {current ? <div className="editorFields">
        <strong>{current.type === "sfx" ? "SELECTED SFX" : "SELECTED DIALOGUE"}</strong>
        {current.type === "sfx" && <label className="checkLabel"><input type="checkbox" checked={!!current.universal} onChange={(e)=>patchCurrent({universal:e.target.checked})}/> UNIVERSAL, 모든 언어에서 KR 텍스트 그대로 사용</label>}
        <label>한국어</label><textarea value={current.text.ko} onChange={(e)=>updateText("ko",e.target.value)} />
        {!current.universal && <><label>日本語</label><textarea value={current.text.ja} onChange={(e)=>updateText("ja",e.target.value)} /><label>English</label><textarea value={current.text.en} onChange={(e)=>updateText("en",e.target.value)} /></>}

        <label>BOX WIDTH {Math.round(parseFloat(current.position.width))}%</label>
        <input type="range" min="5" max="80" value={parseFloat(current.position.width)} onChange={(e)=>updatePosition("width",e.target.value)} />

        {current.type === "sfx" && <div className="sfxControls">
          <label>FONT SIZE {s.fontSize}px</label><input type="range" min="12" max="140" value={s.fontSize} onChange={(e)=>updateStyle("fontSize",Number(e.target.value))}/>
          <label>ROTATION {s.rotation}°</label><input type="range" min="-180" max="180" value={s.rotation} onChange={(e)=>updateStyle("rotation",Number(e.target.value))}/>
          <label>LETTER SPACING {s.letterSpacing}px</label><input type="range" min="-5" max="30" value={s.letterSpacing} onChange={(e)=>updateStyle("letterSpacing",Number(e.target.value))}/>
          <label>STROKE {s.strokeWidth}px</label><input type="range" min="0" max="12" value={s.strokeWidth} onChange={(e)=>updateStyle("strokeWidth",Number(e.target.value))}/>
          <label>OPACITY {s.opacity}%</label><input type="range" min="10" max="100" value={s.opacity} onChange={(e)=>updateStyle("opacity",Number(e.target.value))}/>
          <div className="colorRow"><label>TEXT <input type="color" value={s.color} onChange={(e)=>updateStyle("color",e.target.value)}/></label><label>OUTLINE <input type="color" value={s.strokeColor} onChange={(e)=>updateStyle("strokeColor",e.target.value)}/></label></div>
          <div className="miniButtons">
            {["left","center","right"].map(a=><button key={a} className={s.align===a?"active":""} onClick={()=>updateStyle("align",a)}>{a.toUpperCase()}</button>)}
            <button className={s.vertical?"active":""} onClick={()=>updateStyle("vertical",!s.vertical)}>VERTICAL</button>
          </div>
        </div>}
        <button className="dangerButton" onClick={removeCurrent}>DELETE {current.type === "sfx" ? "SFX" : "DIALOGUE"}</button>
      </div> : <p className="editorHint">{tool==="sfx"?"효과음을 넣을 위치를 클릭하세요.":"말풍선 안을 클릭하세요."}</p>}

      <button className="exportButton" onClick={exportJSON}>EXPORT LETTERING JSON</button>
      <small>대사와 효과음은 브라우저에 자동 저장됩니다. EXPORT는 통합 lettering JSON을 저장합니다.</small>
    </aside>

    <section className="editorWorkspace">
      <div className="editorToolbar"><b>{episode.slug.toUpperCase()}</b><span>{imageBoxes.filter(b=>b.type!=="sfx").length} dialogue · {imageBoxes.filter(b=>b.type==="sfx").length} SFX · {previewLang.toUpperCase()}</span></div>
      <div className="editorStage" ref={stageRef} onClick={addBox}>
        <img src={episodeImagePath(episode, image)} alt={image} draggable="false" />
        {imageBoxes.map((box) => <div key={box.id}
          className={"editorBox "+(box.type==="sfx"?"sfxBox ":"dialogueBox ")+(selected===box.id?"selected":"")}
          style={boxStyle(box)} onPointerDown={(e)=>moveBox(e,box.id)}
        >{renderText(box)}</div>)}
      </div>
    </section>
  </main>;
}
