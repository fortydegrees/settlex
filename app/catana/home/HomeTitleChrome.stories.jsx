import { useState } from "react";
import {
  expect,
  fn,
  userEvent,
  waitFor,
  within,
} from "@storybook/test";
import {
  guestIdentity,
  matchAlertFixtures,
  savedIdentity,
} from "../dev/storybook/accountFixtures";
import { publicReleaseInfo } from "../lobby/releaseInfo";
import { CATANA_TABLE_BACKGROUND } from "../theme/backgrounds";
import {
  buildSystemActions,
  HomeTitleChrome,
  SYSTEM_ACTIONS,
} from "./HomeTitleChrome";

const callbacks = {
  onEditIdentity: fn(),
  onMatchAlertAction: fn(),
  onOpenAccount: fn(),
  onOpenSaveProfile: fn(),
  onOpenSignIn: fn(),
  onSignOut: fn(),
  onSelectMode: fn(),
};

function HomeTitleChromeHarness(args) {
  const initialActionId = (args.systemActions ?? SYSTEM_ACTIONS).some(
    (action) => action.id === args.activeActionId
  )
    ? args.activeActionId
    : null;
  const [activeActionId, setActiveActionId] = useState(initialActionId);
  const [releaseOpen, setReleaseOpen] = useState(
    Boolean(args.releaseOpen)
  );

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <HomeTitleChrome
        {...args}
        activeActionId={activeActionId}
        isBusy={activeActionId != null}
        releaseInfo={publicReleaseInfo}
        releaseOpen={releaseOpen}
        onReleaseOpenChange={setReleaseOpen}
        onSelectMode={(mode) => {
          setActiveActionId(mode);
          args.onSelectMode(mode);
        }}
      />
    </div>
  );
}

const signedOutArgs = {
  identity: guestIdentity,
  accountStatus: "guest",
  hasIdentity: false,
  matchAlertDisplay: matchAlertFixtures.off,
  activeActionId: null,
};

const meta = {
  title: "Composed Surfaces/Lobby & Matchmaking/Homepage Title Chrome",
  component: HomeTitleChrome,
  parameters: { layout: "fullscreen" },
  render: (args) => <HomeTitleChromeHarness {...args} />,
  args: {
    ...signedOutArgs,
    ...callbacks,
  },
  argTypes: {
    identity: { control: false },
    accountStatus: { control: false },
    hasIdentity: { control: false },
    matchAlertDisplay: { control: false },
    matchAlertLoading: { control: false },
    matchAlertError: { control: false },
    activeActionId: { control: false },
    isBusy: { control: false },
    releaseInfo: { control: false },
    releaseOpen: { control: false },
  },
};

export default meta;

export const ClarityIdle = {};

export const ClarityFourModesIdle = {
  args: { systemActions: buildSystemActions({ settleGraphV2Enabled: true }) },
};

export const ClarityV2Starting = {
  args: {
    systemActions: buildSystemActions({ settleGraphV2Enabled: true }),
    activeActionId: "bot-v2",
  },
};

export const SignedOutIdle = {
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onSelectMode.mockClear();
    await userEvent.click(
      screen.getByRole("button", { name: /Play Online/ })
    );
    expect(args.onSelectMode).toHaveBeenCalledWith("queue");
    await waitFor(() =>
      expect(screen.getByText("Finding...")).toBeVisible()
    );
  },
};

export const GuestFindingOnline = {
  args: {
    identity: guestIdentity,
    accountStatus: "guest",
    hasIdentity: true,
    matchAlertDisplay: matchAlertFixtures.pausedResumable,
    activeActionId: "queue",
  },
};

export const ClaimedCreatingFriend = {
  args: {
    identity: savedIdentity,
    accountStatus: "claimed",
    hasIdentity: true,
    matchAlertDisplay: matchAlertFixtures.active,
    activeActionId: "friend",
  },
};

export const ClaimedStartingPuffer = {
  args: {
    identity: savedIdentity,
    accountStatus: "claimed",
    hasIdentity: true,
    matchAlertDisplay: matchAlertFixtures.active,
    activeActionId: "bot",
  },
};

export const SettleGraphV2Available = {
  args: {
    identity: savedIdentity,
    accountStatus: "claimed",
    hasIdentity: true,
    matchAlertDisplay: matchAlertFixtures.active,
    activeActionId: null,
    systemActions: buildSystemActions({ settleGraphV2Enabled: true }),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onSelectMode.mockClear();
    await userEvent.click(
      screen.getByRole("button", { name: /Play V2 Bot/ })
    );
    expect(args.onSelectMode).toHaveBeenCalledWith("bot-v2");
  },
};

export const ReleaseNotesOpen = {
  args: {
    ...signedOutArgs,
    releaseOpen: true,
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    if (canvasElement.ownerDocument.defaultView.innerWidth < 1024) {
      expect(
        screen.queryByRole("button", {
          name: `Show release notes for ${publicReleaseInfo.releaseLabel}`,
        })
      ).not.toBeInTheDocument();
      return;
    }
    const trigger = screen.getByRole("button", {
      name: `Show release notes for ${publicReleaseInfo.releaseLabel}`,
    });
    await waitFor(() =>
      expect(screen.getByText("Latest update")).toBeVisible()
    );
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(screen.queryByText("Latest update")).not.toBeInTheDocument()
    );
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByText("Latest update")).toBeVisible()
    );
  },
};

export const Mobile = {
  args: {
    identity: guestIdentity,
    accountStatus: "guest",
    hasIdentity: true,
    matchAlertDisplay: matchAlertFixtures.off,
    activeActionId: null,
  },
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};
