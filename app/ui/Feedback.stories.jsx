import { Button } from "./Button";
import { Banner } from "./Banner";
import { Panel } from "./Panel";

const meta = {
  title: "Components/Feedback and containers",
  component: Banner,
};

export default meta;

export const NeutralBanner = {
  args: {
    title: "Looking for another player",
    body: "We’ll keep this table ready while you wait.",
  },
};

export const DangerBanner = {
  args: {
    variant: "danger",
    title: "Couldn’t rejoin this match",
    body: "Return to the lobby and try again.",
  },
};

export const BannerWithActions = {
  render: () => (
    <Banner
      title="Match alerts are paused"
      body="Turn them back on to hear when another player arrives."
      actions={
        <>
          <Button variant="ghost" size="sm">Not now</Button>
          <Button size="sm">Resume alerts</Button>
        </>
      }
    />
  ),
};

export const PanelWithHeaderAction = {
  render: () => (
    <div className="max-w-xl">
      <Panel
        title="Open table"
        right={<Button variant="subtle" size="sm">Refresh</Button>}
      >
        <p className="text-sm leading-6 text-slate-700">
          One seat is open. Join when you’re ready to start the duel.
        </p>
      </Panel>
    </div>
  ),
};
