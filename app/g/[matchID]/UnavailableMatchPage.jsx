import Link from "next/link";
import { Panel } from "../../ui/Panel";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";

export function UnavailableMatchPage({ matchID }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden text-slate-900"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="absolute inset-0 bg-white/[0.08] backdrop-blur-[2px]" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8">
        <Panel bodyClassName="p-6 text-center sm:p-8" className="w-full">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-rose-700">
            Settlehex game
          </div>
          <h1 className="mt-2 text-3xl font-black leading-none text-slate-950 sm:text-4xl">
            Game unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-700">
            This game may have been cancelled, expired, or already removed.
          </p>
          <Link
            href="/"
            className="mx-auto mt-6 inline-flex min-h-[3.2rem] items-center justify-center rounded-[1.2rem] border border-lime-200/65 bg-[linear-gradient(180deg,rgba(132,204,22,1),rgba(101,163,13,0.96))] px-6 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_-22px_rgba(77,124,15,0.82)] transition-[transform,filter] duration-[var(--settlex-ui-duration-fast)] hover:-translate-y-0.5 hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 motion-reduce:transition-none"
          >
            Back to lobby
          </Link>
          <div className="mt-5 border-t border-white/45 pt-4 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
            Game {matchID}
          </div>
        </Panel>
      </main>
    </div>
  );
}
