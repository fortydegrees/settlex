"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Popover } from "../../ui/Popover";
import { EMOJI_OPTIONS } from "../lobby/playerIdentityStorage";
import { MatchAlertControl } from "../matchAlerts/MatchAlertControl";
import { getPlayerColorOption } from "../theme/playerColors";
import { getSystemAccountMenuItems } from "./systemAccountMenuModel";

export function SystemAccountMenu({
  identity,
  accountStatus,
  hasIdentity,
  matchAlertDisplay,
  matchAlertLoading = false,
  matchAlertError = "",
  onMatchAlertAction = () => {},
  open,
  defaultOpen = false,
  onOpenChange,
  onEditIdentity,
  onOpenAccount,
  onOpenSignIn,
  onOpenSaveProfile,
  onSignOut,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (nextOpen) => {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const colorOption = getPlayerColorOption(identity.color || "gold");
  const displayName = identity.name || "Player";
  const displayEmoji = identity.emoji || EMOJI_OPTIONS[0];
  const isGuestProfile = accountStatus !== "claimed";
  const accountMenuItems = getSystemAccountMenuItems(accountStatus);
  const avatar = (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${colorOption.gradient} text-lg shadow-[0_12px_24px_-18px_rgba(15,23,42,0.72)] ring-1 ring-white/55 sm:h-11 sm:w-11 sm:text-xl`}
    >
      {displayEmoji}
    </span>
  );

  const handleMenuItem = (action) => {
    setIsOpen(false);

    if (action === "account" && hasIdentity) {
      onOpenAccount();
      return;
    }

    if (action === "saveProfile") {
      onOpenSaveProfile();
      return;
    }

    if (action === "signOut") {
      void onSignOut();
      return;
    }

    onEditIdentity();
  };

  if (!hasIdentity) {
    return (
      <button
        type="button"
        aria-label="Sign in"
        className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus min-h-[2.75rem] gap-2 px-4 text-sm"
        onClick={onOpenSignIn}
      >
        <UserCircleIcon
          className="h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <span>
          Sign in
        </span>
      </button>
    );
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      align="end"
      sideOffset={8}
      triggerAriaLabel="Open account menu"
      triggerClassName="settlex-ui-pane settlex-ui-focus inline-flex min-h-[2.75rem] max-w-[3rem] items-center gap-2 overflow-hidden rounded-full p-1 text-left font-semibold text-slate-800 sm:w-auto sm:max-w-[13rem] sm:pr-3"
      triggerContent={
        <>
          {avatar}
          <span className="hidden min-w-0 flex-1 sm:block">
            <span className="block max-w-[7.3rem] truncate text-sm font-semibold leading-5">
              {displayName}
            </span>
          </span>
          <ChevronDownIcon
            className="hidden h-4 w-4 shrink-0 text-slate-600 sm:block"
            aria-hidden="true"
          />
        </>
      }
      className="w-64 p-3"
    >
      <div
        className="mb-2 border-b border-slate-200/80 px-2 pb-3"
        role="none"
      >
        <div className="text-xs font-medium text-slate-600">
          {isGuestProfile ? "Playing as guest" : "Signed in as"}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${colorOption.gradient} text-sm shadow-[0_10px_20px_-16px_rgba(15,23,42,0.7)] ring-1 ring-white/70`}
          >
            {displayEmoji}
          </span>
          <span className="min-w-0 break-words text-sm font-semibold text-slate-900">
            {displayName}
          </span>
        </div>
      </div>
      <div className="grid gap-0.5" role="menu" aria-label="Account menu">
        {accountMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              className="settlex-ui-focus flex min-h-[2.75rem] items-center gap-3 rounded-lg px-2 text-left hover:bg-blue-100/60"
              onClick={() => handleMenuItem(item.action)}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center text-slate-600">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 text-sm font-medium text-slate-900">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <MatchAlertControl
        display={matchAlertDisplay}
        loading={matchAlertLoading}
        error={matchAlertError}
        surface="menu"
        onAction={onMatchAlertAction}
      />
    </Popover>
  );
}
