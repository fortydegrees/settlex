import React, { useCallback, useState } from "react";
import {
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  FlagIcon,
  QuestionMarkCircleIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";
import { Popover } from "../../ui/Popover";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const menuItemClassName =
  "flex w-full items-center justify-between gap-3 rounded-[1rem] border px-3 py-2.5 text-left text-sm font-bold transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.985] motion-reduce:transition-none";
const neutralItemClassName =
  "border-white/[0.42] bg-white/[0.34] text-slate-800 hover:border-white/[0.62] hover:bg-white/[0.5]";
const dangerItemClassName =
  "border-rose-200/70 bg-rose-100/62 text-rose-700 hover:border-rose-200/90 hover:bg-rose-100/82";
const iconClassName = "h-5 w-5 shrink-0";

function MobileMatchMenuItem({
  icon,
  label,
  detail = null,
  tone = "neutral",
  onClick,
  ariaLabel,
}) {
  return (
    <button
      type="button"
      className={joinClassNames(
        menuItemClassName,
        tone === "danger" ? dangerItemClassName : neutralItemClassName
      )}
      onClick={onClick}
      aria-label={ariaLabel}
      data-allow-interaction="true"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {detail ? (
        <span className="shrink-0 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
          {detail}
        </span>
      ) : null}
    </button>
  );
}

export function MobileMatchMenu({
  isMuted,
  onToggleMute,
  onOpenGameRules,
  onOpenGameSettings,
  onResign,
  canResign = false,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const closeAndRun = useCallback((callback) => {
    setIsOpen(false);
    callback?.();
  }, []);

  const handleToggleMute = useCallback(() => {
    closeAndRun(() => {
      onToggleMute?.();
    });
  }, [closeAndRun, onToggleMute]);

  const handleOpenGameRules = useCallback(() => {
    closeAndRun(() => {
      onOpenGameRules?.();
    });
  }, [closeAndRun, onOpenGameRules]);

  const handleOpenGameSettings = useCallback(() => {
    closeAndRun(() => {
      onOpenGameSettings?.();
    });
  }, [closeAndRun, onOpenGameSettings]);

  const handleResign = useCallback(() => {
    closeAndRun(() => {
      onResign?.();
    });
  }, [closeAndRun, onResign]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      align="end"
      sideOffset={8}
      triggerAriaLabel="Open match menu"
      triggerClassName="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.44] bg-white/[0.3] text-slate-800 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.48),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-xl transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.96] hover:border-white/[0.62] hover:bg-white/[0.44] motion-reduce:transition-none"
      triggerContent={
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      }
      className="w-[15.75rem] border-white/[0.48] bg-[linear-gradient(180deg,rgba(219,234,254,0.94),rgba(191,219,254,0.84))] p-2.5 shadow-[0_24px_58px_-34px_rgba(15,23,42,0.72),inset_0_1px_0_rgba(255,255,255,0.38)]"
    >
      <div
        className="flex flex-col gap-1.5"
        data-mobile-match-menu="true"
        data-allow-interaction="true"
      >
        <MobileMatchMenuItem
          icon={
            isMuted ? (
              <SpeakerXMarkIcon className={iconClassName} aria-hidden="true" />
            ) : (
              <SpeakerWaveIcon className={iconClassName} aria-hidden="true" />
            )
          }
          label="Sound"
          detail={isMuted ? "Muted" : "On"}
          onClick={handleToggleMute}
          ariaLabel={isMuted ? "Unmute audio" : "Mute audio"}
        />
        <MobileMatchMenuItem
          icon={
            <QuestionMarkCircleIcon className={iconClassName} aria-hidden="true" />
          }
          label="Game rules"
          onClick={handleOpenGameRules}
        />
        <MobileMatchMenuItem
          icon={<Cog6ToothIcon className={iconClassName} aria-hidden="true" />}
          label="Settings"
          onClick={handleOpenGameSettings}
        />
        {canResign ? (
          <>
            <div className="my-1 h-px bg-white/[0.34]" aria-hidden="true" />
            <MobileMatchMenuItem
              icon={<FlagIcon className={iconClassName} aria-hidden="true" />}
              label="Resign match"
              tone="danger"
              onClick={handleResign}
            />
          </>
        ) : null}
      </div>
    </Popover>
  );
}
