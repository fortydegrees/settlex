"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PostgameGameBoard } from "../../replay/PostgameGameBoard";
import { createLocalReplayReader } from "../../replay/localReplayFile";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { SETTLEHEX_TABLE_BACKGROUND } from "../../theme/backgrounds";
import { Panel } from "../../../ui/Panel";

export function ReplayImportClient({ gameId = null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setOffset(0); setFilter(query); }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const [payload, setPayload] = useState(null);
  const [library, setLibrary] = useState(null);
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const reader = useMemo(() => createLocalReplayReader({
    onReady: (next) => { setPayload(next); setLoadingId(null); },
    onError: (failure) => { setError(failure.message); setLoadingId(null); },
  }), []);
  useEffect(() => () => reader.cancel(), [reader]);
  useEffect(() => {
    const abort = new AbortController();
    if (gameId) return;
    setError(null); setLibrary(null);
    fetch(`/api/dev/local-replays?offset=${offset}&q=${encodeURIComponent(filter)}`, {signal:abort.signal,cache:"no-store",credentials:"omit"})
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load saved games.");
        if (!abort.signal.aborted) setLibrary(result);
      }).catch((failure) => { if (!abort.signal.aborted) setError(failure.message); });
    return () => abort.abort();
  }, [offset, refresh, filter, gameId]);

  useEffect(() => {
    if (!gameId) return;
    const abort = new AbortController();
    setPayload(null); setError(null); setLoadingId(gameId);
    void reader.read(async () => {
      const response = await fetch(`/api/dev/local-replays?game=${encodeURIComponent(gameId)}`, {signal:abort.signal,cache:"no-store",credentials:"omit"});
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not open replay.");
      return response.text();
    });
    return () => { reader.cancel(); abort.abort(); };
  }, [gameId, reader, refresh]);
  if (payload) return <>
    <PostgameGameBoard
      key={payload.replay.match.replayId}
      initialReplayPayload={payload}
      initialPerspectivePlayerID={payload.replay.initialPerspectivePlayerID}
      onReplayLibraryOpen={() => router.push("/dev/replay-import")}
    />
  </>;

  return <main className="min-h-screen p-ui-4 text-ink-primary sm:p-ui-6" style={{background:SETTLEHEX_TABLE_BACKGROUND}}>
    <div className="mx-auto max-w-5xl">
      <Panel title="Replay library" right={<Button size="sm" variant="subtle" onClick={() => { setOffset(0); setRefresh(value=>value+1); }}>Refresh</Button>}>
        <p className="mb-ui-4 type-body-small text-ink-secondary">Most recent games first. Results are for the first player shown.</p>
        {error ? <p role="alert" className="mb-ui-3 type-body-small text-ink-primary">{error}</p> : null}
        {gameId ? <div className="mb-ui-4"><Button size="sm" variant="subtle" onClick={() => router.push("/dev/replay-import")}>All replays</Button></div> : <div className="mb-ui-4">
          <label htmlFor="replay-search" className="mb-ui-2 block type-label text-ink-primary">Find a replay</label>
          <Input id="replay-search" className="w-full" placeholder="Search by ID or player name…" value={query} onChange={event=>setQuery(event.target.value)} />
        </div>}
        {!library && !error ? <p role="status" className="type-body-small text-ink-secondary">{loadingId ? "Opening replay…" : "Reading saved games…"}</p> : null}
        {library?.games.length === 0 ? <p className="type-body text-ink-secondary">{query ? "No replays match this search." : "No playable games found. Refresh after recording a game."}</p> : null}
        <div className="flex flex-col gap-ui-3">
          {library?.games.map(game => <article key={game.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-ui-3 rounded-control bg-surface-hover p-ui-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto_auto]">
            <span className={`col-start-1 row-start-1 justify-self-start rounded-small px-ui-3 py-ui-2 type-action-small sm:col-auto sm:row-auto ${game.outcome === "win" ? "bg-surface-positive text-ink-positive" : game.outcome === "loss" ? "bg-surface-hud-badge-danger text-ink-danger" : "bg-surface-inset text-ink-secondary"}`}>
              {game.outcome === "win" ? "Win" : game.outcome === "loss" ? "Loss" : game.captureStatus === "Partial capture" || !game.isComplete && !game.captureStatus ? "Partial" : "Finished"}
            </span>
            <div className="col-start-1 row-start-2 min-w-0 sm:col-auto sm:row-auto">
              <p className="break-words type-action text-ink-primary">{game.players[0]} <span className="type-body-small text-ink-secondary">vs</span> {game.players.slice(1).join(" / ")}</p>
              <p className="mt-ui-1 type-caption text-ink-secondary">
                {game.turnCount != null ? `${game.turnCount} turns · ` : ""}
                {new Date(game.recordedAt ?? game.modifiedAt).toLocaleString(undefined,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
              </p>
              <p className="mt-ui-1 truncate type-code-caption text-ink-muted" title={`${game.gameId ?? game.id} · ${game.checkpoint ?? "Unknown checkpoint"}`}>
                {(game.gameId ?? game.id).replace(/\.(?:jsonl|replay\.json)$/, "").slice(0,13)} · {game.checkpoint ?? "Unknown checkpoint"}
              </p>
            </div>
            <div className="col-start-2 row-start-2 text-right sm:col-auto sm:row-auto sm:min-w-[5rem]">
              {game.scores?.every(score=>Number.isFinite(score)) && game.scores.length > 0 ? <>
                <p className="type-title text-ink-primary" aria-label={`Final score: ${game.players.map((player,index)=>`${player} ${game.scores[index]}`).join(", ")}`}>{game.scores.join("–")}</p>
                <p className="type-caption text-ink-secondary">Final score</p>
              </> : <p className="type-caption text-ink-muted">{game.captureStatus === "Partial capture" ? "Partial capture" : "Score unavailable"}</p>}
            </div>
            <Link prefetch={false} href={`/dev/replay-import/${encodeURIComponent(game.gameId ?? game.id)}`} className="settlehex-ui-button settlehex-ui-button-secondary settlehex-ui-focus col-start-2 row-start-1 px-ui-4 py-ui-3 type-action-small sm:col-auto sm:row-auto" aria-label={`Replay ${game.players.join(" vs ")}`}>
              Replay
            </Link>
          </article>)}
        </div>
        {library?.skipped ? <p className="mt-ui-3 type-caption text-ink-secondary">{library.skipped} captures without a playable board skipped.</p> : null}
        {library && library.total > 0 ? <div className="mt-ui-4 flex items-center justify-between gap-ui-3">
          <Button size="sm" variant="subtle" disabled={offset === 0} onClick={() => setOffset(Math.max(0,offset-20))}>Previous</Button>
          <span className="type-caption text-ink-secondary">{offset+1}–{offset+library.games.length} of {library.total}</span>
          <Button size="sm" variant="subtle" disabled={library.nextOffset === null} onClick={() => setOffset(library.nextOffset)}>Next</Button>
        </div> : null}
      </Panel>
    </div>
  </main>;
}
