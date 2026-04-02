import React from "react";
import { FeedPanel } from "./FeedPanel";

const ChatPanelComponent = ({
  title = "Chat",
  rootClassName,
  panelClassName,
  headerClassName,
  contentWrapClassName,
  scrollClassName,
  fadeClassName,
  entryClassName,
  contentClassName,
  rows,
  renderRow,
}) =>
  React.createElement(FeedPanel, {
    title,
    rootClassName,
    panelClassName,
    headerClassName,
    contentWrapClassName,
    scrollClassName,
    fadeClassName,
    entryClassName,
    contentClassName,
    rows,
    renderRow,
  });

export const ChatPanel = React.memo(ChatPanelComponent);
ChatPanel.displayName = "ChatPanel";
