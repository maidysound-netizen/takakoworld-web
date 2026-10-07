export const comicSeries = {
  slug: "takako-world",
  title: "TAKAKO WORLD",
  cover: "/takako-comic-cover.png",
  description: "Takako World original webtoon series.",
  episodes: [
    { number: 1, slug: "ep-001", title: "이자카야의 뜨거운 맥주 건배", thumbnail: "/takako-comic-cover.png", status: "IN PRODUCTION", access: "FREE", images: ["ta-1.png","ta-2.png","ta-3.png"] }
  ]
};
export function episodeImagePath(episode,image){ return "/comics/takako-world/"+episode.slug+"/"+image; }
