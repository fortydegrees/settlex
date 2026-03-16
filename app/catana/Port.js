import React from "react";
import "./Port.css";
import {
  getClassicPortIconPath,
  getPortIconPath,
  handleThemeImageError,
} from "./theme/themes.js";
import { getPortRenderModel } from "./utils/portLayout.js";

export function Port({
  coordinate,
  size = 30,
  boardCenter,
  tile,
  themeId,
}) {
  const model = getPortRenderModel({
    coordinate,
    size,
    boardCenter,
    direction: tile.direction,
  });
  const isGenericPort = tile.resource === "Any";
  const rateLabel = isGenericPort ? "3:1" : "2:1";
  const iconSrc = getPortIconPath(themeId, tile.resource);
  const iconFallbackSrc = getClassicPortIconPath(tile.resource);

  const markerChildren = [
    React.createElement("div", {
      key: "water",
      className: "portMarkerWater",
    }),
    React.createElement("div", {
      key: "inner",
      className: "portMarkerInner",
    }),
    iconSrc
      ? React.createElement("img", {
          key: "icon",
          className: "portMarkerIcon",
          src: iconSrc,
          alt: "",
          draggable: false,
          onError: (event) => handleThemeImageError(event, iconFallbackSrc),
        })
      : null,
  ];

  return React.createElement(
    "div",
    {
      "data-testid": "port-layer",
      className: "portLayer",
    },
    React.createElement(
      "div",
      {
        "data-testid": "port-marker",
        className: "portMarker",
        style: model.marker,
      },
      ...markerChildren
    ),
    React.createElement(
      "div",
      {
        "data-testid": "port-badge",
        className: "portBadge",
        style: model.badge,
      },
      rateLabel
    )
  );
}
