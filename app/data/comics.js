export const siteLanguages = ["ko", "ja", "en"];

export const comicSeries = {
  slug: "takako-world",
  title: "TAKAKO WORLD",
  cover: "/takako-comic-cover.png",
  description: {
    ko: "Takako World 오리지널 웹툰 시리즈.",
    ja: "Takako World オリジナルウェブトゥーンシリーズ。",
    en: "Takako World original webtoon series."
  },
  episodes: [
    {
      number: 1,
      slug: "ep-001",
      title: {
        ko: "이자카야의 뜨거운 맥주 건배",
        ja: "居酒屋の熱いビール乾杯",
        en: "A Fiery Izakaya Toast"
      },
      thumbnail: "/takako-comic-cover.png",
      status: "IN PRODUCTION",
      access: "FREE",
      images: ["ta-1.png", "ta-2.png", "ta-3.png"],
      dialogue: []
    }
  ]
};

export function episodeImagePath(episode, image) {
  return "/comics/takako-world/" + episode.slug + "/" + image;
}
