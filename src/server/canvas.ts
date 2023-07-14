export type Coordinate = [number, number];

export function Canvas(initialData: Coordinate[] = []) {
  const canvasWidth = 4096;
  const coordinates: Coordinate[] = initialData;
  const imageData = new Uint8ClampedArray(canvasWidth * canvasWidth);

  function allowedToDraw([x, y]: Coordinate) {
    const index = canvasWidth * y + x;
    if (imageData[index] === 1) return false;
    imageData[index] = 1;
    coordinates.push([x, y]);
    return true;
  }

  function getIndex() {
    return coordinates.length;
  }

  function getInitialData() {
    return coordinates;
  }

  return {
    allowedToDraw,
    getIndex,
    getInitialData,
  };
}

export type CanvasInstance = ReturnType<typeof Canvas>;
