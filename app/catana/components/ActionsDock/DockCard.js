/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import {
  animated,
  useSpringValue,
} from "@react-spring/web";

import "./dockStyles.css";
import { handleThemeImageError } from "../../theme/themes";

const INITIAL_WIDTH = 48;
const HOVER_LIFT_PX = -4;
const PRESS_LIFT_PX = -1;
const SELECTED_LIFT_PX = -2;
const ICON_PRELAUNCH_SQUASH_SCALE_X = 1.12;
const ICON_PRELAUNCH_SQUASH_SCALE_Y = 0.78;
const ICON_PRELAUNCH_SQUASH_Y_PX = 3;
const ICON_PRELAUNCH_REBOUND_SCALE_X = 1.03;
const ICON_PRELAUNCH_REBOUND_SCALE_Y = 0.94;
const ICON_PRELAUNCH_REBOUND_Y_PX = 1;
const PRELAUNCH_REBOUND_DELAY_MS = 108;
const ICON_PRELAUNCH_ANTICIPATION_CONFIG = {
  mass: 0.86,
  tension: 300,
  friction: 16,
  clamp: false
};
const ICON_PRELAUNCH_REBOUND_CONFIG = {
  mass: 0.92,
  tension: 230,
  friction: 15,
  clamp: false
};
const ICON_PRELAUNCH_SETTLE_CONFIG = {
  mass: 0.94,
  tension: 210,
  friction: 18,
  clamp: false
};

export const DockCard = ({ action }) => {
  const cardRef = React.useRef(null);
  const squashReboundTimeoutRef = React.useRef(null);
  const squashResetTimeoutRef = React.useRef(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPrelaunchVisible, setIsPrelaunchVisible] = React.useState(false);
  const y = useSpringValue(action.selected ? SELECTED_LIFT_PX : 0, {
    config: {
      friction: 24,
      tension: 300,
    },
  });
  const scale = useSpringValue(1, {
    config: {
      friction: 26,
      tension: 320,
    },
  });
  const iconScaleX = useSpringValue(1, {
    config: {
      friction: 22,
      tension: 340,
    },
  });
  const iconScaleY = useSpringValue(1, {
    config: {
      friction: 22,
      tension: 340,
    },
  });
  const iconY = useSpringValue(0, {
    config: {
      friction: 24,
      tension: 320,
    },
  });

  React.useEffect(() => {
    return () => {
      if (squashReboundTimeoutRef.current != null) {
        clearTimeout(squashReboundTimeoutRef.current);
      }
      if (squashResetTimeoutRef.current != null) {
        clearTimeout(squashResetTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const restingLift = action.selected ? SELECTED_LIFT_PX : 0;
    if (!action.enabled) {
      y.start(restingLift);
      scale.start(1);
      iconScaleX.start(1);
      iconScaleY.start(1);
      iconY.start(0);
      setIsPrelaunchVisible(false);
      return;
    }

    y.start(isHovered ? HOVER_LIFT_PX : restingLift);
    scale.start(1);
  }, [action.enabled, action.selected, iconScaleX, iconScaleY, iconY, isHovered, scale, y]);

  const handleClick = () => {
    if (!action.enabled) return;
    const triggerRect = cardRef.current?.getBoundingClientRect?.() ?? null;
    const preLaunchDelayMs = action.preLaunchDelayMs ?? 0;

    scale.start(0.96);
    y.start(PRESS_LIFT_PX);
    if (squashReboundTimeoutRef.current != null) {
      clearTimeout(squashReboundTimeoutRef.current);
      squashReboundTimeoutRef.current = null;
    }
    if (squashResetTimeoutRef.current != null) {
      clearTimeout(squashResetTimeoutRef.current);
      squashResetTimeoutRef.current = null;
    }
    if (preLaunchDelayMs > 0) {
      setIsPrelaunchVisible(Boolean(action.preLaunchImg));
      iconScaleX.start(ICON_PRELAUNCH_SQUASH_SCALE_X, {
        config: ICON_PRELAUNCH_ANTICIPATION_CONFIG
      });
      iconScaleY.start(ICON_PRELAUNCH_SQUASH_SCALE_Y, {
        config: ICON_PRELAUNCH_ANTICIPATION_CONFIG
      });
      iconY.start(ICON_PRELAUNCH_SQUASH_Y_PX, {
        config: ICON_PRELAUNCH_ANTICIPATION_CONFIG
      });
      const reboundDelayMs = Math.min(
        PRELAUNCH_REBOUND_DELAY_MS,
        Math.max(48, preLaunchDelayMs - 96)
      );
      squashReboundTimeoutRef.current = window.setTimeout(() => {
        iconScaleX.start(ICON_PRELAUNCH_REBOUND_SCALE_X, {
          config: ICON_PRELAUNCH_REBOUND_CONFIG
        });
        iconScaleY.start(ICON_PRELAUNCH_REBOUND_SCALE_Y, {
          config: ICON_PRELAUNCH_REBOUND_CONFIG
        });
        iconY.start(ICON_PRELAUNCH_REBOUND_Y_PX, {
          config: ICON_PRELAUNCH_REBOUND_CONFIG
        });
        squashReboundTimeoutRef.current = null;
      }, reboundDelayMs);
      squashResetTimeoutRef.current = window.setTimeout(() => {
        iconScaleX.start(1, {
          config: ICON_PRELAUNCH_SETTLE_CONFIG
        });
        iconScaleY.start(1, {
          config: ICON_PRELAUNCH_SETTLE_CONFIG
        });
        iconY.start(0, {
          config: ICON_PRELAUNCH_SETTLE_CONFIG
        });
        setIsPrelaunchVisible(false);
        squashResetTimeoutRef.current = null;
      }, preLaunchDelayMs);
    }
    action.action?.({ triggerRect, preLaunchDelayMs });

    requestAnimationFrame(() => {
      const restingLift = action.selected || isHovered ? HOVER_LIFT_PX : 0;
      scale.start(1);
      y.start(restingLift);
    });
  };

  return (
    <div className="dock-card-container">
      <animated.button
        ref={cardRef}
        className={`bg-blue-300 ring-2 ring-slate-200 dock-card ${
          action.enabled ? "enabled" : ""
        } ${action.selected ? "selected" : ""}`}
        disabled={!action.enabled}
        onMouseEnter={() => {
          if (!action.enabled) return;
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        onMouseDown={() => {
          if (!action.enabled) return;
          scale.start(0.96);
          y.start(PRESS_LIFT_PX);
        }}
        onMouseUp={() => {
          if (!action.enabled) return;
          scale.start(1);
          y.start(
            isHovered ? HOVER_LIFT_PX : action.selected ? SELECTED_LIFT_PX : 0
          );
        }}
        onClick={handleClick}
        style={{
          width: INITIAL_WIDTH,
          height: INITIAL_WIDTH,
          y,
          scale,
        }}
      >
        <span className="card">
          {action.preLaunchImg ? (
            <>
              <img
                className={`card__img card__img-base ${
                  isPrelaunchVisible ? "card__img-hidden" : ""
                }`}
                style={action.style}
                src={action.img}
                alt=""
                draggable={false}
                onError={(event) =>
                  handleThemeImageError(event, action.fallbackImg)
                }
              />
              <animated.span
                className={`card__img-shell card__img-shell-prelaunch ${
                  isPrelaunchVisible ? "card__img-shell-prelaunch-visible" : ""
                }`}
                style={{
                  scaleX: iconScaleX,
                  scaleY: iconScaleY,
                  y: iconY,
                }}
              >
                <img
                  className="card__img card__img-prelaunch"
                  src={action.preLaunchImg}
                  alt=""
                  draggable={false}
                  onError={(event) =>
                    handleThemeImageError(
                      event,
                      action.preLaunchFallbackImg ?? action.fallbackImg
                    )
                  }
                />
              </animated.span>
            </>
          ) : (
            <animated.span
              className="card__img-shell"
              style={{
                scaleX: iconScaleX,
                scaleY: iconScaleY,
                y: iconY,
              }}
            >
              <img
                className="card__img"
                style={action.style}
                src={action.img}
                alt=""
                draggable={false}
                onError={(event) =>
                  handleThemeImageError(event, action.fallbackImg)
                }
              />
            </animated.span>
          )}

          {(action.count > 0) && (
            <span className="absolute right-0 top-0 w-6 h-6 block -translate-y-1/2 translate-x-1/2 transform rounded-full bg-blue-50"
           >
              <span className="text-sm font-medium">{action.count}</span>
            </span>
          )}
        </span>
      </animated.button>
    </div>
  );
};
