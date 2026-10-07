"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { comicSeries, episodeImagePath } from "../../data/comics";

const emptyText = { ko: "", ja: "", en: "" };

export default function ComicEditor() {
  const episode = comicSeries.episodes[0];
  const [image, setImage] = useState(episode.images[0]);
  const [boxes, setBoxes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [previewLang, setPreviewLang] = useState("ko");
  const stageRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("takako-comic-editor-" + episode.slug);
    if (saved) {
      try { setBoxes(JSON.parse(saved)); } catch {}
    }
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
    const box = {
      id: "line-" + Date.now(),
      image,
      position: { left: Math.max(0, x - 12) + "%", top: Math.max(0, y - 4) + "%", width: "24%" },
      text: { ...emptyText }
    };
    persist([...boxes, box]);
    setSelected(box.id);
  }

  function moveBox(e, id) {
    e.preventDefault();
    e.stopPropagation();
    setSelected(id);
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
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function updateText(lang, value) {
    const next = boxes.map((b) => b.id === selected ? { ...b, text: { ...b.text, [lang]: value } } : b);
    persist(next);
  }

  function updateWidth(value) {
    const next = boxes.map((b) => b.id === selected ? { ...b, position: { ...b.position, width: value + "%" } } : b);
    persist(next);
  }

  function removeCurrent() {
    if (!selected) return;
    persist(boxes.filter((b) => b.id !== selected));
    setSelected(null);
  }

  function exportJSON() {
    const payload = JSON.stringify(boxes, null, 2);
    navigator.clipboard?.writeText(payload);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = episode.slug + "-dialogue.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return <main className="comicEditor">
    <aside className="editorPanel">
      <a href="/comics">← COMICS</a>
      <p className="eyebrow">TAKAKO TOOL</p>
      <h1>COMIC<br/>EDITOR</h1>
      <p className="editorHelp">이미지를 고른 뒤 말풍선 위치를 클릭하세요. 생성된 박스를 드래그해 옮기고 KR / JP / EN 대사를 입력합니다.</p>

      <label>IMAGE</label>
      <select value={image} onChange={(e) => { setImage(e.target.value); setSelected(null); }}>
        {episode.images.map((img) => <option key={img}>{img}</option>)}
      </select>

      <div className="editorLangs">
        {["ko","ja","en"].map((lang) => <button key={lang} className={previewLang===lang?"active":""} onClick={()=>setPreviewLang(lang)}>{lang.toUpperCase()}</button>)}
      </div>

      {current ? <div className="editorFields">
        <strong>SELECTED DIALOGUE</strong>
        <label>한국어</label><textarea value={current.text.ko} onChange={(e)=>updateText("ko",e.target.value)} />
        <label>日本語</label><textarea value={current.text.ja} onChange={(e)=>updateText("ja",e.target.value)} />
        <label>English</label><textarea value={current.text.en} onChange={(e)=>updateText("en",e.target.value)} />
        <label>BOX WIDTH {Math.round(parseFloat(current.position.width))}%</label>
        <input type="range" min="8" max="70" value={parseFloat(current.position.width)} onChange={(e)=>updateWidth(e.target.value)} />
        <button className="dangerButton" onClick={removeCurrent}>DELETE DIALOGUE</button>
      </div> : <p className="editorHint">말풍선 안을 클릭해서 첫 대사를 추가하세요.</p>}

      <button className="exportButton" onClick={exportJSON}>EXPORT DIALOGUE JSON</button>
      <small>자동 저장: 이 브라우저의 localStorage. Export 버튼은 JSON 다운로드와 클립보드 복사를 시도합니다.</small>
    </aside>

    <section className="editorWorkspace">
      <div className="editorToolbar"><b>{episode.slug.toUpperCase()}</b><span>{imageBoxes.length} dialogue boxes · preview {previewLang.toUpperCase()}</span></div>
      <div className="editorStage" ref={stageRef} onClick={addBox}>
        <img src={episodeImagePath(episode, image)} alt={image} draggable="false" />
        {imageBoxes.map((box) => <div
          key={box.id}
          className={"editorBox "+(selected===box.id?"selected":"")}
          style={{left:box.position.left,top:box.position.top,width:box.position.width}}
          onPointerDown={(e)=>moveBox(e,box.id)}
        >{box.text[previewLang] || box.text.ko || "대사 입력"}</div>)}
      </div>
    </section>
  </main>;
}
