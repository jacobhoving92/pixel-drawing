const colorRange = 256;
const canvasSize = 4096;
let speed = 200;

export type Coordinate = [number, number];

let backupData: number[];
let backupImage: ImageData;

export function getIndexFromCoordinate([x, y]: Coordinate) {
  return canvasSize * y + x;
}
export function getCoordinateFromCoordinateIndex(index: number): Coordinate {
  return [index % canvasSize, Math.floor(index / canvasSize)];
}

export function Canvas(containerEl: HTMLElement | null) {
  if (!containerEl) throw new Error('Element not found!');
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create canvas context!');

  context.imageSmoothingEnabled = false;
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  let image = context.createImageData(canvas.width, canvas.height);
  let data = image.data;

  function clearCanvas() {
    if (!context) throw new Error('Could not create canvas context!');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    image = context.createImageData(canvas.width, canvas.height);
    data = image.data;
  }

  function drawPixel(coordinateIndex: number, pixelsDrawnCount: number) {
    const index = 4 * coordinateIndex;

    const color = getColor(pixelsDrawnCount);

    data[index + 0] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = 255;
  }

  function pixelEmpty(coordinateIndex: number) {
    const index = 4 * coordinateIndex;
    return data[index + 3] === 0;
  }

  function swapBuffer() {
    context?.putImageData(image, 0, 0);
  }

  const pixel = new ImageData(1, 1);

  function swapPixel(
    coordinateIndex: number,
    pixelsDrawnCount: number,
    force?: boolean,
  ) {
    const index = 4 * coordinateIndex;

    // Check if pixel already drawn
    if (!force && data[index + 3] !== 0) return;
    const color = getColor(pixelsDrawnCount);
    data[index + 3] = 255;

    pixel.data[0] = color.r;
    pixel.data[1] = color.g;
    pixel.data[2] = color.b;
    pixel.data[3] = 255;

    const coordinate = getCoordinateFromCoordinateIndex(coordinateIndex);
    context?.putImageData(pixel, coordinate[0], coordinate[1]);
  }

  function erasePixel(coordinateIndex: number) {
    const index = 4 * coordinateIndex;

    data[index + 3] = 0;
    const coordinate = getCoordinateFromCoordinateIndex(coordinateIndex);
    context?.putImageData(pixel, coordinate[0], coordinate[1]);
  }

  const multi = colorRange * colorRange;

  function getColor(index: number) {
    return {
      r: Math.floor((index / multi) % colorRange),
      g: Math.floor((index / colorRange) % colorRange),
      b: index % colorRange,
    };
  }

  function drawData(data: number[]) {
    if (!data || !data.length) return;
    console.log('Start drawing initial data…', performance.now());
    clearCanvas();
    backupData = data;
    data.forEach((coordinateIndex, index) => {
      drawPixel(coordinateIndex, index);
    });
    swapBuffer();
    backupImage = image;
    console.log('Done.', performance.now());
  }

  let counter = 0;
  let animating = false;

  function handleAnimationComplete() {
    animating = false;
    if (backupImage) {
      image = backupImage;
      swapBuffer();
    }
  }

  function animate(cb?: () => void, onUpdate?: (counter: number) => void) {
    let runToLength = backupData.length - 1;
    function innerAnimate() {
      for (let i = 0; i < speed; i++) {
        if (counter < runToLength) {
          drawPixel(backupData[counter], counter);
          counter++;
        }
      }

      swapBuffer();

      if (animating && counter < runToLength) {
        if (onUpdate) onUpdate(counter);
        window.requestAnimationFrame(innerAnimate);
      } else {
        if (cb) cb();
      }
    }
    innerAnimate();
  }

  function startAnimation(
    cb?: () => void,
    onUpdate?: (counter: number) => void,
  ) {
    if (!backupImage) backupImage = image;
    clearCanvas();
    animating = true;
    counter = 0;
    animate(cb, onUpdate);
  }

  containerEl.appendChild(canvas);

  return {
    canvas,
    pixelEmpty,
    drawImmediate(
      coordinateIndex: number,
      pixelsDrawnCount: number,
      force?: boolean,
    ) {
      swapPixel(coordinateIndex, pixelsDrawnCount, force);
    },
    erase(coordinateIndex: number) {
      erasePixel(coordinateIndex);
    },
    drawData,
    getColor,
    startAnimation,
    stopAnimation: handleAnimationComplete,
    totalPixels: canvas.width * canvas.height,
  };
}

export type Canvas = ReturnType<typeof Canvas>;
