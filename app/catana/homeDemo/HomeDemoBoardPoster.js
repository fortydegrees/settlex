/* eslint-disable @next/next/no-img-element */
import React from "react";
import { TileTypes } from "../types";
import {
  DEFAULT_THEME_ID,
  getPortIconPath,
  getResourceIconPath,
  getThemedSvgPath,
  getTilePath
} from "../theme/themes";
import { SQRT3, cubeToAxial, getNodeDelta } from "../utils/coordinates";
import { HOME_DEMO_BOARD_PRESET } from "./homeDemoPreset";
import styles from "./HomeDemoBoardPoster.module.css";

const BOARD_UNDERLAY_FILE = "board_underlay_standard.svg";
const ROBBER_FILE = "icon_robber.svg";
const UNDERLAY_VIEWBOX = Object.freeze({
  left: -485.012702,
  top: -460.044428,
  width: 970.025404,
  height: 920.088856
});
const UNDERLAY_DESIGN_SIZE = 100;
const PORT_MARKER_SIZE_FACTOR = 0.72;
const PORT_MARKER_Y_OFFSET_FACTOR = 0.03;
const PORT_BADGE_WIDTH_FACTOR = 0.46;
const PORT_BADGE_HEIGHT_FACTOR = 0.18;
const PORT_BADGE_TOP_FACTOR = 0.11;
const PORT_CONNECTORS_BY_DIRECTION = Object.freeze({
  EAST: ["NORTHWEST", "SOUTHWEST"],
  NORTHEAST: ["SOUTH", "SOUTHWEST"],
  NORTHWEST: ["SOUTH", "SOUTHEAST"],
  WEST: ["NORTHEAST", "SOUTHEAST"],
  SOUTHWEST: ["NORTH", "NORTHEAST"],
  SOUTHEAST: ["NORTH", "NORTHWEST"]
});
const CONNECTOR_GAP_RATIO = -0.25;
const CONNECTOR_END_GAP_RATIO = 0.06;
const CONNECTOR_NODE_RADIUS_RATIO = 0.2;
const CONNECTOR_LENGTH_RATIO = 0.55;
const CONNECTOR_MIN_LENGTH_RATIO = 0.68;
const CONNECTOR_MAX_LENGTH_RATIO = 0.94;
const CONNECTOR_THICKNESS_RATIO = 0.1;
const CONNECTOR_MIN_THICKNESS = 8;
const CONNECTOR_MAX_THICKNESS = 10;

function numberToPips(number) {
  switch (number) {
    case 2:
    case 12:
      return "•";
    case 3:
    case 11:
      return "••";
    case 4:
    case 10:
      return "•••";
    case 5:
    case 9:
      return "••••";
    case 6:
    case 8:
      return "•••••";
    default:
      return "";
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatFactor(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number.parseFloat(value.toFixed(8)).toString();
}

function sizeFactor(value) {
  return `calc(${formatFactor(value)} * var(--home-poster-size))`;
}

function leftFromCenter(unitOffset) {
  return `calc(50vw + ${formatFactor(unitOffset)} * var(--home-poster-size))`;
}

function topFromCenter(unitOffset) {
  return `calc(50vh + var(--home-poster-center-y-offset) + ${formatFactor(unitOffset)} * var(--home-poster-size))`;
}

function getTileCenterUnit(coordinate) {
  const { q, r } = cubeToAxial(coordinate);
  return {
    x: SQRT3 * q + (SQRT3 / 2) * r,
    y: 1.5 * r
  };
}

function getUnderlayStyle() {
  return {
    left: leftFromCenter(UNDERLAY_VIEWBOX.left / UNDERLAY_DESIGN_SIZE),
    top: topFromCenter(UNDERLAY_VIEWBOX.top / UNDERLAY_DESIGN_SIZE),
    width: sizeFactor(UNDERLAY_VIEWBOX.width / UNDERLAY_DESIGN_SIZE),
    height: sizeFactor(UNDERLAY_VIEWBOX.height / UNDERLAY_DESIGN_SIZE)
  };
}

function getTileStyle(coordinate, resource, themeId) {
  const center = getTileCenterUnit(coordinate);
  return {
    left: leftFromCenter(center.x - SQRT3 / 2),
    top: topFromCenter(center.y - 1),
    width: sizeFactor(SQRT3),
    height: sizeFactor(2),
    backgroundImage: `url("${getTilePath(themeId, resource)}")`
  };
}

function getPortMarkerStyle(coordinate) {
  const center = getTileCenterUnit(coordinate);
  const markerOffset = PORT_MARKER_SIZE_FACTOR / 2;
  return {
    left: leftFromCenter(center.x - markerOffset),
    top: topFromCenter(
      center.y - PORT_MARKER_Y_OFFSET_FACTOR - markerOffset
    ),
    width: sizeFactor(PORT_MARKER_SIZE_FACTOR),
    height: sizeFactor(PORT_MARKER_SIZE_FACTOR)
  };
}

function getPortBadgeStyle(coordinate) {
  const center = getTileCenterUnit(coordinate);
  return {
    left: leftFromCenter(center.x - PORT_BADGE_WIDTH_FACTOR / 2),
    top: topFromCenter(center.y + PORT_BADGE_TOP_FACTOR),
    width: sizeFactor(PORT_BADGE_WIDTH_FACTOR),
    height: sizeFactor(PORT_BADGE_HEIGHT_FACTOR),
    fontSize: sizeFactor(0.14)
  };
}

function getPosterConnectorBar({ coordinate, nodeDirection }) {
  const tileCenter = getTileCenterUnit(coordinate);
  const [deltaX, deltaY] = getNodeDelta(nodeDirection, SQRT3, 2);
  const nodeX = tileCenter.x + deltaX;
  const nodeY = tileCenter.y + deltaY;
  const markerCenterX = tileCenter.x;
  const markerCenterY = tileCenter.y - PORT_MARKER_Y_OFFSET_FACTOR;
  const dx = markerCenterX - nodeX;
  const dy = markerCenterY - nodeY;
  const distance = Math.hypot(dx, dy);

  if (!distance) {
    return null;
  }

  const unitX = dx / distance;
  const unitY = dy / distance;
  const usableDistance = Math.max(
    0,
    distance -
      CONNECTOR_NODE_RADIUS_RATIO -
      CONNECTOR_GAP_RATIO -
      PORT_MARKER_SIZE_FACTOR / 2 -
      CONNECTOR_END_GAP_RATIO
  );
  const desiredLength = usableDistance * CONNECTOR_LENGTH_RATIO;
  const width = Math.min(
    usableDistance,
    clamp(
      desiredLength,
      CONNECTOR_MIN_LENGTH_RATIO,
      CONNECTOR_MAX_LENGTH_RATIO
    )
  );
  const centerOffset = CONNECTOR_NODE_RADIUS_RATIO + CONNECTOR_GAP_RATIO + width / 2;

  return {
    centerX: nodeX + unitX * centerOffset,
    centerY: nodeY + unitY * centerOffset,
    width,
    rotation: Math.round((Math.atan2(dy, dx) * 180) / Math.PI)
  };
}

function getPosterConnectorBarStyle({ coordinate, nodeDirection }) {
  const bar = getPosterConnectorBar({ coordinate, nodeDirection });

  if (!bar) {
    return null;
  }

  const connectorHeight = `clamp(${CONNECTOR_MIN_THICKNESS}px, ${sizeFactor(CONNECTOR_THICKNESS_RATIO)}, ${CONNECTOR_MAX_THICKNESS}px)`;

  return {
    "--home-poster-port-connector-height": connectorHeight,
    left: leftFromCenter(bar.centerX - bar.width / 2),
    top: `calc(${topFromCenter(bar.centerY)} - var(--home-poster-port-connector-height) / 2)`,
    width: sizeFactor(bar.width),
    height: "var(--home-poster-port-connector-height)",
    transform: `rotate(${bar.rotation}deg)`
  };
}

function PosterNumberToken({ number }) {
  const pips = numberToPips(number);
  const isHot = number === 6 || number === 8;

  return (
    <div
      className={`${styles.numberToken} ${isHot ? styles.numberHot : ""}`}
    >
      <div className={styles.numberContent}>
        <span className={styles.numberValue}>{number}</span>
        <span className={styles.pips}>{pips}</span>
      </div>
    </div>
  );
}

function PosterPortChannels() {
  const portTiles = HOME_DEMO_BOARD_PRESET.tiles.filter(
    ({ type }) => type === TileTypes.PORT
  );

  return (
    <div className={styles.portChannelLayer}>
      {portTiles.map(({ coordinate, tile }) => {
        const connectors = PORT_CONNECTORS_BY_DIRECTION[tile.direction] ?? [];

        return (
          <div
            key={`poster-port-channel-${tile.id}`}
            className={styles.portChannel}
          >
            {connectors.map((nodeDirection, index) => {
              const style = getPosterConnectorBarStyle({
                coordinate,
                nodeDirection
              });

              if (!style) {
                return null;
              }

              return (
                <div
                  key={`poster-port-connector-${tile.id}-${index}`}
                  className={styles.portConnector}
                  style={style}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function PosterTile({ coordinate, tile, themeId }) {
  const resourceIconSrc = getResourceIconPath(themeId, tile.resource);
  const hasRobber = tile.id === HOME_DEMO_BOARD_PRESET.robberTileId;

  return (
    <div
      className={styles.tile}
      style={getTileStyle(coordinate, tile.resource, themeId)}
    >
      {resourceIconSrc ? (
        <img
          alt=""
          className={styles.tileIcon}
          draggable={false}
          loading="eager"
          src={resourceIconSrc}
        />
      ) : null}
      {tile.number ? <PosterNumberToken number={tile.number} /> : null}
      {hasRobber ? (
        <div className={styles.robber}>
          <div aria-hidden="true" className={styles.robberShadow} />
          <img
            alt=""
            className={styles.robberImage}
            draggable={false}
            loading="eager"
            src={getThemedSvgPath(themeId, ROBBER_FILE)}
          />
        </div>
      ) : null}
    </div>
  );
}

function PosterPort({ coordinate, tile, themeId }) {
  const iconSrc = getPortIconPath(themeId, tile.resource);
  const rateLabel = tile.resource === "Any" ? "3:1" : "2:1";

  return (
    <div className={styles.portLayer}>
      <div className={styles.portMarker} style={getPortMarkerStyle(coordinate)}>
        <div className={styles.portMarkerWater} />
        <div className={styles.portMarkerInner} />
        {iconSrc ? (
          <img
            alt=""
            className={styles.portMarkerIcon}
            draggable={false}
            loading="eager"
            src={iconSrc}
          />
        ) : null}
      </div>
      <div className={styles.portBadge} style={getPortBadgeStyle(coordinate)}>
        {rateLabel}
      </div>
    </div>
  );
}

export function HomeDemoBoardPoster({
  hidden = false,
  themeId = DEFAULT_THEME_ID
}) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.poster} ${hidden ? styles.hidden : ""}`}
      data-testid="home-demo-board-poster"
      data-home-demo-board-poster-hidden={hidden ? "true" : "false"}
    >
      <img
        alt=""
        className={styles.underlay}
        draggable={false}
        fetchPriority="high"
        loading="eager"
        src={getThemedSvgPath(themeId, BOARD_UNDERLAY_FILE)}
        style={getUnderlayStyle()}
      />
      <PosterPortChannels />
      {HOME_DEMO_BOARD_PRESET.tiles.map(({ coordinate, type, tile }) => {
        if (type === TileTypes.LAND) {
          return (
            <PosterTile
              key={`poster-tile-${tile.id}`}
              coordinate={coordinate}
              tile={tile}
              themeId={themeId}
            />
          );
        }

        if (type === TileTypes.PORT) {
          return (
            <PosterPort
              key={`poster-port-${tile.id}`}
              coordinate={coordinate}
              tile={tile}
              themeId={themeId}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
