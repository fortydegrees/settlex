"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Popover } from "../../ui/Popover";
import { Button } from "../../ui/Button";
import { EMOJI_OPTIONS } from "../lobby/playerIdentityStorage";
import { MatchAlertControl } from "../matchAlerts/MatchAlertControl";
import { getPlayerColorOption } from "../theme/playerColors";
import { getSystemAccountMenuItems } from "./systemAccountMenuModel";
import styles from "./SystemAccountMenu.module.css";

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
      className={`settlex-ui-avatar settlex-ui-avatar-header grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-gradient-to-br ${colorOption.gradient} sm:h-11 sm:w-11`}
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
      <Button
        type="button"
        variant="utility"
        size="sm"
        className={styles.signedOutTrigger}
        aria-label="Sign in"
        onClick={onOpenSignIn}
      >
        <UserCircleIcon
          className="h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <span>
          Sign in
        </span>
      </Button>
    );
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      align="end"
      sideOffset={8}
      triggerAriaLabel="Open account menu"
      triggerClassName="settlex-ui-button settlex-ui-button-secondary settlex-ui-button-utility settlex-ui-focus min-h-[2.75rem] max-w-[3rem] gap-ui-2 p-ui-1 text-left select-none sm:w-auto sm:max-w-[13rem] sm:pr-ui-3"
      triggerContent={
        <>
          {avatar}
          <span className="hidden min-w-0 flex-1 sm:block">
            <span className="block max-w-[7.3rem] truncate type-action-small">
              {displayName}
            </span>
          </span>
          <ChevronDownIcon
            className="hidden h-4 w-4 shrink-0 text-ink-secondary sm:block"
            aria-hidden="true"
          />
        </>
      }
      className="w-64 p-ui-3"
    >
      <div
        className="mb-ui-2 border-b border-edge-subtle px-ui-2 pb-ui-3"
        role="none"
      >
        <div className="type-caption text-ink-secondary">
          {isGuestProfile ? "Playing as guest" : "Signed in as"}
        </div>
        <div className="mt-ui-1 flex min-w-0 items-center gap-ui-2">
          <span
            className={`settlex-ui-avatar grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-gradient-to-br ${colorOption.gradient}`}
          >
            {displayEmoji}
          </span>
          <span className="min-w-0 break-words type-action-small text-ink-primary">
            {displayName}
          </span>
        </div>
      </div>
      <div className="grid gap-ui-0.5" role="menu" aria-label="Account menu">
        {accountMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              className="settlex-ui-focus flex min-h-[2.75rem] items-center gap-ui-3 rounded-small px-ui-2 text-left hover:bg-surface-inset"
              onClick={() => handleMenuItem(item.action)}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center text-ink-secondary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 type-label text-ink-primary">
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
