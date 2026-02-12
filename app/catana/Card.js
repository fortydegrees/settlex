import { RESOURCE_ICON_SVGS, ResourceType } from "./types";
import {  animated } from "@react-spring/web";
export function Card({ resource, style }) {
  var bgColor;
  var margin;
  switch (resource) {
    case "Wood":
      bgColor = "#3f952d";
      margin="mt-2"
      break;
    case "Brick":
      bgColor = "#d77230";
      margin="mt-4"
      break;
    case "Sheep":
      bgColor = "#69c80f";
      margin="mt-3"
      break;
    case "Wheat":
      bgColor = "#f2c535";
      margin= "mt-2"
      break;
    case "Ore":
      bgColor = "#a9aeae";
      margin="mt-4"
      break;

    default:
      bgColor = "#FFFFFF";
  }

  return (
    <animated.div
      className={`rounded border-2 border-white p-2 drop-shadow-lg`}
      style={{ ...style, backgroundColor: bgColor }}
    >
      <img
        src={RESOURCE_ICON_SVGS[resource]}
        className={margin}
        draggable={false}
      />
    </animated.div>
  );
}
