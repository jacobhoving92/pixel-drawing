import { Canvas, Coordinate, getIndexFromCoordinate } from './canvas';
import { Socket } from './socket';
import { UI } from './ui';

let previewDrawnCount = 0;

const canvas = Canvas(document.getElementById('canvas'));
const ui = UI(canvas);

ui.setLoading(true);

// ADD SOCKET LISTENERS
const hostname =
  process.env.NODE_ENV === 'production'
    ? window.location.hostname + `:${window.location.port}`
    : 'iviviv-mbp.local:3000';

const socket = Socket({
  hostname,
  onOpen: () => {
    fetch(window.location.protocol + '//' + hostname + '/api/data')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load pixel data');
        const reader = res.body!.getReader();
        let remainder = new Uint8Array(0);
        let totalPixels = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Concat leftover bytes from previous chunk with new data
          const combined = new Uint8Array(remainder.length + value.length);
          combined.set(remainder);
          combined.set(value, remainder.length);

          // Process complete 3-byte triplets
          const usable = combined.length - (combined.length % 3);
          const count = usable / 3;
          const chunk: number[] = new Array(count);
          for (let i = 0; i < count; i++) {
            chunk[i] = (combined[i * 3] << 16) | (combined[i * 3 + 1] << 8) | combined[i * 3 + 2];
          }

          canvas.drawChunk(chunk, totalPixels);
          totalPixels += count;
          ui.setLoading(false);
          ui.updateText(totalPixels);

          // Keep leftover bytes for next iteration
          remainder = combined.slice(usable);
        }

        canvas.finalizeStream();
        previewDrawnCount = totalPixels;
        if (processMode) ui.loopProcess();
      })
      .catch(() => {
        ui.setLoadingError();
      });
  },
  onMessage: (message) => {
    const parsedMessage = JSON.parse(message);
    if (!parsedMessage?.length) return;
    if (parsedMessage.length > 3) {
      canvas.drawData(parsedMessage as number[], true);
      ui.updateText(parsedMessage.length);
      previewDrawnCount = parsedMessage.length;
    } else {
      const [coordinateIndex, pixelsDrawnCount, owner] = parsedMessage as [
        string,
        number,
        number,
      ];
      canvas.drawImmediate(
        parseInt(coordinateIndex, 10),
        pixelsDrawnCount,
        true,
      );
      ui.updateText(pixelsDrawnCount);
      if (owner !== 1) previewDrawnCount = pixelsDrawnCount;
    }
  },
});

// PROCESS MODE
let processMode = window.location.search === '?process';
function toggleProcessMode() {
  processMode = window.location.search === '?process';
  window.location.search = processMode ? '' : 'process';
  if (!processMode) {
    ui.loopProcess();
  } else {
    ui.stopAnimation();
  }
}

// DEMO MODE
let demoMode = window.location.search === '?demo';
let demoTimer: number;
let demoTime = 1000 * 15; // 15 seconds
let demoX = 0;
let demoY = 0;

function toggleDemoMode() {
  demoMode = window.location.search === '?demo';
  window.location.search = demoMode ? '' : 'demo';
}

function checkDemoTimer() {
  if (!demoMode) return;
  clearTimeout(demoTimer);
  demoTimer = window.setTimeout(() => {
    window.scrollTo({ top: demoY, left: demoX, behavior: 'smooth' });
  }, demoTime);
}

if (demoMode) window.addEventListener('scroll', checkDemoTimer);

// ACTUAL MOUSE/TOUCH DRAWING
const lastAsks: number[] = [];

function checkLastAsks(coordinateIndex: number) {
  return !lastAsks.includes(coordinateIndex);
}

function updateLastAsks(coordinateIndex: number) {
  if (lastAsks.length > 10) lastAsks.shift();
  lastAsks.push(coordinateIndex);
}

window.addEventListener('mousemove', (ev) => {
  if (ui.isAnimating()) return;
  const coordinate = [Math.floor(ev.pageX), Math.floor(ev.pageY)] as Coordinate;
  const coordinateIndex = getIndexFromCoordinate(coordinate);
  if (canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
    socket.send(coordinateIndex);
    previewDrawnCount += 1;
    canvas.drawImmediate(coordinateIndex, previewDrawnCount);
  }
  updateLastAsks(coordinateIndex);
  checkDemoTimer();
});

// TOUCH EVENTS

type Coords = [number, number];

export function getCentroid(touchEvents: TouchList): [number, number] {
  const length = touchEvents.length;
  let x = 0;
  let y = 0;
  for (let i = 0; i < length; i++) {
    x += touchEvents[i].clientX;
    y += touchEvents[i].clientY;
  }
  return [x / length, y / length];
}

let maxX = 4096 - window.innerWidth;
let maxY = 4096 - window.innerHeight;

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());

window.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  ui.checkTouchMessage();
});

let lastCentroid: Coords | null = null;
let velocityX = 0;
let velocityY = 0;
let momentumRaf = 0;
let isPanning = false;
// Sub-pixel scroll accumulator to avoid integer rounding jitter
let scrollX = 0;
let scrollY = 0;

const FRICTION = 0.92;
const MIN_VELOCITY = 0.5;
const VELOCITY_SMOOTHING = 0.8;

function startMomentum() {
  if (momentumRaf) return;
  momentumRaf = window.requestAnimationFrame(tickMomentum);
}

function stopMomentum() {
  if (momentumRaf) {
    cancelAnimationFrame(momentumRaf);
    momentumRaf = 0;
  }
  velocityX = 0;
  velocityY = 0;
}

function tickMomentum() {
  momentumRaf = 0;
  velocityX *= FRICTION;
  velocityY *= FRICTION;

  if (Math.abs(velocityX) < MIN_VELOCITY && Math.abs(velocityY) < MIN_VELOCITY) {
    velocityX = 0;
    velocityY = 0;
    return;
  }

  scrollX = Math.max(0, Math.min(maxX, scrollX + velocityX));
  scrollY = Math.max(0, Math.min(maxY, scrollY + velocityY));
  window.scrollTo({ left: Math.round(scrollX), top: Math.round(scrollY), behavior: 'instant' });
  momentumRaf = window.requestAnimationFrame(tickMomentum);
}

canvas.canvas.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  if (ev.touches.length > 1) {
    stopMomentum();
    isPanning = true;
    scrollX = window.scrollX;
    scrollY = window.scrollY;
    lastCentroid = getCentroid(ev.targetTouches);
  }
});

window.addEventListener('touchend', (ev) => {
  if (!(ev.target instanceof HTMLButtonElement)) ev.preventDefault();
});

canvas.canvas.addEventListener('touchend', (ev) => {
  if (ev.targetTouches.length < 2) {
    lastCentroid = null;
    if (isPanning) {
      isPanning = false;
      startMomentum();
    }
  } else {
    lastCentroid = getCentroid(ev.targetTouches);
  }
});

function handlePan(ev: TouchEvent) {
  if (ev.targetTouches.length < 2) return;
  const centroid = getCentroid(ev.targetTouches);
  if (!lastCentroid) {
    lastCentroid = centroid;
    return;
  }
  const dX = lastCentroid[0] - centroid[0];
  const dY = lastCentroid[1] - centroid[1];
  velocityX = velocityX * VELOCITY_SMOOTHING + dX * (1 - VELOCITY_SMOOTHING);
  velocityY = velocityY * VELOCITY_SMOOTHING + dY * (1 - VELOCITY_SMOOTHING);
  scrollX = Math.max(0, Math.min(maxX, scrollX + dX));
  scrollY = Math.max(0, Math.min(maxY, scrollY + dY));
  window.scrollTo({ left: Math.round(scrollX), top: Math.round(scrollY), behavior: 'instant' });
  lastCentroid = centroid;
}

canvas.canvas.addEventListener(
  'touchmove',
  (ev) => {
    ev.preventDefault();
    if (ev.touches.length === 1) {
      if (ui.isAnimating()) return;
      const coordinate = [
        Math.floor(ev.touches[0].pageX),
        Math.floor(ev.touches[0].pageY),
      ] as Coordinate;
      const coordinateIndex = getIndexFromCoordinate(coordinate);
      if (
        canvas.pixelEmpty(coordinateIndex) &&
        checkLastAsks(coordinateIndex)
      ) {
        socket.send(coordinateIndex);
        previewDrawnCount += 1;
        canvas.drawImmediate(coordinateIndex, previewDrawnCount);
      }
      updateLastAsks(coordinateIndex);
      return;
    }

    handlePan(ev);
  },
  { passive: false },
);

// SCROLL COORDINATES
function scrollFromHash() {
  const hash = window.location.hash.replace('#', '');
  const split = hash.split(',');

  if (split.length === 2) {
    const coordinate = split.map((v) => parseInt(v, 10));
    window.scrollTo(coordinate[0], coordinate[1]);
  } else {
    // scroll to random position
    window.scrollTo(Math.random() * maxX, Math.random() * maxY);
  }
}

window.addEventListener('hashchange', () => {
  scrollFromHash();
});

window.addEventListener('resize', () => {
  maxX = 4096 - window.innerWidth;
  maxY = 4096 - window.innerHeight;
});

window.addEventListener('keyup', (ev) => {
  switch (ev.key) {
    case 'p':
      toggleProcessMode();
      return;
    case 'd':
      toggleDemoMode();
      return;
    case 't':
      if (!demoMode) return;
      demoX = window.scrollX;
      demoY = window.scrollY;
      return;
    case 's':
      window.location.hash = `${window.scrollX},${window.scrollY}`;
      return;
    case 'g':
      document.body.classList.toggle('largeType');
      return;
  }
});

scrollFromHash();
