import { useState } from 'react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { SegmentedControl } from './SegmentedControl';

const meta = { title: 'Components/Forms/Segmented control', component: SegmentedControl };
export default meta;

export const Selection = {
  args: {
    label: 'Email auth mode', value: 'signIn', onValueChange: fn(),
    options: [{ value: 'signIn', label: 'Sign in' }, { value: 'signUp', label: 'Create account' }],
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <div className="max-w-md p-ui-5"><SegmentedControl {...args} value={value} onValueChange={next => { setValue(next); args.onValueChange(next); }} /></div>;
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Sign in', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const create = canvas.getByRole('button', { name: 'Create account' });
    await userEvent.tab();
    await userEvent.tab();
    await expect(create).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(create).toHaveAttribute('aria-pressed', 'true');
    await expect(args.onValueChange).toHaveBeenCalledWith('signUp');
  },
};

export const Disabled = {
  args: { ...Selection.args, disabled: true, onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Create account' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
