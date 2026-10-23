import React from "react";
import "./Port.css";
import {
  getClassicPortIconPath,
  getPortIconPath,
  handleThemeImageError,
} from "../../_features/theme/themes.js";
import { getPortRenderModel } from "./portLayout.js";

function PortImpl({
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
  const rateLabelFontSize = Math.round(size * 0.14);
  const iconSrc = getPortIconPath(themeId, tile.resource);
  const iconFallbackSrc = getClassicPortIconPath(tile.resource);

  const markerChildren = [
    <div key="water" className="portMarkerWater" />,
    <div key="inner" className="portMarkerInner" />,
    iconSrc ? (
      <img
        key="icon"
        className="portMarkerIcon"
        src={iconSrc}
        alt=""
        draggable={false}
        onError={(event) => handleThemeImageError(event, iconFallbackSrc)}
      />
    ) : null,
  ];

  return (
    <div data-testid="port-layer" className="portLayer">
      <div data-testid="port-marker" className="portMarker" style={model.marker}>
        {markerChildren}
      </div>
      <div
        data-testid="port-badge"
        className="portBadge"
        style={{
          ...model.badge,
          fontSize: `${rateLabelFontSize}px`,
        }}
      >
        {rateLabel}
      </div>
    </div>
  );
}

export const Port = React.memo(PortImpl);
