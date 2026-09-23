import Link from "next/link";
import { Panel } from "../../ui/Panel";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";

export function UnavailableMatchPage({ matchID }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden text-ink-primary"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="absolute inset-0 bg-decoration-wash backdrop-blur-[2px]" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl items-center px-ui-4 py-ui-8">
        <Panel bodyClassName="p-ui-6 text-center sm:p-ui-8" className="w-full">
          <div className="type-caption text-ink-danger">
            Settlehex game
          </div>
          <h1 className="mt-ui-2 type-page text-ink-primary">
            Game unavailable
          </h1>
          <p className="mx-auto mt-ui-3 max-w-md type-body-small text-ink-secondary">
            This game may have been cancelled, expired, or already removed.
          </p>
          <Link
            href="/"
            className="settlex-ui-button settlex-ui-button-primary settlex-ui-focus mx-auto mt-ui-6 min-h-[2.95rem] px-ui-5 py-ui-3 type-action-small"
          >
            Back to lobby
          </Link>
          <div className="mt-ui-5 border-t border-edge-subtle pt-ui-4 break-all type-code-caption text-ink-muted">
            Game {matchID}
          </div>
        </Panel>
      </main>
    </div>
  );
}
