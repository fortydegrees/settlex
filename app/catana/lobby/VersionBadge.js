"use client";

import { useState } from "react";

import { MetaDisclosure } from "../../ui/MetaDisclosure";
import { publicReleaseInfo } from "./releaseInfo";

export function VersionBadge({ releaseInfo = publicReleaseInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const releaseText = releaseInfo.releaseLabel;

  return (
    <div className="mx-auto flex w-full max-w-xl justify-end px-4 pb-6 text-left sm:fixed sm:bottom-5 sm:right-5 sm:z-30 sm:mx-0 sm:w-auto sm:max-w-none sm:p-0">
      <MetaDisclosure
        open={isOpen}
        onOpenChange={setIsOpen}
        label={releaseText}
        ariaLabel={`Show release notes for ${releaseText}`}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          What changed
        </div>
        <h2 className="mt-1 text-sm font-bold text-slate-900">
          {releaseInfo.releaseLabel} · {releaseInfo.title}
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
      </MetaDisclosure>
    </div>
  );
}
