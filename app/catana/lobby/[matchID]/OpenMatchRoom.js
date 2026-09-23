"use client";

import Link from "next/link";
import { Banner } from "../../../ui/Banner";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Panel } from "../../../ui/Panel";
import { Select } from "../../../ui/Select";
import { GlassPillButton } from "../../components/GlassPillButton";
import { CATANA_TABLE_BACKGROUND } from "../../theme/backgrounds";
import { sanitizeDisplayName } from "../../utils/playerIdentity";

export function seatLabel(seat) {
  if (!seat) return "Seat";
  const id = Number.isFinite(Number(seat.id)) ? Number(seat.id) : null;
  if (!seat.name) return id != null ? `Open Seat ${id + 1}` : "Open Seat";
  return sanitizeDisplayName(seat.name) || seat.name;
}

export function OpenMatchRoom({
  matchID,
  gameServer,
  match,
  openSeats,
  hasTakenSeats,
  playerName,
  playerID,
  isLoadingMatch,
  joinPending,
  botFillPending,
  error,
  onPlayerNameChange,
  onSeatChange,
  onJoin,
  onSpectate,
  onRefresh,
  onFillBots,
}) {
  return (
    <div
      className="min-h-screen"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <Panel bodyClassName="p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-700">
                Settlehex Room
              </div>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 drop-shadow-sm">
                {matchID}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="text-sm font-semibold text-slate-800 underline decoration-white/60 hover:decoration-white"
                >
                  Back to lobby
                </Link>
                <Link
                  href="/account"
                  className="text-sm font-semibold text-slate-800 underline decoration-white/60 hover:decoration-white"
                >
                  Account
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasTakenSeats ? (
                <GlassPillButton onClick={onSpectate}>
                  Spectate
                </GlassPillButton>
              ) : null}
              <GlassPillButton onClick={onRefresh} disabled={isLoadingMatch}>
                {isLoadingMatch ? "Refreshing…" : "Refresh"}
              </GlassPillButton>
            </div>
          </div>

          {error ? (
            <Banner
              variant="danger"
              title="Match error"
              body={error}
              className="mt-4"
            />
          ) : null}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Panel title="Join Seat">
              <form className="space-y-3" onSubmit={onJoin}>
                <div>
                  <label
                    htmlFor="open-match-player-name"
                    className="block text-xs font-semibold uppercase tracking-widest text-slate-700"
                  >
                    Player name
                  </label>
                  <div className="mt-2">
                    <Input
                      id="open-match-player-name"
                      value={playerName}
                      onChange={(event) =>
                        onPlayerNameChange(event.target.value)
                      }
                      placeholder="Visitor"
                      autoComplete="nickname"
                      maxLength={28}
                      pattern="[A-Za-z0-9_]+"
                      title="Use English letters, numbers, and underscores only."
                      required
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="open-match-seat"
                    className="block text-xs font-semibold uppercase tracking-widest text-slate-700"
                  >
                    Seat
                  </label>
                  <div className="mt-2">
                    <Select
                      id="open-match-seat"
                      value={playerID}
                      onChange={(event) => onSeatChange(event.target.value)}
                      disabled={openSeats.length === 0}
                    >
                      {openSeats.length === 0 ? (
                        <option value="">No open seats</option>
                      ) : null}
                      {openSeats.map((seat) => (
                        <option key={seat.id} value={String(seat.id)}>
                          {seatLabel(seat)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={joinPending || openSeats.length === 0}
                  className="w-full"
                >
                  {joinPending ? "Joining…" : "Join & Play"}
                </Button>
                <GlassPillButton
                  type="button"
                  onClick={onFillBots}
                  disabled={
                    botFillPending || joinPending || openSeats.length === 0
                  }
                >
                  {botFillPending
                    ? "Adding Bots…"
                    : "Fill Open Seats With Bots"}
                </GlassPillButton>
                <div className="text-xs text-slate-700/80">
                  Game server:{" "}
                  <span className="font-mono">{gameServer}</span>
                </div>
              </form>
            </Panel>

            <Panel title="Seats">
              {isLoadingMatch && !match ? (
                <div className="h-24 animate-pulse rounded-lg bg-white/40 ring-1 ring-white/40 motion-reduce:animate-none" />
              ) : null}

              {match?.players ? (
                <div className="space-y-2">
                  {match.players.map((seat) => {
                    const taken = Boolean(seat.name);
                    const displayName =
                      sanitizeDisplayName(seat.name) || seat.name;
                    return (
                      <div
                        key={seat.id}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ${
                          taken
                            ? "bg-white/60 text-slate-800 ring-white/60"
                            : "bg-white/40 text-slate-700 ring-white/40"
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          Seat {Number(seat.id) + 1}
                        </div>
                        <div className="text-sm">
                          {taken ? displayName : "Open"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg bg-white/40 p-4 text-sm text-slate-700">
                  Match details unavailable.
                </div>
              )}
            </Panel>
          </div>
        </Panel>
      </div>
    </div>
  );
}
