"use client";

import { SystemAccountMenu } from "./SystemAccountMenu";
import skyTextStyles from "./HomeSkyText.module.css";

const HOME_TOP_LINKS = [
  {
    label: "About",
    href: "#about",
  },
  {
    label: "Blog",
    href: "#blog",
  },
  {
    label: "Discord",
    href: "#discord",
  },
  {
    label: "Feedback",
    href: "#feedback",
  },
];

export function SystemTopChrome({
  identity,
  accountStatus,
  hasIdentity,
  matchAlertDisplay,
  matchAlertLoading = false,
  matchAlertError = "",
  onMatchAlertAction = () => {},
  open,
  defaultOpen,
  onOpenChange,
  onEditIdentity,
  onOpenAccount,
  onOpenSignIn,
  onOpenSaveProfile,
  onSignOut,
}) {
  return (
    <div className="absolute right-3 top-3 z-30 flex items-center justify-end gap-ui-3 sm:right-6 sm:top-6">
      <nav
        className={`hidden items-center gap-ui-1 type-label md:flex ${skyTextStyles.nav}`}
        aria-label="Settlehex links"
      >
        {HOME_TOP_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={`settlex-ui-focus inline-flex min-h-[2.75rem] items-center rounded-small px-ui-2 hover:underline ${skyTextStyles.link}`}
          >
            <span>
              {link.label}
            </span>
          </a>
        ))}
      </nav>
      <SystemAccountMenu
        identity={identity}
        accountStatus={accountStatus}
        hasIdentity={hasIdentity}
        matchAlertDisplay={matchAlertDisplay}
        matchAlertLoading={matchAlertLoading}
        matchAlertError={matchAlertError}
        onMatchAlertAction={onMatchAlertAction}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        onEditIdentity={onEditIdentity}
        onOpenAccount={onOpenAccount}
        onOpenSignIn={onOpenSignIn}
        onOpenSaveProfile={onOpenSaveProfile}
        onSignOut={onSignOut}
      />
    </div>
  );
}
