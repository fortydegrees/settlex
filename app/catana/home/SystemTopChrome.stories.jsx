import { fn } from "@storybook/test";
import {
  guestIdentity,
  matchAlertErrors,
  matchAlertFixtures,
  savedIdentity,
} from "../dev/storybook/accountFixtures";
import { CATANA_TABLE_BACKGROUND } from "../theme/backgrounds";
import { SystemTopChrome } from "./SystemTopChrome";

const callbacks = {
  onEditIdentity: fn(),
  onMatchAlertAction: fn(),
  onOpenAccount: fn(),
  onOpenSaveProfile: fn(),
  onOpenSignIn: fn(),
  onSignOut: fn(),
};

const signedOutArgs = {
  identity: guestIdentity,
  accountStatus: "guest",
  hasIdentity: false,
  matchAlertDisplay: matchAlertFixtures.off,
};

const guestResumeFailedArgs = {
  identity: guestIdentity,
  accountStatus: "guest",
  hasIdentity: true,
  matchAlertDisplay: matchAlertFixtures.pausedResumable,
  matchAlertError: matchAlertErrors.humanGamePaused,
  defaultOpen: true,
};

function TopChromeHarness(args) {
  return (
    <div
      className="relative min-h-[20rem] overflow-hidden rounded-[1.5rem]"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <SystemTopChrome {...callbacks} {...args} />
    </div>
  );
}

const meta = {
  title: "Composed Surfaces/Account & Identity/Homepage Top Chrome",
  component: SystemTopChrome,
  render: (args) => <TopChromeHarness {...args} />,
  argTypes: {
    accountStatus: { control: false },
    hasIdentity: { control: false },
    matchAlertDisplay: { control: false },
    matchAlertError: { control: false },
    matchAlertLoading: { control: false },
  },
};

export default meta;

export const SignedOut = {
  args: signedOutArgs,
};

export const GuestResumeFailed = {
  args: guestResumeFailedArgs,
};

export const ClaimedAlertsActive = {
  args: {
    identity: savedIdentity,
    accountStatus: "claimed",
    hasIdentity: true,
    matchAlertDisplay: matchAlertFixtures.active,
    defaultOpen: true,
  },
};

export const Mobile = {
  args: guestResumeFailedArgs,
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};
