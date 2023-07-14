const colorRange = 256;
const canvasSize = 4096;
let speed = 1600;

export type Coordinate = [number, number];

export function Canvas(el: HTMLElement | null) {
  if (!el) throw new Error('Element not found!');
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

  function drawPixel([x, y], pixelIndex) {
    const color = getColor(pixelIndex);
    const index = 4 * (canvas.width * y + x);

    if (data[index + 3] !== 0) return;

    data[index + 0] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = 255;
  }

  function pixelEmpty([x, y]) {
    const index = 4 * (canvas.width * y + x);
    return data[index + 3] === 0;
  }

  function swapBuffer() {
    context.putImageData(image, 0, 0);
  }

  const pixel = new ImageData(1, 1);

  console.log(pixel);

  function swapPixel([x, y, pixelIndex]) {
    const color = getColor(pixelIndex);
    const index = 4 * (canvas.width * y + x);

    // Check if pixel already drawn
    if (data[index + 3] !== 0) return;
    data[index + 3] = 255;

    pixel.data[0] = color.r;
    pixel.data[1] = color.g;
    pixel.data[2] = color.b;
    pixel.data[3] = 255;

    context?.putImageData(pixel, x, y);
  }

  const multi = colorRange * colorRange;

  function getColor(index) {
    return {
      r: Math.floor((index / multi) % colorRange),
      g: Math.floor((index / colorRange) % colorRange),
      b: index % colorRange,
    };
  }

  function drawData(data: Coordinate[]) {
    console.log('Start drawing initial data…', performance.now());
    data.forEach((coordinate, index) => {
      drawPixel(coordinate, index);
    });
    swapBuffer();
    console.log('Done.', performance.now());
  }
  // drawSavedData();

  // canvas.addEventListener('mousemove', (ev) => {
  //   if (!stopped) return;
  //   const coordinate = [ev.offsetX, ev.offsetY];
  //   fakeData.push(coordinate);
  //   const color = getColor(fakeData.length);
  //   drawPixel(coordinate, color);
  //   swapBuffer();
  // });

  let counter = 0;
  let stopped = true;

  // function animate() {
  //   for (let i = 0; i < speed; i++) {
  //     if (counter < fakeData.length - 1) {
  //       drawPixel(fakeData[counter], getColor(counter));
  //       counter++;
  //     }
  //   }
  //   swapBuffer();

  //   if (!stopped && counter < fakeData.length - 1) {
  //     window.requestAnimationFrame(animate);
  //   } else {
  //     console.log('animation stopped!');
  //   }
  // }

  // window.addEventListener('keyup', (ev) => {
  //   if (ev.key === 'a') {
  //     console.log('playback!');
  //     context.clearRect(0, 0, canvas.width, canvas.height);
  //     image = context.createImageData(canvas.width, canvas.height);
  //     data = image.data;
  //     stopped = false;
  //     counter = 0;
  //     animate();
  //   }
  //   if (ev.key === 's') {
  //     console.log('stop!');
  //     stopped = true;
  //     drawSavedData();
  //   }
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

  const pixelsDrawnEl = document.getElementById('pixelsDrawn');
  const pixelsRemainingEl = document.getElementById('pixelsRemaining');
  const rEl = document.getElementById('red');
  const gEl = document.getElementById('green');
  const bEl = document.getElementById('blue');

  function updateUI([_, __, index]) {
    if (pixelsDrawnEl) pixelsDrawnEl.textContent = `${index}`;
    if (pixelsRemainingEl)
      pixelsRemainingEl.textContent = `${canvas.width * canvas.height - index}`;
    const color = getColor(index);
    if (rEl) rEl.textContent = `${color.r}`;
    if (gEl) gEl.textContent = `${color.g}`;
    if (bEl) bEl.textContent = `${color.b}`;
  }

  el.appendChild(canvas);

  return {
    canvas,
    pixelEmpty,
    drawImmediate(data) {
      swapPixel(data);
      updateUI(data);
    },
    drawData,
  };
}
