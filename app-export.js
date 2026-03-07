const EXPORT_FILENAME_PREFIX = "circuito";
const EXPORT_TRIM_PADDING_PX = 12;
const EXPORT_SCALE = 3;

async function handleExportAction({ background = "white" } = {}) {
  if (state.components.length === 0) {
    showStatus("Adicione um componente para exportar", true);
    return;
  }

  try {
    const blob = await exportCircuitBlob({ background });
    const fileName = buildExportFileName();
    const successMessage =
      background === "transparent" ? "PNG transparente pronto para compartilhar" : "PNG pronto para compartilhar";
    const downloadMessage = background === "transparent" ? "PNG transparente exportado" : "PNG exportado";
    if (await tryShareExport(blob, fileName)) {
      showStatus(successMessage);
      return;
    }

    downloadBlob(blob, fileName);
    showStatus(downloadMessage);
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    showStatus("Falha ao exportar PNG", true);
  }
}

async function exportCircuitBlob({ background = "white" } = {}) {
  const width = Math.max(1, Math.floor(appEls.canvas.clientWidth));
  const height = Math.max(1, Math.floor(appEls.canvas.clientHeight));
  const exportDpr = Math.max(1, EXPORT_SCALE);
  const exportCanvas = document.createElement("canvas");
  const exportRenderTarget = createRenderTarget(exportCanvas, {
    width,
    height,
    dpr: exportDpr,
  });
  resizeRenderTarget(exportRenderTarget, width, height, exportDpr);

  drawScene(
    {
      background: "transparent",
      showGrid: false,
      showSelection: false,
      showPendingTerminal: false,
    },
    exportRenderTarget
  );

  const trimmedCanvas = trimCanvas(exportCanvas, Math.ceil(exportDpr * EXPORT_TRIM_PADDING_PX));
  const finalCanvas =
    background === "white" ? applyCanvasBackground(trimmedCanvas, "#ffffff") : trimmedCanvas;
  return canvasToBlob(finalCanvas, "image/png");
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("blob export failed"));
    }, type);
  });
}

async function tryShareExport(blob, fileName) {
  const isMobile = window.matchMedia?.("(pointer: coarse)").matches;
  if (!isMobile || !navigator.share || typeof File === "undefined") {
    return false;
  }

  try {
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }

    await navigator.share({
      files: [file],
      title: "Circuito",
    });
    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    return false;
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function buildExportFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${EXPORT_FILENAME_PREFIX}-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
}

function applyCanvasBackground(sourceCanvas, fillStyle) {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;

  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) {
    return sourceCanvas;
  }

  outputCtx.fillStyle = fillStyle;
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.drawImage(sourceCanvas, 0, 0);
  return outputCanvas;
}

function trimCanvas(sourceCanvas, paddingPx = 0) {
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) {
    return sourceCanvas;
  }

  const { width, height } = sourceCanvas;
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return sourceCanvas;
  }

  const left = Math.max(0, minX - paddingPx);
  const top = Math.max(0, minY - paddingPx);
  const right = Math.min(width - 1, maxX + paddingPx);
  const bottom = Math.min(height - 1, maxY + paddingPx);
  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = right - left + 1;
  trimmedCanvas.height = bottom - top + 1;

  const trimmedCtx = trimmedCanvas.getContext("2d");
  if (!trimmedCtx) {
    return sourceCanvas;
  }

  trimmedCtx.drawImage(
    sourceCanvas,
    left,
    top,
    trimmedCanvas.width,
    trimmedCanvas.height,
    0,
    0,
    trimmedCanvas.width,
    trimmedCanvas.height
  );

  return trimmedCanvas;
}
