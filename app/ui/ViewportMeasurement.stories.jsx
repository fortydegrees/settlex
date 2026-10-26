import React, { useState } from "react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import useWindowSize from "../../lib/client/useWindowSize";
import { Button } from "./Button";

function Viewport() {
  const viewport = useWindowSize();
  return <output aria-label="Measured viewport" style={{ visibility: viewport.isMeasured ? "visible" : "hidden" }}>
    {JSON.stringify(viewport)}
  </output>;
}

function Fixture() {
  const [mounted, setMounted] = useState(false);
  return <main className="p-ui-6">
    <Button onClick={() => setMounted(value => !value)}>{mounted ? "Unmount viewport" : "Mount viewport"}</Button>
    {mounted && <Viewport />}
  </main>;
}

const meta = { title: "Components/Layout/Viewport measurement", parameters: { layout: "fullscreen" } };
export default meta;

export const MountResizeUnmount = {
  render: () => <Fixture />,
  play: async ({ canvasElement }) => {
    delete canvasElement.dataset.viewportContract;
    const canvas = within(canvasElement);
    const win = canvasElement.ownerDocument.defaultView;
    const widthDescriptor = Object.getOwnPropertyDescriptor(win, "innerWidth");
    const heightDescriptor = Object.getOwnPropertyDescriptor(win, "innerHeight");
    const add = win.addEventListener;
    const remove = win.removeEventListener;
    const listeners = new Set();
    win.addEventListener = function (type, listener, options) {
      if (type === "resize") listeners.add(listener);
      return add.call(this, type, listener, options);
    };
    win.removeEventListener = function (type, listener, options) {
      if (type === "resize") listeners.delete(listener);
      return remove.call(this, type, listener, options);
    };
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Mount viewport" }));
      const output = canvas.getByLabelText("Measured viewport");
      expect(output).toBeVisible();
      expect(JSON.parse(output.textContent)).toEqual({ width: win.innerWidth, height: win.innerHeight, isMeasured: true });
      expect(listeners.size).toBe(1);
      Object.defineProperty(win, "innerWidth", { configurable: true, value: 390 });
      Object.defineProperty(win, "innerHeight", { configurable: true, value: 844 });
      win.dispatchEvent(new Event("resize"));
      await waitFor(() => expect(JSON.parse(output.textContent)).toEqual({ width: 390, height: 844, isMeasured: true }));
      Object.defineProperty(win, "innerWidth", { configurable: true, value: 1280 });
      Object.defineProperty(win, "innerHeight", { configurable: true, value: 720 });
      win.dispatchEvent(new Event("resize"));
      await waitFor(() => expect(JSON.parse(output.textContent)).toEqual({ width: 1280, height: 720, isMeasured: true }));
      await userEvent.click(canvas.getByRole("button", { name: "Unmount viewport" }));
      expect(canvas.queryByLabelText("Measured viewport")).not.toBeInTheDocument();
      expect(listeners.size).toBe(0);
      canvasElement.dataset.viewportContract = "passed";
    } finally {
      // Failed assertions must not leak browser overrides or subscriptions.
      for (const listener of listeners) remove.call(win, "resize", listener);
      win.addEventListener = add;
      win.removeEventListener = remove;
      if (widthDescriptor) Object.defineProperty(win, "innerWidth", widthDescriptor);
      else delete win.innerWidth;
      if (heightDescriptor) Object.defineProperty(win, "innerHeight", heightDescriptor);
      else delete win.innerHeight;
      win.dispatchEvent(new Event("resize"));
    }
  },
};
