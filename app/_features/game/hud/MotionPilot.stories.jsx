import React, { useRef, useState } from 'react';
import { buildTopology, createEmptyState, ResourceType } from '@settlehex/game-core';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { EffectsBoardWrapper } from 'bgio-effects/react';
import { PlayerActionContainer } from './PlayerActionContainer';
import { OpponentPlayerBox } from './OpponentPlayerBox';
import { Button } from '../../../ui/Button';
import { Switch } from '../../../ui/Switch';

const meta = { title: 'Motion Review/Production pilot', parameters: { layout: 'fullscreen' } };
export default meta;
const PlayerBarWithEffects = EffectsBoardWrapper(({ barProps }) => <PlayerActionContainer {...barProps} />);
function Pilot() {
  const [cards, setCards] = useState([]);
  const [shell, setShell] = useState(false);
  const cardRef = useRef(null);
  const core = createEmptyState(['0','1']);
  core.phase = 'normal';
  const player = { ...core.playerStateById['0'], id:'0', name:'HarbourFox', emoji:'🦊', color:'blue', resources:[ResourceType.WOOD,ResourceType.BRICK], devCards:cards };
  core.playerStateById['0'] = player;
  const bgioProps = { plugins:{}, G:{core,coreTopology:buildTopology([]),diceRoll:[1,1],devCardPlay:null}, ctx:{currentPlayer:'0',activePlayers:{'0':'postRoll'}}, playerID:'0', moves:{buyDevCard:fn(),playDevCardStart:fn(),rollDice:fn(),endTurn:fn()} };
  return <main className="min-h-screen p-ui-6">
    <div className="settlehex-ui-pane grid max-w-lg gap-ui-4 p-ui-5">
      <h1 className="type-section">Shared motion · real player bar</h1>
      <p className="type-body text-ink-secondary">Switch quickly between empty, one and several cards. The bar keeps moving from its current size in either direction.</p>
      <div className="flex flex-wrap gap-ui-2">
        <Button onClick={() => setCards([])}>No cards</Button>
        <Button onClick={() => setCards(['knight'])}>One card</Button>
        <Button onClick={() => setCards(['knight','yearOfPlenty','monopoly','roadBuilding'])}>Four cards</Button>
      </div>
      <Switch checked={shell} onCheckedChange={setShell}>Keep purchase target mounted</Switch>
    </div>
    <PlayerBarWithEffects {...bgioProps} barProps={{bgioProps, player, readOnly:true, showTurnControls:false, displayDevCards:cards, keepDevCardShellMounted:shell, devCardDisplayRef:cardRef, themeId:"classic"}} />
  </main>;
}
export const ResourceBar = {
  render: () => <Pilot />,
  play: async ({canvasElement}) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button',{name:'Four cards',exact:true}));
    await waitFor(() => expect(canvasElement.querySelector('#p0-devcards')).not.toBeNull());
    await userEvent.click(c.getByRole('button',{name:'No cards',exact:true}));
    expect(canvasElement.querySelector('#p0-devcards')).toBeNull();
    await userEvent.click(c.getByRole('switch',{name:'Keep purchase target mounted'}));
    await waitFor(() => expect(canvasElement.querySelector('#p0-devcards')).not.toBeNull());
    await userEvent.click(c.getByRole('switch',{name:'Keep purchase target mounted'}));
  },
};

function OpponentInventoryFixture() {
  const [cards, setCards] = useState([]);
  const [reveal, setReveal] = useState(true);
  const player = {id:'1',name:'Opponent',emoji:'🦊',color:'blue',resources:['Wood'],devCards:cards};
  return <main className="p-ui-6">
    <div className="mb-ui-6 flex flex-wrap gap-ui-2">
      <Button onClick={() => setCards([])}>No opponent cards</Button>
      <Button onClick={() => setCards(['knight','yearOfPlenty','monopoly','roadBuilding'])}>Four opponent cards</Button>
      <Switch checked={reveal} onCheckedChange={setReveal}>Reveal opponent hand</Switch>
    </div>
    <OpponentPlayerBox player={player} revealHand={reveal} themeId="classic" />
  </main>;
}
export const OpponentInventory = {
  render: () => <OpponentInventoryFixture />,
  play: async ({canvasElement}) => {
    delete canvasElement.dataset.motionContract;
    const c = within(canvasElement);
    const box = canvasElement.querySelector('#p1-opponent-box');
    const region = box.querySelector('[data-axis="width"]');
    const width = () => region.getBoundingClientRect().width;
    const contentWidth = () => region.firstElementChild.getBoundingClientRect().width;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const expectSettledWidth = () => waitFor(() => expect(Math.abs(width() - contentWidth())).toBeLessThan(1));

    // Hidden stacks resize intrinsically. The revealed replay hand intentionally
    // stays in its bounded, keyboard-scrollable viewport.
    await userEvent.click(c.getByRole('switch',{name:'Reveal opponent hand'}));
    await expectSettledWidth();
    const before = contentWidth();
    await userEvent.click(c.getByRole('button',{name:'Four opponent cards'}));
    expect(contentWidth()).toBeGreaterThan(before);
    if (!reducedMotion) expect(width()).toBeLessThan(contentWidth());
    await expectSettledWidth();
    await userEvent.click(c.getByRole('button',{name:'No opponent cards'}));
    expect(contentWidth()).toBe(before);
    if (!reducedMotion) expect(width()).toBeGreaterThan(contentWidth());
    await expectSettledWidth();

    await userEvent.click(c.getByRole('switch',{name:'Reveal opponent hand'}));
    await expectSettledWidth();
    const replayWidth = contentWidth();
    const hand = c.getByLabelText('Opponent hand');
    const resourceCounters = Array.from(box.querySelector('#p1-resources').querySelectorAll('[id]'));
    expect(resourceCounters).toHaveLength(5);
    for (const counter of resourceCounters) {
      expect(counter.getBoundingClientRect().left).toBeGreaterThanOrEqual(hand.getBoundingClientRect().left);
      expect(counter.getBoundingClientRect().right).toBeLessThanOrEqual(hand.getBoundingClientRect().right);
    }
    await userEvent.click(c.getByRole('button',{name:'Four opponent cards'}));
    expect(c.getByLabelText('Development cards')).toBeInTheDocument();
    expect(contentWidth()).toBe(replayWidth);
    await userEvent.click(c.getByRole('button',{name:'No opponent cards'}));
    expect(c.queryByLabelText('Development cards')).not.toBeInTheDocument();
    expect(contentWidth()).toBe(replayWidth);
    await userEvent.click(c.getByRole('button',{name:'Four opponent cards'}));
    await userEvent.click(c.getByRole('switch',{name:'Reveal opponent hand'}));
    expect(c.queryByLabelText('Opponent hand')).not.toBeInTheDocument();
    expect(c.queryByLabelText('Development cards')).not.toBeInTheDocument();
    await expectSettledWidth();
    canvasElement.dataset.motionContract = 'passed';
  },
};
