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
        className="hidden items-center gap-1 rounded-full px-1 text-[0.78rem] font-semibold text-white/90 md:flex"
        aria-label="Settlehex links"
      >
        {HOME_TOP_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="group/link relative inline-flex min-h-8 items-center rounded-full px-2 transition-[transform,color] duration-150 ease-out hover:-translate-y-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 active:translate-y-0 motion-reduce:transition-none"
          >
            <span className="drop-shadow-[0_1px_1px_rgba(15,23,42,0.26)]">
              {link.label}
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-x-2 bottom-1 h-px origin-left scale-x-0 rounded-full bg-white/70 transition-transform duration-150 ease-out group-hover/link:scale-x-100"
            />
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
