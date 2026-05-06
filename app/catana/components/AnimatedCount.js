"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import "./AnimatedCount.css";

const ANIMATION_CLEAR_MS = 520;

const toDisplayText = (value) => (value == null ? "" : String(value));

const toComparableNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function getAnimatedCountDirection(previousValue, nextValue) {
  const previous = toComparableNumber(previousValue);
  const next = toComparableNumber(nextValue);

  if (previous == null || next == null || previous === next) {
    return "steady";
  }

  return next > previous ? "increase" : "decrease";
}

export function AnimatedCount({
  value,
  motionValue = value,
  className = "",
  ariaLabel,
  animate = true,
}) {
  const initialText = toDisplayText(value);
  const initialMotionValue = motionValue;
  const [displayText, setDisplayText] = useState(initialText);
  const [previousText, setPreviousText] = useState(null);
  const [direction, setDirection] = useState("steady");
  const [animationKey, setAnimationKey] = useState(0);
  const displayTextRef = useRef(initialText);
  const motionValueRef = useRef(initialMotionValue);
  const clearPreviousTimeoutRef = useRef(null);

  const clearPreviousText = useCallback(() => {
    if (clearPreviousTimeoutRef.current != null) {
      window.clearTimeout(clearPreviousTimeoutRef.current);
      clearPreviousTimeoutRef.current = null;
    }

    setPreviousText(null);
  }, []);

  useEffect(() => {
    return () => {
      if (clearPreviousTimeoutRef.current != null) {
        window.clearTimeout(clearPreviousTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextText = toDisplayText(value);

    if (nextText === displayTextRef.current) {
      motionValueRef.current = motionValue;
      return;
    }

    const nextDirection = getAnimatedCountDirection(
      motionValueRef.current,
      motionValue
      );

    if (clearPreviousTimeoutRef.current != null) {
      window.clearTimeout(clearPreviousTimeoutRef.current);
      clearPreviousTimeoutRef.current = null;
    }

    setPreviousText(animate ? displayTextRef.current : null);
    setDirection(nextDirection);
    setDisplayText(nextText);
    setAnimationKey((currentKey) => currentKey + 1);

    if (animate) {
      clearPreviousTimeoutRef.current = window.setTimeout(
        clearPreviousText,
        ANIMATION_CLEAR_MS
      );
    }

    displayTextRef.current = nextText;
    motionValueRef.current = motionValue;
  }, [animate, clearPreviousText, motionValue, value]);

  const hasPrevious = previousText != null;

  return React.createElement(
    "span",
    {
      className: `animated-count ${className}`,
      "data-direction": direction,
      "data-animating": hasPrevious ? "true" : "false",
      "aria-live": "polite",
      "aria-atomic": "true",
      "aria-label": ariaLabel ?? displayText,
    },
    React.createElement(
      "span",
      {
        className: "animated-count__stack",
        "aria-hidden": "true",
      },
      hasPrevious
        ? React.createElement(
            "span",
            {
              key: `exit-${animationKey}`,
              className: "animated-count__value animated-count__value--exit",
            },
            previousText
          )
        : null,
      React.createElement(
        "span",
        {
          key: `enter-${animationKey}`,
          className: `animated-count__value ${
            hasPrevious ? "animated-count__value--enter" : ""
          }`,
          onAnimationEnd: clearPreviousText,
        },
        displayText
      )
    )
  );
}
