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

export const DockCard = ({ action }) => {
  const cardRef = React.useRef(null);
  const [isHovered, setIsHovered] = React.useState(false);
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

  React.useEffect(() => {
    const restingLift = action.selected ? SELECTED_LIFT_PX : 0;
    if (!action.enabled) {
      y.start(restingLift);
      scale.start(1);
      return;
    }

    y.start(isHovered ? HOVER_LIFT_PX : restingLift);
    scale.start(1);
  }, [action.enabled, action.selected, isHovered, scale, y]);

  const handleClick = () => {
    if (!action.enabled) return;
    const triggerRect = cardRef.current?.getBoundingClientRect?.() ?? null;

    scale.start(0.96);
    y.start(PRESS_LIFT_PX);
    action.action?.({ triggerRect });

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
