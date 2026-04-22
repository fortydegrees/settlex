import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import "./Die.css";
import { buildDieRollPlan } from "./dieRollPlan";

const BODY_ROLL_KEYFRAME_VARIANTS = [
  [
    { offset: 0, transform: "rotateX(90deg) rotateY(90deg) rotateZ(-90deg) translateX(0)" },
    { offset: 0.03, transform: "rotateX(-90deg) rotateY(-90deg) rotateZ(90deg) translateX(0)" },
    { offset: 0.06, transform: "rotateX(90deg) rotateY(180deg) rotateZ(-90deg) translateX(0)" },
    { offset: 0.12, transform: "rotateX(-180deg) rotateY(90deg) rotateZ(360deg) translateX(0)" },
    { offset: 0.24, transform: "rotateX(90deg) rotateY(-180deg) rotateZ(-90deg) translateX(0)" },
    { offset: 0.4, transform: "rotateX(-90deg) rotateY(-90deg) rotateZ(90deg) translateX(0)" }
  ],
  [
    { offset: 0, transform: "rotateX(-90deg) rotateY(180deg) rotateZ(0deg) translateX(0)" },
    { offset: 0.03, transform: "rotateX(180deg) rotateY(90deg) rotateZ(120deg) translateX(0)" },
    { offset: 0.06, transform: "rotateX(-90deg) rotateY(-270deg) rotateZ(-180deg) translateX(0)" },
    { offset: 0.12, transform: "rotateX(270deg) rotateY(45deg) rotateZ(360deg) translateX(0)" },
    { offset: 0.24, transform: "rotateX(-180deg) rotateY(180deg) rotateZ(540deg) translateX(0)" },
    { offset: 0.4, transform: "rotateX(90deg) rotateY(-90deg) rotateZ(720deg) translateX(0)" }
  ],
  [
    { offset: 0, transform: "rotateX(180deg) rotateY(-90deg) rotateZ(45deg) translateX(0)" },
    { offset: 0.03, transform: "rotateX(-180deg) rotateY(180deg) rotateZ(-135deg) translateX(0)" },
    { offset: 0.06, transform: "rotateX(90deg) rotateY(-270deg) rotateZ(225deg) translateX(0)" },
    { offset: 0.12, transform: "rotateX(-270deg) rotateY(90deg) rotateZ(-360deg) translateX(0)" },
    { offset: 0.24, transform: "rotateX(180deg) rotateY(180deg) rotateZ(540deg) translateX(0)" },
    { offset: 0.4, transform: "rotateX(-90deg) rotateY(0deg) rotateZ(720deg) translateX(0)" }
  ]
];

const SHADOW_ROLL_KEYFRAME_VARIANTS = [
  [
    { offset: 0, transform: "translateY(0) rotateZ(-90deg) scale(1)", opacity: 0.5, filter: "blur(5px)" },
    { offset: 0.03, transform: "translateY(0.2em) rotateZ(90deg) scale(0.85)", opacity: 0.5, filter: "blur(5px)" },
    { offset: 0.06, transform: "translateY(0.4em) rotateZ(-90deg) scale(0.7)", opacity: 0.5, filter: "blur(5px)" },
    { offset: 0.12, transform: "translateY(0.8em) rotateZ(360deg) scale(0.6)", opacity: 0.5, filter: "blur(5px)" },
    { offset: 0.24, transform: "translateY(0.9em) rotateZ(-90deg) scale(0.5)", opacity: 0.5, filter: "blur(4px)" },
    { offset: 0.4, transform: "translateY(0.9em) rotateZ(90deg) scale(0.5)", opacity: 0.5, filter: "blur(3px)" }
  ],
  [
    { offset: 0, transform: "translateY(0.05em) rotateZ(0deg) scale(1)", opacity: 0.5, filter: "blur(5px)" },
    { offset: 0.03, transform: "translateY(0.25em) rotateZ(135deg) scale(0.82)", opacity: 0.48, filter: "blur(5px)" },
    { offset: 0.06, transform: "translateY(0.45em) rotateZ(-120deg) scale(0.68)", opacity: 0.47, filter: "blur(5px)" },
    { offset: 0.12, transform: "translateY(0.85em) rotateZ(315deg) scale(0.58)", opacity: 0.46, filter: "blur(5px)" },
    { offset: 0.24, transform: "translateY(0.95em) rotateZ(90deg) scale(0.48)", opacity: 0.46, filter: "blur(4px)" },
    { offset: 0.4, transform: "translateY(0.9em) rotateZ(-45deg) scale(0.48)", opacity: 0.5, filter: "blur(3px)" }
  ],
  [
    { offset: 0, transform: "translateY(0) rotateZ(45deg) scale(1)", opacity: 0.5, filter: "blur(5px)" },
    { offset: 0.03, transform: "translateY(0.18em) rotateZ(-90deg) scale(0.88)", opacity: 0.5, filter: "blur(5px)" },
    { offset: 0.06, transform: "translateY(0.38em) rotateZ(180deg) scale(0.72)", opacity: 0.48, filter: "blur(5px)" },
    { offset: 0.12, transform: "translateY(0.78em) rotateZ(-315deg) scale(0.62)", opacity: 0.47, filter: "blur(5px)" },
    { offset: 0.24, transform: "translateY(0.92em) rotateZ(225deg) scale(0.52)", opacity: 0.47, filter: "blur(4px)" },
    { offset: 0.4, transform: "translateY(0.9em) rotateZ(15deg) scale(0.5)", opacity: 0.5, filter: "blur(3px)" }
  ]
];

const FINAL_SHADOW_KEYFRAME = {
  transform: "translateZ(calc(var(--jk-die-size) * -1)) rotateZ(45deg)",
  opacity: 1,
  filter: "blur(0px)"
};

const MAX_BASE_OFFSET = 0.4;

const scaleOffsets = (keyframes, slowdownStartMs, rollMs) => {
  const slowdownOffset = Math.min(
    0.95,
    Math.max(0.05, slowdownStartMs / Math.max(1, rollMs))
  );

  return keyframes.map((frame) => ({
    ...frame,
    offset: (frame.offset / MAX_BASE_OFFSET) * slowdownOffset
  }));
};

/**
 * Elements for the pips at each location on a die face.
 */
const pips = {
  topLeft: <circle r="7" cx="25" cy="25" />,
  topRight: <circle r="7" cx="75" cy="25" />,
  centre: <circle r="7" cx="50" cy="50" />,
  bottomLeft: <circle r="7" cx="25" cy="75" />,
  bottomRight: <circle r="7" cx="75" cy="75" />,
};

/**
 * Die face tuple for classic 6-sided dice with value displayed with pips.
 */
const PipFaces = [
  <svg key="face-1" viewBox="0 0 100 100" className="jk-pip-face">
    {pips.centre}
  </svg>,
  <svg key="face-2" viewBox="0 0 100 100" className="jk-pip-face">
    {pips.bottomLeft}
    {pips.topRight}
  </svg>,
  <svg key="face-3" viewBox="0 0 100 100" className="jk-pip-face">
    {pips.bottomLeft}
    {pips.centre}
    {pips.topRight}
  </svg>,
  <svg key="face-4" viewBox="0 0 100 100" className="jk-pip-face">
    {pips.topLeft}
    {pips.topRight}
    {pips.bottomLeft}
    {pips.bottomRight}
  </svg>,
  <svg key="face-5" viewBox="0 0 100 100" className="jk-pip-face">
    {pips.topLeft}
    {pips.topRight}
    {pips.centre}
    {pips.bottomLeft}
    {pips.bottomRight}
  </svg>,
  <svg key="face-6" viewBox="0 0 100 100" className="jk-pip-face">
    {pips.topLeft}
    {pips.topRight}
    <circle r="7" cx="25" cy="50" />
    <circle r="7" cx="75" cy="50" />
    {pips.bottomLeft}
    {pips.bottomRight}
  </svg>,
];

/**
 * Rotation needed to position each die face to form a cube.
 */
const FaceRotations = [
  'rotateY(-90deg)',
  'rotateX(-90deg)',
  'rotateY(90deg)',
  'rotateY(0deg)',
  'rotateX(90deg)',
  'rotateX(180deg)',
];

/**
 * Die rotation needed to display each die face on top.
 */
const DieRotations = [
  'rotateX(20deg) rotateZ(45deg) rotateY(90deg)',
  'rotateX(110deg) rotateY(45deg)',
  'rotateX(20deg) rotateZ(45deg) rotateY(-90deg)',
  'rotateX(20deg) rotateZ(45deg)',
  'rotateX(-70deg) rotateY(-45deg)',
  'rotateX(-160deg) rotateZ(-45deg)',
];



/**
 * Render a six-sided die.
 */
const DieView = ({
  dieSize = "2em",
  face = 6,
  rollId = 0,
  rollMs = 0,
  slowdownStartMs = 0,
  rollVariant = 0
}) => {
  const faces = PipFaces;
  const bodyRef = useRef(null);
  const shadowRef = useRef(null);

  useEffect(() => {
    const bodyNode = bodyRef.current;
    const shadowNode = shadowRef.current;
    if (!rollId || !rollMs || !bodyNode || !shadowNode) return undefined;
    if (typeof bodyNode.animate !== "function" || typeof shadowNode.animate !== "function") {
      return undefined;
    }

    const bodyKeyframes = BODY_ROLL_KEYFRAME_VARIANTS[
      rollVariant % BODY_ROLL_KEYFRAME_VARIANTS.length
    ] ?? BODY_ROLL_KEYFRAME_VARIANTS[0];
    const scaledBodyKeyframes = scaleOffsets(bodyKeyframes, slowdownStartMs, rollMs);
    const bodyAnimation = bodyNode.animate(
      [
        ...scaledBodyKeyframes,
        {
          offset: 1,
          transform: DieRotations[face - 1]
        }
      ],
      {
        duration: rollMs,
        easing: "linear",
        fill: "both"
      }
    );

    const shadowKeyframes = SHADOW_ROLL_KEYFRAME_VARIANTS[
      rollVariant % SHADOW_ROLL_KEYFRAME_VARIANTS.length
    ] ?? SHADOW_ROLL_KEYFRAME_VARIANTS[0];
    const scaledShadowKeyframes = scaleOffsets(shadowKeyframes, slowdownStartMs, rollMs);
    const shadowAnimation = shadowNode.animate(
      [
        ...scaledShadowKeyframes,
        {
          offset: 1,
          ...FINAL_SHADOW_KEYFRAME
        }
      ],
      {
        duration: rollMs,
        easing: "linear",
        fill: "both"
      }
    );

    return () => {
      bodyAnimation.cancel();
      shadowAnimation.cancel();
    };
  }, [face, rollId, rollMs, rollVariant, slowdownStartMs]);

  return (
    <div
      className="jk-die"
      style={{
        "--jk-die-size": dieSize
      }}
      aria-label={`Die showing ${face}`}
      role="img"
    >
      <div ref={shadowRef} className="jk-shadow" aria-hidden={true} />
      <div
        ref={bodyRef}
        className="jk-die-body"
        style={{ "--jk-die-target-rotation": DieRotations[face - 1] }}
        aria-hidden={true}
      >
        <div className="jk-internal" style={{ transform: 'rotateZ(0deg)' }} />
        <div className="jk-internal" style={{ transform: 'rotateX(90deg)' }} />
        <div className="jk-internal" style={{ transform: 'rotateY(90deg)' }} />
        {faces.map((face, i) => (
          <React.Fragment key={i}>
            <div
              className="jk-face"
              style={{
                transform: `${FaceRotations[i]} translateZ(calc(var(--jk-die-size) * .5))`,
              }}
            >
              {face}
            </div>
            <div
              className="jk-inner-face"
              style={{
                transform: `${FaceRotations[i]} translateZ(calc(var(--jk-die-size) * .49))`,
              }}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const Die = memo(DieView);

/**
 * Use `useDie` to get a [`DieComponent`, `rollToFunction`] tuple.
 */
export const useDie = (initialValue= 1) => {
  const [props, setProps] = useState({
    face: initialValue,
    rollId: 0,
    rollMs: 0,
    slowdownStartMs: 0,
    rollVariant: 0
  });
  const timeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const rollTo = useCallback((request) => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
    }

    const plan = buildDieRollPlan({ request });
    setProps((current) => ({
      ...current,
      face: plan.face,
      rollId: current.rollId + 1,
      rollMs: plan.rollMs,
      slowdownStartMs: plan.slowdownStartMs,
      rollVariant: plan.rollVariant
    }));

    timeoutRef.current = setTimeout(() => {
      setProps((current) => ({
        ...current,
        rollMs: 0,
        slowdownStartMs: 0,
        rollVariant: 0
      }));
      timeoutRef.current = null;
    }, plan.rollMs);
  }, []);

  const ControlledDie = useCallback(
    (dieProps) => <Die {...{ ...dieProps, ...props }} />,
    [props]
  );

  return [ControlledDie, rollTo];
};
