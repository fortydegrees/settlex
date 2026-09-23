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
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-ui-4 py-ui-10">
        <Panel bodyClassName="p-ui-5 sm:p-ui-6">
          <div className="settlex-ui-label">
            Match update
          </div>
          <h1 className="mt-ui-3 type-title text-ink-primary">
            Duel interrupted
          </h1>
          <p className="mt-ui-3 type-body-small text-ink-secondary">
            The other player left before the duel could begin. You can return
            to the lobby or look for another opponent now.
          </p>
          {error ? (
            <Banner
              variant="danger"
              title="Couldn’t leave the duel"
              body={error}
              className="mt-ui-5"
            />
          ) : null}
          <div className="mt-ui-6 flex flex-col gap-ui-3 sm:flex-row">
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
