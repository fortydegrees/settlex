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
  children,
}) => {
  return (
    <FeedPanel
      title={title}
      rootClassName={rootClassName}
      panelClassName={panelClassName}
      headerClassName={headerClassName}
      contentWrapClassName={contentWrapClassName}
      scrollClassName={scrollClassName}
      fadeClassName={fadeClassName}
      entryClassName={entryClassName}
      contentClassName={contentClassName}
      rows={rows}
      renderRow={renderRow}
    >
      {children}
    </FeedPanel>
  );
};

export const ChatPanel = React.memo(ChatPanelComponent);
ChatPanel.displayName = "ChatPanel";
