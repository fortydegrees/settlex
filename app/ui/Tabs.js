"use client";

import React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "./cn";

// Panel tabs are distinct from SegmentedControl's mutually exclusive actions.
const TabValueContext = React.createContext(null);
export function Tabs({ value, children, ...props }) {
  return <TabValueContext.Provider value={value}>
    <BaseTabs.Root {...props} value={value} orientation="horizontal">{children}</BaseTabs.Root>
  </TabValueContext.Provider>;
}

export function TabsList({ label, options, className, ...props }) {
  return (
    <BaseTabs.List {...props} activateOnFocus aria-label={label}
      className={cn("settlehex-ui-tabs", className)}>
      {options.map((option) => (
        <BaseTabs.Tab key={option.value} value={option.value} disabled={option.disabled}
          className="settlehex-ui-choice settlehex-ui-tab settlehex-ui-focus type-action-small">
          {option.label}
        </BaseTabs.Tab>
      ))}
      <BaseTabs.Indicator className="settlehex-ui-tab-indicator" />
    </BaseTabs.List>
  );
}

export function TabsPanel({ value, children, className, ...props }) {
  const active = React.useContext(TabValueContext) === value;
  // Base UI may retain an ending panel until the next frame. Inactive content
  // must disappear immediately; only the selected indicator has an exit path.
  return <BaseTabs.Panel {...props} value={value} hidden={!active}
    className={cn("settlehex-ui-focus min-h-0", className)}>{active ? children : null}</BaseTabs.Panel>;
}
