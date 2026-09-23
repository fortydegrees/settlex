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
  "settlex-ui-game-menu-item settlex-ui-focus flex min-h-[2.75rem] w-full items-center justify-between gap-ui-3 rounded-control border px-ui-3 py-ui-2.5 text-left type-action-small transition-colors duration-[var(--settlex-ui-duration-fast)] motion-reduce:transition-none";
const neutralItemClassName =
  "settlex-ui-game-menu-item-neutral";
const dangerItemClassName =
  "settlex-ui-game-menu-item-danger";
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
      <span className="flex min-w-0 items-center gap-ui-2.5">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {detail ? (
        <span className="shrink-0 type-caption text-ink-muted">
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
      triggerClassName="settlex-ui-button settlex-ui-button-secondary settlex-ui-button-utility settlex-ui-game-utility h-11 w-11"
      triggerContent={
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      }
      className="!w-[15.75rem]"
    >
      <div
        className="flex flex-col gap-ui-1.5"
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
            <div className="my-ui-1 h-px bg-edge-subtle" aria-hidden="true" />
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
