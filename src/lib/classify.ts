import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type ClassifierClient = { complete(prompt: string): Promise<string> };

export type ClassifyResult = {
  category: string;
  isNew: boolean;
  confidence: number;
  summary: string;
  tags: string[];
  status: "sorted" | "review" | "pending";
};

export const REVIEW = "Review";
export const MIN_CONFIDENCE = 0.6;
export const MODEL = "claude-haiku-5-5";

const Reply = z.object({
  category: z.string().min(1),
  confidence: z.number().min(0).max(1),
  summary: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

export function defaultClient(): ClassifierClient {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return {
    async complete(prompt: string) {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });
      return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    },
  };
}

export function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no json object");
  return JSON.parse(stripped.slice(start, end + 1));
}

function reviewResult(status: "review" | "pending"): ClassifyResult {
  return { category: REVIEW, isNew: false, confidence: 0, summary: "", tags: [], status };
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
    'Reply with ONLY JSON: {"category": string, "confidence": number, "summary": string, "tags": string[]}',
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
      return { ...reviewResult("review"), confidence: parsed.confidence, summary: parsed.summary, tags };
    }
    return {
      category,
      isNew: !match,
      confidence: parsed.confidence,
      summary: parsed.summary,
      tags,
      status: "sorted",
    };
  } catch {
    return reviewResult("pending");
  }
}
