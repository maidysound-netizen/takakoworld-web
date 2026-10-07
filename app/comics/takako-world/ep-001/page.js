"use client";

import { useEffect, useState } from "react";
import { comicSeries, episodeImagePath } from "../../../data/comics";

const labels = { ko: "한국어", ja: "日本語", en: "English" };

export default function Episode() {
  const episode = comicSeries.episodes.find((e) => e.slug === "ep-001");
  const [lang, setLang] = useState("ko");

  useEffect(() => {
    const saved = window.localStorage.getItem("takako-language");
    if (["ko", "ja", "en"].includes(saved)) setLang(saved);
  }, []);

  function changeLanguage(next) {
    setLang(next);
    window.localStorage.setItem("takako-language", next);
  }

  return (
    <main className="reader">
      <div className="readerTop">
        <a href="/comics">← EPISODES</a>
        <div>
          <strong>{comicSeries.title}</strong>
          <span>EP.{String(episode.number).padStart(3, "0")} · {episode.title[lang]}</span>
        </div>
      </div>

      <div className="languageTabs" aria-label="Comic language">
        {Object.entries(labels).map(([code, label]) => (
          <button
            key={code}
            className={lang === code ? "active" : ""}
            onClick={() => changeLanguage(code)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="strip">
        {episode.images.map((img, i) => (
          <div className="comicPart" key={img}>
            <img
              src={episodeImagePath(episode, img)}
              loading={i === 0 ? "eager" : "lazy"}
              alt={"Episode " + episode.number + " part " + (i + 1)}
            />
            {(episode.dialogue || [])
              .filter((line) => line.image === img)
              .map((line) => (
                <div
                  className="dialogueLayer"
                  key={line.id}
                  style={{
                    left: line.position.left,
                    top: line.position.top,
                    width: line.position.width
                  }}
                >
                  {line.text[lang] || line.text.ko}
                </div>
              ))}
          </div>
        ))}
      </section>

      <div className="readerEnd">
        <p>TO BE CONTINUED</p>
        <a href="/comics">← Back to episodes</a>
      </div>
    </main>
  );
}
