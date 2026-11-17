import { z } from "zod";
import type { Kind } from "./actions";
import { openRouterClient } from "./openrouter";
import { claudeClient } from "./anthropic";

export type ClassifierClient = { complete(prompt: string): Promise<string> };

export type ClassifyResult = {
  category: string;
  isNew: boolean;
  confidence: number;
  summary: string;
  tags: string[];
  kind: Kind;
  title: string | null;
  subtitle: string | null;
  status: "sorted" | "review" | "pending";
};

export const REVIEW = "Review";
export const MIN_CONFIDENCE = 0.6;

const Reply = z.object({
  category: z.string().min(1),
  confidence: z.number().min(0).max(1),
  summary: z.string().default(""),
  tags: z.array(z.string()).default([]),
  kind: z.string().optional(),
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
});

const KINDS: Kind[] = ["music", "movie", "restaurant", "other"];

function entityOf(r: z.infer<typeof Reply>): { kind: Kind; title: string | null; subtitle: string | null } {
  const kind = KINDS.includes(r.kind as Kind) ? (r.kind as Kind) : "other";
  const title = r.title?.trim() || null;
  if (kind === "other" || !title) return { kind: "other", title: null, subtitle: null };
  return { kind, title, subtitle: r.subtitle?.trim() || null };
}

/** Free by default (OpenRouter). Uses Claude only if ANTHROPIC_API_KEY is set; AI_PROVIDER=claude|openrouter forces one. */
export function defaultClient(): ClassifierClient {
  const forced = process.env.AI_PROVIDER;
  const useClaude = forced ? forced === "claude" : !!process.env.ANTHROPIC_API_KEY;
  return useClaude ? claudeClient() : openRouterClient();
}

export function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no json object");
  return JSON.parse(stripped.slice(start, end + 1));
}

function reviewResult(status: "review" | "pending"): ClassifyResult {
  return { category: REVIEW, isNew: false, confidence: 0, summary: "", tags: [], kind: "other", title: null, subtitle: null, status };
}

function buildPrompt(caption: string, links: { github: string[]; youtube: string[] }, existing: string[]) {
  return [
    "You sort a person's saved Instagram reels into categories.",
    `Existing categories: ${existing.length ? existing.join(", ") : "(none yet)"}.`,
    "Rules:",
    "- Reuse an existing category whenever the reel fits it, including near-duplicates (e.g. reuse 'Gym' instead of inventing 'Fitness').",
    "- Only propose a new category if nothing existing fits. Use 1-3 words, Title Case, broad enough to hold many reels.",
    "- confidence is 0 to 1: how sure you are about the category.",
    "- tags: 3-8 lowercase search keywords, including synonyms someone might search for.",
    "- summary: one short sentence.",
    "- kind: 'music' if the reel is about a specific song, 'movie' for a specific movie or TV show, 'restaurant' for a specific restaurant, cafe or food place, otherwise 'other'.",
    "- title: for music the song name, for movie the movie/show name, for restaurant the place name. null if you cannot tell.",
    "- subtitle: music: the artist; movie: the release year; restaurant: area and city. null if unknown.",
    'Reply with ONLY JSON: {"category": string, "confidence": number, "summary": string, "tags": string[], "kind": string, "title": string|null, "subtitle": string|null}',
    "",
    `Caption: ${caption}`,
    links.github.length ? `GitHub links: ${links.github.join(" ")}` : "",
    links.youtube.length ? `YouTube links: ${links.youtube.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function classifyReel(
  input: { caption: string; links: { github: string[]; youtube: string[] } },
  existing: string[],
  client?: ClassifierClient,
): Promise<ClassifyResult> {
  const hasText = /[\p{L}\p{N}]{2,}/u.test(input.caption ?? "");
  const hasLinks = input.links.github.length + input.links.youtube.length > 0;
  if (!hasText && !hasLinks) return reviewResult("review");

  try {
    const c = client ?? defaultClient();
    const raw = await c.complete(buildPrompt(input.caption ?? "", input.links, existing));
    const parsed = Reply.parse(extractJson(raw));
    const match = existing.find((e) => e.toLowerCase() === parsed.category.trim().toLowerCase());
    const category = match ?? parsed.category.trim();
    const tags = parsed.tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
    if (parsed.confidence < MIN_CONFIDENCE) {
      return { ...reviewResult("review"), confidence: parsed.confidence, summary: parsed.summary, tags, ...entityOf(parsed) };
    }
    return {
      category,
      isNew: !match,
      confidence: parsed.confidence,
      summary: parsed.summary,
      tags,
      ...entityOf(parsed),
      status: "sorted",
    };
  } catch {
    return reviewResult("pending");
  }
}
