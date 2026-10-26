import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { Button } from './Button';
import { Switch } from './Switch';
import { Disclosure } from './Disclosure';
import { ResizeRegion } from './ResizeRegion';
import { SegmentedControl } from './SegmentedControl';

const meta = { title: 'Components/Motion/Shared owners', parameters: { layout: 'padded' } };
export default meta;
function ContractFixture() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [cards, setCards] = useState(0);
  const [tall, setTall] = useState(false);
  const [mode, setMode] = useState('a');
  return <div className="grid max-w-lg gap-ui-5">
    <SegmentedControl label="Three options" value={mode} onValueChange={setMode} options={[{value:'a',label:'First'},{value:'b',label:'Second'},{value:'c',label:'Third',disabled:true}]} />
    <Switch checked={checked} onCheckedChange={setChecked}>Reveal fixture</Switch>
    <Switch checked disabled onCheckedChange={() => { throw new Error('Disabled switch fired'); }}>Disabled switch</Switch>
    <Disclosure open={open} onOpenChange={setOpen} trigger={<Button>Details</Button>}>
      <Button onClick={() => setOpen(false)}>Close from inside</Button>
    </Disclosure>
    <div className="flex gap-ui-2"><Button onClick={() => setCards(3)}>Add private cards</Button><Button onClick={() => setCards(0)}>Mask cards</Button></div>
    <ResizeRegion axis="width" data-testid="sizing-region">
      {cards > 0 && <div style={{width:240}}><button type="button">Private knight</button></div>}
    </ResizeRegion>
    <Button onClick={() => setTall(value => !value)}>Change content height</Button>
    <ResizeRegion data-testid="height-region"><div className="settlehex-ui-inset" style={{height:tall ? 200 : 40}}>Resizing content</div></ResizeRegion>
    <p className="type-caption">Following content stays below the region.</p>
  </div>;
}
export const InteractionContract = {
  render: () => <ContractFixture />,
  play: async ({canvasElement}) => {
    delete canvasElement.dataset.motionContract;
    const c = within(canvasElement);
    const toggle = c.getByRole('switch',{name:'Reveal fixture'});
    toggle.focus(); await userEvent.keyboard(' ');
    await expect(toggle).toHaveAttribute('aria-checked','true');
    await userEvent.click(c.getByRole('switch',{name:'Disabled switch'}));
    await userEvent.click(c.getByRole('button',{name:'Second',exact:true}));
    await expect(c.getByRole('button',{name:'Second',exact:true})).toHaveAttribute('aria-pressed','true');
    await userEvent.click(c.getByRole('button',{name:'Third',exact:true}));
    await expect(c.getByRole('button',{name:'Second',exact:true})).toHaveAttribute('aria-pressed','true');
    const trigger = c.getByRole('button',{name:'Details',exact:true});
    await userEvent.click(trigger);
    const close = await c.findByRole('button',{name:'Close from inside'});
    await userEvent.click(close);
    await expect(trigger).toHaveFocus();
    await expect(trigger).toHaveAttribute('aria-expanded','false');
    await expect(c.queryByRole('button',{name:'Close from inside'})).not.toBeInTheDocument();
    await userEvent.click(c.getByRole('button',{name:'Change content height'}));
    await waitFor(() => expect(c.getByTestId('height-region').getBoundingClientRect().height).toBe(200));
    await userEvent.click(c.getByRole('button',{name:'Change content height'}));
    await waitFor(() => expect(c.getByTestId('height-region').getBoundingClientRect().height).toBe(40));
    await userEvent.click(c.getByRole('button',{name:'Add private cards'}));
    await waitFor(() => expect(c.getByTestId('sizing-region').getBoundingClientRect().width).toBe(240));
    await userEvent.click(c.getByRole('button',{name:'Mask cards'}));
    await expect(c.queryByText('Private knight')).not.toBeInTheDocument();
    await waitFor(() => expect(c.getByTestId('sizing-region').getBoundingClientRect().width).toBe(0));
    canvasElement.dataset.motionContract = 'passed';
  },
};
