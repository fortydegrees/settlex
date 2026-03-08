import { ResourceType } from "./types";
import {
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "./theme/themes";
import {  animated } from "@react-spring/web";
export function Card({ resource, style, themeId }) {
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
        src={getResourceIconPath(themeId, resource)}
        className={margin}
        draggable={false}
        onError={(event) =>
          handleThemeImageError(event, getClassicResourceIconPath(resource))
        }
      />
    </animated.div>
  );
}
