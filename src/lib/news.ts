import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const MODEL = "claude-opus-4-8";

export type NewsItem = {
  headline: string;
  summary: string;
  source?: string;
  url?: string;
};

const PROMPT = `Search the web once or twice for today's most important, current NFL news relevant to fantasy football -- injuries, trades, roster/depth chart moves, suspensions, coaching or scheme changes, and similar active storylines. Focus on genuinely recent, active news, not historical or generic background. Don't over-search -- a couple of well-chosen queries covering the top stories is enough.

Once you've searched, your final message must contain ONLY a JSON array and nothing else -- no preamble like "I'll search for...", no explanation of what you did, no markdown code fences. The very first character of your final message must be "[". Return 6 to 8 items, ordered by fantasy impact (most important first), each shaped exactly like:
{"headline": "string", "summary": "one or two sentences on why this matters for fantasy managers", "source": "string, the publisher name", "url": "string, a direct link to the source article"}`;

function extractJson(text: string): NewsItem[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`could not find a JSON array in the model's response: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("expected a JSON array of news items");
  return parsed;
}

// Refreshing this list is slow (a live web search + synthesis call) -- cache it in
// memory for a while so repeat visits in the same process don't re-pay that cost.
const CACHE_TTL_MS = 20 * 60 * 1000;
let cache: { data: NewsItem[]; fetchedAt: number } | null = null;

async function fetchBreakingNews(): Promise<NewsItem[]> {
  const tools: Anthropic.ToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: 3 },
  ];

  let messages: Anthropic.MessageParam[] = [{ role: "user", content: PROMPT }];
  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    output_config: { effort: "medium" },
    tools,
    messages,
  });

  // Server-tool loop hit its internal round limit before finishing -- resume once.
  if (response.stop_reason === "pause_turn") {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort: "medium" },
      tools,
      messages,
    });
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return extractJson(text);
}

export async function getBreakingNews(): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  const data = await fetchBreakingNews();
  cache = { data, fetchedAt: Date.now() };
  return data;
}
