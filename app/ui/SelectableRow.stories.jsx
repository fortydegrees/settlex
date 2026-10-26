import React, { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { SelectableRow } from './SelectableRow';
import { Button } from './Button';

const meta = { title: 'Components/Selectable Row', parameters: { layout: 'fullscreen' } };
export default meta;

function Fixture({ onActivate }) {
  const [current, setCurrent] = useState('First event');
  const [secondDisabled, setSecondDisabled] = useState(false);
  return <div className="settlehex-ui-hud w-80 max-w-full p-ui-4 space-y-ui-2">
    {['First event', 'Second event'].map((label) => <SelectableRow key={label}
      disabled={label === 'Second event' && secondDisabled}
      current={current === label ? 'step' : false} onActivate={() => { setCurrent(label); onActivate(label); }}>
      {label}
    </SelectableRow>)}
    <SelectableRow disabled onActivate={() => onActivate('Unavailable event')}>Unavailable event</SelectableRow>
    <SelectableRow>Read-only event</SelectableRow>
    <SelectableRow current="step">Read-only current event</SelectableRow>
    <Button variant="subtle" onClick={() => setSecondDisabled((value) => !value)}>Toggle second availability</Button>
  </div>;
}

export const InteractionContract = {
  args: { onActivate: fn() },
  render: (args) => <Fixture {...args} />,
  play: async ({ canvasElement, args }) => {
    delete canvasElement.dataset.motionContract;
    args.onActivate.mockClear();
    const user = userEvent.setup();
    const screen = within(canvasElement);
    const first = screen.getByRole('button', { name: 'First event' });
    const second = screen.getByRole('button', { name: 'Second event' });
    const disabled = screen.getByRole('button', { name: 'Unavailable event' });
    expect(first).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: 'Read-only event' })).not.toBeInTheDocument();
    await user.click(second);
    expect(second).toHaveAttribute('aria-current', 'step');
    expect(first).not.toHaveAttribute('aria-current');
    expect(second).toHaveFocus();
    expect(args.onActivate).toHaveBeenCalledTimes(1);
    first.focus();
    await user.keyboard('{Enter}');
    expect(first).toHaveAttribute('aria-current', 'step');
    expect(first).toHaveFocus();
    expect(args.onActivate).toHaveBeenCalledTimes(2);
    second.focus();
    const idleMaterial = getComputedStyle(second, '::before').backgroundColor;
    await user.keyboard('[Space>]');
    await waitFor(() => expect(getComputedStyle(second, '::before').opacity).toBe('1'));
    expect(getComputedStyle(second, '::before').backgroundColor).not.toBe(idleMaterial);
    expect(args.onActivate).toHaveBeenCalledTimes(2);
    await user.keyboard('[/Space]');
    expect(second).toHaveAttribute('aria-current', 'step');
    expect(args.onActivate).toHaveBeenCalledTimes(3);
    await user.keyboard('[Space>]');
    first.focus();
    await user.keyboard('[/Space]');
    await waitFor(() => expect(second).not.toHaveAttribute('data-keyboard-pressed'));
    expect(args.onActivate).toHaveBeenCalledTimes(3);
    second.focus();
    await user.keyboard('[Space>]');
    // A controlled availability change must cancel a held key even if the row
    // becomes enabled again before release, without relying on moving focus.
    const availability = screen.getByRole('button', { name: 'Toggle second availability' });
    availability.click();
    await waitFor(() => expect(second).toHaveAttribute('aria-disabled', 'true'));
    availability.click();
    await waitFor(() => expect(second).not.toHaveAttribute('aria-disabled', 'true'));
    await user.keyboard('[/Space]');
    expect(args.onActivate).toHaveBeenCalledTimes(3);
    args.onActivate.mockClear();
    await user.click(disabled);
    disabled.focus();
    await user.keyboard('{Enter} ');
    expect(args.onActivate).not.toHaveBeenCalled();
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    expect(disabled).toHaveAttribute('tabindex', '-1');
    canvasElement.dataset.motionContract = 'passed';
  },
};
