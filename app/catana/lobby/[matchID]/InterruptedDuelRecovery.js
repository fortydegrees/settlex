"use client";

import { Banner } from "../../../ui/Banner";
import { Button } from "../../../ui/Button";
import { Panel } from "../../../ui/Panel";
import { CATANA_TABLE_BACKGROUND } from "../../theme/backgrounds";

export function InterruptedDuelRecovery({
  pending,
  error,
  onReturnToLobby,
  onLookAgain,
}) {
  return (
    <div
      className="min-h-screen"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
        <Panel bodyClassName="p-6 md:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">
            Match update
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 drop-shadow-sm">
            Duel interrupted
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            The other player left before the duel could begin. You can return
            to the lobby or look for another opponent now.
          </p>
          {error ? (
            <Banner
              variant="danger"
              title="Couldn’t leave the duel"
              body={error}
              className="mt-5"
            />
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={onReturnToLobby}
            >
              Return to lobby
            </Button>
            <Button
              className="w-full"
              disabled={pending}
              onClick={onLookAgain}
            >
              {pending ? "Checking duel…" : "Look again"}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
