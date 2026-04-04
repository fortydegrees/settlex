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
const ICON_PRELAUNCH_SQUASH_SCALE_X = 1.1;
const ICON_PRELAUNCH_SQUASH_SCALE_Y = 0.84;
const ICON_PRELAUNCH_SQUASH_Y_PX = 2;
const cubicOut = (t) => 1 - (1 - t) ** 3;
const cubicIn = (t) => t ** 3;
const ICON_PRELAUNCH_PRESS_IN_CONFIG = {
  duration: 112,
  easing: cubicOut,
  clamp: true
};
const ICON_PRELAUNCH_RELEASE_CONFIG = {
  duration: 92,
  easing: cubicIn,
  clamp: true
};

export const DockCard = ({ action }) => {
  const cardRef = React.useRef(null);
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
    if (squashResetTimeoutRef.current != null) {
      clearTimeout(squashResetTimeoutRef.current);
      squashResetTimeoutRef.current = null;
    }
    if (preLaunchDelayMs > 0) {
      setIsPrelaunchVisible(Boolean(action.preLaunchImg));
      iconScaleX.start(ICON_PRELAUNCH_SQUASH_SCALE_X, {
        config: ICON_PRELAUNCH_PRESS_IN_CONFIG
      });
      iconScaleY.start(ICON_PRELAUNCH_SQUASH_SCALE_Y, {
        config: ICON_PRELAUNCH_PRESS_IN_CONFIG
      });
      iconY.start(ICON_PRELAUNCH_SQUASH_Y_PX, {
        config: ICON_PRELAUNCH_PRESS_IN_CONFIG
      });
      squashResetTimeoutRef.current = window.setTimeout(() => {
        iconScaleX.start(1, {
          config: ICON_PRELAUNCH_RELEASE_CONFIG
        });
        iconScaleY.start(1, {
          config: ICON_PRELAUNCH_RELEASE_CONFIG
        });
        iconY.start(0, {
          config: ICON_PRELAUNCH_RELEASE_CONFIG
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
