import { GRID_SIZE } from "../core/constants.js";
import { appEls, state } from "./state.js";

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * GRID_SIZE * state.camera.zoom + state.camera.offsetX,
    y: worldY * GRID_SIZE * state.camera.zoom + state.camera.offsetY,
  };
}

function getVisibleWorldBounds() {
  const width = appEls.canvas.clientWidth;
  const height = appEls.canvas.clientHeight;
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(width, height);

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

function clientToCanvas(clientX, clientY) {
  const rect = appEls.canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function clientToWorld(
  clientX,
  clientY,
  zoom = state.camera.zoom,
  offsetX = state.camera.offsetX,
  offsetY = state.camera.offsetY
) {
  const point = clientToCanvas(clientX, clientY);
  return screenToWorld(point.x, point.y, zoom, offsetX, offsetY);
}

function screenToWorld(
  screenX,
  screenY,
  zoom = state.camera.zoom,
  offsetX = state.camera.offsetX,
  offsetY = state.camera.offsetY
) {
  return {
    x: (screenX - offsetX) / (GRID_SIZE * zoom),
    y: (screenY - offsetY) / (GRID_SIZE * zoom),
  };
}

function worldLengthToScreen(lengthInGrid) {
  return lengthInGrid * GRID_SIZE * state.camera.zoom;
}

export {
  worldToScreen,
  getVisibleWorldBounds,
  clientToCanvas,
  clientToWorld,
  screenToWorld,
  worldLengthToScreen,
};
