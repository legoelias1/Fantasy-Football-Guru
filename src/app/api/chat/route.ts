import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/strategy-prompt";
import { TOOLS, callTool } from "@/lib/tools";
import type { UserLeague } from "@/lib/types";

const anthropic = new Anthropic();
const MODEL = "claude-opus-4-8";
const MAX_TOOL_ITERATIONS = 6;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const question: string = body.question;
  const leagueId: string | undefined = body.leagueId;
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  let league: UserLeague | null = null;
  if (leagueId) {
    const { data } = await supabase
      .from("user_leagues")
      .select("*")
      .eq("id", leagueId)
      .eq("user_id", user.id)
      .single();
    league = data as UserLeague | null;
  }

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];
  const system = buildSystemPrompt(league);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      return NextResponse.json({ answer: text });
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      try {
        const result = await callTool(supabase, block.name, block.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: err instanceof Error ? err.message : "tool execution failed",
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({ error: "too many tool iterations" }, { status: 500 });
}
