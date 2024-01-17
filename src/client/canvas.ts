const colorRange = 256;
const canvasSize = 4096;
let speed = 1600;

export type Coordinate = [number, number];

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

  function drawPixel(coordinateIndex: number, pixelsDrawnCount: number) {
    const color = getColor(pixelsDrawnCount);
    const index = 4 * coordinateIndex;

    if (data[index + 3] !== 0) return;

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

  function swapPixel(coordinateIndex: number, pixelsDrawnCount: number) {
    const color = getColor(pixelsDrawnCount);
    const index = 4 * coordinateIndex;

    // Check if pixel already drawn
    if (data[index + 3] !== 0) return;
    data[index + 3] = 255;

    pixel.data[0] = color.r;
    pixel.data[1] = color.g;
    pixel.data[2] = color.b;
    pixel.data[3] = 255;

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
    console.log('Start drawing initial data…', performance.now());
    if (!data || !data.length) return;
    data.forEach((coordinateIndex, index) => {
      drawPixel(coordinateIndex, index);
    });
    swapBuffer();
    console.log('Done.', performance.now());
  }

  let counter = 0;
  let stopped = true;

  function animate() {
    for (let i = 0; i < speed; i++) {
      if (counter < data.length - 1) {
        drawPixel(data[counter], counter);
        counter++;
      }
    }
    swapBuffer();

    if (!stopped && counter < data.length - 1) {
      window.requestAnimationFrame(animate);
    } else {
      console.log('animation stopped!');
    }
  }

  window.addEventListener('keyup', (ev) => {
    if (ev.key === 's') {
      window.location.hash = `${window.scrollX},${window.scrollY}`;
    }
    // if (ev.key === 'a') {
    //   console.log('playback!');
    //   context.clearRect(0, 0, canvas.width, canvas.height);
    //   image = context.createImageData(canvas.width, canvas.height);
    //   data = image.data;
    //   stopped = false;
    //   counter = 0;
    //   animate();
    // }
    // if (ev.key === 's') {
    //   console.log('stop!');
    //   stopped = true;
    //   // drawSavedData();
    // }
  });
  //   if (ev.key === 'p') {
  //     try {
  //       console.log('Saving data…');
  //       window.localStorage.setItem('data', JSON.stringify(fakeData));
  //       console.log('Saved!');
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   }
  //   if (ev.key === 'ArrowUp') {
  //     speed += 1;
  //   }
  //   if (ev.key === 'ArrowDown') {
  //     speed = Math.max(0, speed - 1);
  //   }
  // });

  containerEl.appendChild(canvas);

  return {
    canvas,
    pixelEmpty,
    drawImmediate(coordinateIndex: number, pixelsDrawnCount: number) {
      swapPixel(coordinateIndex, pixelsDrawnCount);
    },
    drawData,
    getColor,
    totalPixels: canvas.width * canvas.height,
  };
}
