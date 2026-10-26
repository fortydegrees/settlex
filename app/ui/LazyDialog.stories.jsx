import React, { lazy, useState } from 'react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { LazyDialog } from './LazyDialog';
import { Button } from './Button';
import { AccountEntryModal } from '../_features/account/AccountEntryModal';

const Account = lazy(() => Promise.resolve({ default: AccountEntryModal }));
function Fixture() {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}>Open account</Button>
    <LazyDialog component={Account} open={open} mode="auth-first" onClose={() => setOpen(false)} />
  </>;
}
const meta = { title: 'Components/Motion/Lazy dialog lifecycle', parameters: { layout: 'padded' } };
export default meta;
export const CloseAndReset = {
  render: () => <Fixture />,
  play: async ({ canvasElement }) => {
    delete canvasElement.dataset.motionContract;
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole('button', {name:'Open account'}));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(screen.getByLabelText('Email'), 'motion@example.test');
    await userEvent.keyboard('{Escape}');
    // At normal speed the old popup must still exist while its shared exit runs.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('data-ending-style');
    }
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', {name:'Open account'}));
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('Email')).toHaveValue('');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    canvasElement.dataset.motionContract = 'passed';
  },
};

function ColdLoadFixture() {
  const [open, setOpen] = useState(false);
  const [entry] = useState(() => {
    let finish;
    const promise = new Promise(resolve => { finish = resolve; });
    return { Component: lazy(() => promise), finish: () => finish({default: AccountEntryModal}) };
  });
  return <>
    <Button onClick={() => setOpen(true)}>Request lazy account</Button>
    <Button onClick={() => setOpen(false)}>Cancel pending open</Button>
    <Button onClick={entry.finish}>Finish loading module</Button>
    <LazyDialog component={entry.Component} open={open} mode="auth-first" onClose={() => setOpen(false)} />
  </>;
}
export const ColdLoadCancelled = {
  render: () => <ColdLoadFixture />,
  play: async ({canvasElement}) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole('button',{name:'Request lazy account'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Cancel pending open'}));
    await userEvent.click(screen.getByRole('button',{name:'Finish loading module'}));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Request lazy account'}));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    canvasElement.dataset.motionContract = 'passed';
  },
};

const Identity = lazy(() => import('../_features/account/IdentityModal').then(m => ({default:m.IdentityModal})));
const Resign = lazy(() => import('../_features/game/dialogs/ResignConfirmDialog').then(m => ({default:m.ResignConfirmDialog})));
function CallerFixture({component, ...props}) {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}>Open surface</Button>
    <LazyDialog component={component} open={open} {...props} onClose={() => setOpen(false)} onOpenChange={setOpen} />
  </>;
}
export const IdentityReset = {
  render: () => <CallerFixture component={Identity} initialName="Ada" initialEmoji="🦊" initialColor="blue" />,
  play: async ({canvasElement}) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole('button',{name:'Open surface'}));
    const input = await screen.findByRole('textbox',{name:'Player name'});
    await userEvent.clear(input); await userEvent.type(input,'Changed');
    const dialog = screen.getByRole('dialog');
    await userEvent.keyboard('{Escape}');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) expect(dialog).toHaveAttribute('data-ending-style');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button',{name:'Open surface'}));
    expect(await screen.findByRole('textbox',{name:'Player name'})).toHaveValue('Ada');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    canvasElement.dataset.motionContract = 'passed';
  },
};
export const ResignExit = {
  render: () => <CallerFixture component={Resign} />,
  play: async ({canvasElement}) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole('button',{name:'Open surface'}));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(screen.getByRole('button',{name:'Cancel',exact:true}));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) expect(dialog).toHaveAttribute('data-ending-style');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    canvasElement.dataset.motionContract = 'passed';
  },
};
