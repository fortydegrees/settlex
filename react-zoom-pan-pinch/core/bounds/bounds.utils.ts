/* eslint-disable no-param-reassign */
import { roundNumber } from "../../utils";
import {
  BoundsType,
  PositionType,
  ReactZoomPanPinchContext,
} from "../../models";
import { ComponentsSizesType } from "./bounds.types";

export function getComponentsSizes(
  wrapperComponent: HTMLDivElement,
  contentComponent: HTMLDivElement,
  newScale: number,
): ComponentsSizesType {
  const wrapperWidth = wrapperComponent.offsetWidth;
  const wrapperHeight = wrapperComponent.offsetHeight;

  const contentWidth = contentComponent.offsetWidth;
  const contentHeight = contentComponent.offsetHeight;

  const newContentWidth = contentWidth * newScale;
  const newContentHeight = contentHeight * newScale;
  const newDiffWidth = wrapperWidth - newContentWidth;
  const newDiffHeight = wrapperHeight - newContentHeight;

  return {
    wrapperWidth,
    wrapperHeight,
    newContentWidth,
    newDiffWidth,
    newContentHeight,
    newDiffHeight,
  };
}

export const getBounds = (
  wrapperWidth: number,
  newContentWidth: number,
  diffWidth: number,
  wrapperHeight: number,
  newContentHeight: number,
  diffHeight: number,
  props: any,
  centerZoomedOut: boolean,
): BoundsType => {
  const scaleWidthFactor =
    wrapperWidth > newContentWidth
      ? diffWidth * (centerZoomedOut ? 1 : 0.5)
      : 0;
  const scaleHeightFactor =
    wrapperHeight > newContentHeight
      ? diffHeight * (centerZoomedOut ? 1 : 0.5)
      : 0;

      
  const minPositionX =  props.minPositionX - wrapperWidth - newContentWidth - (diffWidth * (centerZoomedOut ? 1 : 0.5));
  //const minPositionX =  props.minPositionX + (diffWidth * (centerZoomedOut ? 1 : 0.5));
  const maxPositionX = scaleWidthFactor;
  //const minPositionY = props.minPositionY - wrapperHeight - newContentHeight - scaleHeightFactor;
  const minPositionY = props.minPositionY  - scaleHeightFactor;
  const maxPositionY = scaleHeightFactor;

  //console.log('bdz', minPositionX, maxPositionX, minPositionY, maxPositionY)
  //if scale = 1, minPositionX, maxPositionX, minPositionY, maxPositionY should be default value
  return { minPositionX, maxPositionX, minPositionY, maxPositionY };
};

export const calculateBounds = (
  contextInstance: ReactZoomPanPinchContext,
  newScale: number,
): BoundsType => {
  const { wrapperComponent, contentComponent } = contextInstance;
  const { centerZoomedOut } = contextInstance.setup;

  if (!wrapperComponent || !contentComponent) {
    throw new Error("Components are not mounted");
  }

  const {
    wrapperWidth,
    wrapperHeight,
    newContentWidth,
    newDiffWidth,
    newContentHeight,
    newDiffHeight,
  } = getComponentsSizes(wrapperComponent, contentComponent, newScale);

  const { minPositionX, maxPositionX, minPositionY, maxPositionY } = contextInstance.props


  const bounds = getBounds(
    wrapperWidth,
    newContentWidth,
    newDiffWidth,
    wrapperHeight,
    newContentHeight,
    newDiffHeight,
    contextInstance.props,
    Boolean(centerZoomedOut),
  );


  const bounds3 = {
    minPositionX: contextInstance.props.minPositionX  * newScale,
    minPositionY: contextInstance.props.minPositionY * newScale,
    maxPositionX: contextInstance.props.maxPositionX * (newScale < 1 ? (1 + (1- newScale)) : newScale),
    maxPositionY: contextInstance.props.maxPositionY * (newScale < 1 ? (1 + (1- newScale)) : newScale)
  }

  return bounds3;
};

/**
 * Keeps value between given bounds, used for limiting view to given boundaries
 * 1# eg. boundLimiter(2, 0, 3, true) => 2
 * 2# eg. boundLimiter(4, 0, 3, true) => 3
 * 3# eg. boundLimiter(-2, 0, 3, true) => 0
 * 4# eg. boundLimiter(10, 0, 3, false) => 10
 */
export const boundLimiter = (
  value: number,
  minBound: number,
  maxBound: number,
  isActive: boolean,
): number => {
  if (!isActive) return roundNumber(value, 2);
  if (value < minBound) return roundNumber(minBound, 2);
  if (value > maxBound) return roundNumber(maxBound, 2);
  return roundNumber(value, 2);
};

export const handleCalculateBounds = (
  contextInstance: ReactZoomPanPinchContext,
  newScale: number,
): BoundsType => {
  const bounds = calculateBounds(contextInstance, newScale);

  // Save bounds
  contextInstance.bounds = bounds;
  return bounds;
};

export function getMouseBoundedPosition(
  positionX: number,
  positionY: number,
  bounds: BoundsType,
  limitToBounds: boolean,
  paddingValueX: number,
  paddingValueY: number,
  wrapperComponent: HTMLDivElement | null,
): PositionType {
  const { minPositionX, minPositionY, maxPositionX, maxPositionY } = bounds;

  let paddingX = 0;
  let paddingY = 0;

  if (wrapperComponent) {
    paddingX = paddingValueX;
    paddingY = paddingValueY;
  }

  const x = boundLimiter(
    positionX,
    minPositionX - paddingX,
    maxPositionX + paddingX,
    limitToBounds,
  );

  const y = boundLimiter(
    positionY,
    minPositionY - paddingY,
    maxPositionY + paddingY,
    limitToBounds,
  );
  return { x, y };
}
