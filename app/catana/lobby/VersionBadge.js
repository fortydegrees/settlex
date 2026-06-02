"use client";

import { useState } from "react";

import { Popover } from "../../ui/Popover";
import { publicReleaseInfo } from "./releaseInfo";

export function VersionBadge({ releaseInfo = publicReleaseInfo }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-3 right-3 z-30 text-left">
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        align="end"
        sideOffset={9}
        triggerAriaLabel={`Show release notes for ${releaseInfo.releaseLabel}`}
        triggerClassName="rounded-full border border-white/45 bg-white/72 px-3 py-1.5 text-xs font-black tracking-[0.08em] text-slate-700 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.54),inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-md transition-[background-color,border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-white/65 hover:bg-white/88 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-white/85 motion-reduce:transition-none"
        triggerContent={releaseInfo.releaseLabel}
        className="w-[min(19rem,calc(100vw-1.5rem))] p-4 text-slate-800"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          What changed
        </div>
        <h2 className="mt-1 text-sm font-bold text-slate-900">
          Release {releaseInfo.version} · {releaseInfo.title}
        </h2>
        <ul className="mt-3 space-y-2 text-xs font-medium leading-relaxed text-slate-700">
          {releaseInfo.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500"
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-slate-200/70 pt-3 text-[11px] font-semibold text-slate-500">
          <div>Build {releaseInfo.buildShaShort}</div>
          {releaseInfo.buildDate ? <div>{releaseInfo.buildDate}</div> : null}
        </div>
      </Popover>
    </div>
  );
}
