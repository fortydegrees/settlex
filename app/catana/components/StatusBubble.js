import React from "react";
import { STATUS_TYPES } from "../utils/gameStatus";
import "./StatusBubble.css";

const STATUS_ICONS = {
  [STATUS_TYPES.ROLLING]: "🎲",
  [STATUS_TYPES.THINKING]: "🤔",
  [STATUS_TYPES.MOVING_ROBBER]: "🦹",
  [STATUS_TYPES.STEALING]: "🤚",
  [STATUS_TYPES.DISCARDING]: "📤",
  [STATUS_TYPES.PLACING_SETTLEMENT]: "🏠",
  [STATUS_TYPES.PLACING_ROAD]: "🛤️",
  [STATUS_TYPES.PLACING_CITY]: "🏰",
};

export const StatusBubble = ({ statusType, isVisible }) => {
  const icon = STATUS_ICONS[statusType] || "❓";

  return (
    <div
      className={`status-bubble ${isVisible ? "status-bubble--visible" : "status-bubble--hidden"}`}
    >
      {/* Cloud made of overlapping ovals */}
      <div className="status-bubble__cloud">
        <span className="status-bubble__blob status-bubble__blob--1" />
        <span className="status-bubble__blob status-bubble__blob--2" />
        <span className="status-bubble__blob status-bubble__blob--3" />
        <span className="status-bubble__blob status-bubble__blob--4" />
        <span className="status-bubble__blob status-bubble__blob--5" />
        <span className="status-bubble__blob status-bubble__blob--6" />

        {/* Icon container */}
        <span className="status-bubble__icon">{icon}</span>
      </div>
    </div>
  );
};
