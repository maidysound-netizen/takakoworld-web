import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";

const MAX_ITEMS = 80;

function getOutputText(response) {
  for (const item of response?.output || []) {
    if (item?.type !== "message") continue;
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || !["editor", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "EDITOR_ACCESS_REQUIRED" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY_MISSING" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const rawItems = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [];
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 3000) : "";

  const items = rawItems
    .filter((item) =>
      item &&
      typeof item.id === "string" &&
      (item.type === "dialogue" || item.type === "sfx") &&
      typeof item.ko === "string" &&
      item.ko.trim() &&
      item.universal !== true
    )
    .map((item) => ({
      id: item.id,
      type: item.type,
      ko: item.ko,
      ja: typeof item.ja === "string" ? item.ja : "",
      en: typeof item.en === "string" ? item.en : ""
    }))
    .filter((item) => !item.ja.trim() || !item.en.trim());

  if (!items.length) {
    return NextResponse.json({ translations: [], skipped: rawItems.length });
  }

  const instructions = [
    "You translate Korean webtoon lettering into natural Japanese and English.",
    "Return translations only for the supplied IDs.",
    "Never change IDs.",
    "If an existing ja or en field is non-empty, copy it exactly and do not rewrite it.",
    "Dialogue: preserve character voice, politeness level, emotional intensity, punctuation, and comic timing.",
    "SFX: prefer natural manga/comic sound-effect wording rather than literal dictionary translation.",
    "Keep translations compact enough for speech balloons. Preserve deliberate line-break rhythm when useful, but prioritize natural target-language lettering.",
    "Names, brand names, URLs, and intentionally English source text should be preserved when appropriate.",
    "Do not translate content marked universal. Universal items are normally filtered before this request.",
    notes ? "Creator translation notes:\n" + notes : ""
  ].filter(Boolean).join("\n");

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      translations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            ja: { type: "string" },
            en: { type: "string" }
          },
          required: ["id", "ja", "en"]
        }
      }
    },
    required: ["translations"]
  };

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATION_MODEL || "gpt-5.6-luna",
      instructions,
      input: JSON.stringify({ items }),
      text: {
        format: {
          type: "json_schema",
          name: "comic_translations",
          strict: true,
          schema
        }
      },
      max_output_tokens: 5000,
      store: false
    })
  });

  const response = await apiResponse.json();

  if (!apiResponse.ok) {
    const message = response?.error?.message || "OPENAI_REQUEST_FAILED";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const outputText = getOutputText(response);
  if (!outputText) {
    return NextResponse.json({ error: "EMPTY_TRANSLATION_RESPONSE" }, { status: 502 });
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    return NextResponse.json({ error: "INVALID_TRANSLATION_RESPONSE" }, { status: 502 });
  }

  const allowedIds = new Set(items.map((item) => item.id));
  const translations = (Array.isArray(parsed?.translations) ? parsed.translations : [])
    .filter((item) => item && allowedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      ja: typeof item.ja === "string" ? item.ja : "",
      en: typeof item.en === "string" ? item.en : ""
    }));

  return NextResponse.json({
    translations,
    translated: translations.length,
    model: process.env.OPENAI_TRANSLATION_MODEL || "gpt-5.6-luna"
  });
}
