"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { UserLeague } from "@/lib/types";

type MentionedPlayer = {
  id: string;
  name: string;
  position: string;
  headshotUrl: string | null;
};

type ChatEntry = {
  role: "user" | "assistant";
  text: string;
  players?: MentionedPlayer[];
};

export default function AssistantChat({ leagues }: { leagues: UserLeague[] }) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id ?? "");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setHistory((h) => [...h, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, leagueId: leagueId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "request failed");
      setHistory((h) => [...h, { role: "assistant", text: data.answer, players: data.players }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!leagues.length) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        You haven&apos;t set up a league yet.{" "}
        <Link href="/leagues" className="underline">
          Add one
        </Link>{" "}
        to get advice tailored to your draft position and scoring format.
      </p>
    );
  }

  return (
    <div>
      <label className="mb-4 block text-sm">
        League
        <select
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value)}
          className="mt-1 w-full rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.league_type}, {l.scoring.replace("_", " ")}, {l.team_count} teams,
              pick {l.draft_position})
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 flex min-h-[200px] flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/10">
        {!history.length && (
          <p className="text-sm text-black/50 dark:text-white/50">
            Ask something like &quot;Should I draft a RB or WR at pick {leagues.find((l) => l.id === leagueId)?.draft_position ?? 5} this year?&quot;
          </p>
        )}
        {history.map((entry, i) => (
          <div key={i} className={entry.role === "user" ? "font-medium" : ""}>
            <span className="mr-2 text-xs uppercase text-black/40 dark:text-white/40">
              {entry.role === "user" ? "You" : "Assistant"}
            </span>
            {entry.role === "assistant" ? (
              <div className="flex gap-4">
                {!!entry.players?.some((p) => p.headshotUrl) && (
                  <div className="flex flex-shrink-0 flex-col gap-2">
                    {entry.players
                      .filter((p) => p.headshotUrl)
                      .map((p) => (
                        <div key={p.id} className="text-center">
                          <Image
                            src={p.headshotUrl!}
                            alt={p.name}
                            width={140}
                            height={140}
                            className="rounded-lg bg-black/5 object-cover dark:bg-white/10"
                          />
                          <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                            {p.name}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                  <ReactMarkdown>{entry.text}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{entry.text}</p>
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-black/50 dark:text-white/50">Thinking…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a draft question…"
          className="flex-1 rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
