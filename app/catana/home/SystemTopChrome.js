"use client";

import { SystemAccountMenu } from "./SystemAccountMenu";

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
    <div className="absolute right-3 top-3 z-30 flex items-center justify-end gap-3 sm:right-6 sm:top-6">
      <nav
        className="hidden items-center gap-1 text-sm font-medium text-slate-700 md:flex"
        aria-label="Settlehex links"
      >
        {HOME_TOP_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="settlex-ui-focus inline-flex min-h-[2.75rem] items-center rounded-lg px-2 hover:text-slate-900 hover:underline"
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
