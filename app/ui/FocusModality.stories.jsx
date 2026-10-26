import React from 'react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { Button } from './Button';
import { Input } from './Input';
import { Popover } from './Popover';

const meta = { title: 'Foundations/Keyboard focus' };
export default meta;

export const PointerAndKeyboard = {
  render: () => (
    <div className="settlehex-ui-pane mx-auto max-w-md space-y-ui-4 p-ui-6">
      <p className="type-body-small">Click or tap for quiet focus. Tab between controls to see the keyboard outline.</p>
      <Input aria-label="First field" placeholder="Click, then type" />
      <Input aria-label="Second field" placeholder="Tab here" />
      <Button variant="secondary">Continue</Button>
      <Popover triggerContent="Open focus example" triggerAriaLabel="Open focus example">
        <Input aria-label="Popover field" placeholder="Focus also works in portals" />
      </Popover>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('textbox', { name: 'First field' });
    const second = canvas.getByRole('textbox', { name: 'Second field' });
    const outline = (element) => element.ownerDocument.defaultView.getComputedStyle(element).outlineStyle;
    await userEvent.click(first);
    await expect(first).toHaveFocus();
    await expect(outline(first)).toBe('none');
    await userEvent.keyboard('Hello{ArrowLeft}');
    await expect(outline(first)).toBe('none');
    await userEvent.tab();
    await expect(second).toHaveFocus();
    await expect(outline(second)).toBe('solid');
    await userEvent.click(second);
    await expect(second).toHaveFocus();
    await expect(outline(second)).toBe('none');
    await userEvent.tab();
    const button = canvas.getByRole('button', { name: 'Continue' });
    await expect(button).toHaveFocus();
    await expect(outline(button)).toBe('solid');
    const trigger = canvas.getByRole('button', { name: 'Open focus example' });
    await userEvent.click(trigger);
    const portal = within(canvasElement.ownerDocument.body);
    const field = await portal.findByRole('textbox', { name: 'Popover field' });
    await userEvent.click(field);
    await expect(outline(field)).toBe('none');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.tab({ shift: true });
    await expect(button).toHaveFocus();
    await expect(outline(button)).toBe('solid');
  },
};
