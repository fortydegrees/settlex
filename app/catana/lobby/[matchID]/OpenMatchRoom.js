"use client";

import Link from "next/link";
import { Banner } from "../../../ui/Banner";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Panel } from "../../../ui/Panel";
import { Select } from "../../../ui/Select";
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
        <Panel bodyClassName="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="settlex-ui-label">
                Settlehex Room
              </div>
              <h1 className="mt-2 break-all text-2xl font-semibold text-slate-900">
                {matchID}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="settlex-ui-focus inline-flex min-h-[2.75rem] items-center text-sm font-medium text-blue-700 underline underline-offset-4"
                >
                  Back to lobby
                </Link>
                <Link
                  href="/account"
                  className="settlex-ui-focus inline-flex min-h-[2.75rem] items-center text-sm font-medium text-blue-700 underline underline-offset-4"
                >
                  Account
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasTakenSeats ? (
                <Button variant="secondary" size="sm" onClick={onSpectate}>
                  Spectate
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" onClick={onRefresh} disabled={isLoadingMatch}>
                {isLoadingMatch ? "Refreshing…" : "Refresh"}
              </Button>
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
            <section className="min-w-0">
              <h2 className="settlex-ui-heading mb-4">Join Seat</h2>
              <form className="space-y-3" onSubmit={onJoin}>
                <div>
                  <label
                    htmlFor="open-match-player-name"
                    className="settlex-ui-label block"
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
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="open-match-seat"
                    className="settlex-ui-label block"
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
                <Button
                  variant="secondary"
                  className="w-full whitespace-normal"
                  type="button"
                  onClick={onFillBots}
                  disabled={
                    botFillPending || joinPending || openSeats.length === 0
                  }
                >
                  {botFillPending
                    ? "Adding Bots…"
                    : "Fill Open Seats With Bots"}
                </Button>
                <div className="break-all text-xs text-slate-600">
                  Game server:{" "}
                  <span className="font-mono">{gameServer}</span>
                </div>
              </form>
            </section>

            <section className="min-w-0 border-t border-blue-100 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <h2 className="settlex-ui-heading mb-4">Seats</h2>
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
                        className={`settlex-ui-inset flex items-center justify-between gap-3 px-3 py-3 ${
                          taken
                            ? "text-slate-800"
                            : "text-slate-600"
                        }`}
                      >
                        <div className="shrink-0 text-sm font-medium">
                          Seat {Number(seat.id) + 1}
                        </div>
                        <div className="min-w-0 break-words text-right text-sm">
                          {taken ? displayName : "Open"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="settlex-ui-inset p-4 text-sm text-slate-700">
                  Match details unavailable.
                </div>
              )}
            </section>
          </div>
        </Panel>
      </div>
    </div>
  );
}
