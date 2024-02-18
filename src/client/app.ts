import { Canvas, Coordinate, getIndexFromCoordinate } from './canvas';
import { Socket } from './socket';
import { UI } from './ui';

let previewDrawnCount = 0;

const canvas = Canvas(document.getElementById('canvas'));
const ui = UI(canvas);

// ADD SOCKET LISTENERS
const hostname =
  process.env.NODE_ENV === 'production'
    ? window.location.hostname + `:${window.location.port}`
    : 'iviviv-mbp.local:3000';

const socket = Socket({
  hostname,
  onOpen: () => {
    ui.setLoading(true);
    fetch(window.location.protocol + '//' + hostname + '/api/data')
      .then(async (res) => {
        return await res.json();
      })
      .then((data: any) => {
        if (data?.error) throw new Error('Failed to load pixel data');
        return data;
      })
      .then((data: number[]) => {
        canvas.drawData(data);
        ui.setLoading(false);
        ui.updateText(data.length);
        previewDrawnCount = data.length;
        if (processMode) ui.loopProcess();
      })
      .catch(() => {
        ui.setLoadingError();
      });
  },
  onMessage: (message) => {
    const [coordinateIndex, pixelsDrawnCount, owner] = JSON.parse(message) as [
      string,
      number,
      number,
    ];
    canvas.drawImmediate(parseInt(coordinateIndex, 10), pixelsDrawnCount, true);
    ui.updateText(pixelsDrawnCount);
    if (owner !== 1) previewDrawnCount = pixelsDrawnCount;
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
    socket.send(JSON.stringify(coordinateIndex));
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
  let pageX = 0;
  let pageY = 0;
  for (let i = 0; i < length; i++) {
    pageX += touchEvents[i].pageX;
    pageY += touchEvents[i].pageY;
  }
  return [pageX / length, pageY / length];
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

let initialWindowX = window.scrollX;
let initialWindowY = window.scrollY;

canvas.canvas.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  if (ev.touches.length > 1) {
    lastCentroid = getCentroid(ev.targetTouches);
    initialWindowX = window.scrollX;
    initialWindowY = window.scrollY;
  }
});

window.addEventListener('touchend', (ev) => {
  if (!(ev.target instanceof HTMLButtonElement)) ev.preventDefault();
});

canvas.canvas.addEventListener('touchend', (ev) => {
  if (ev.targetTouches.length < 2) {
    lastCentroid = null;
  }
});

function handlePan(ev: TouchEvent) {
  if (ev.targetTouches.length > 1) {
    const centroid = getCentroid(ev.targetTouches);
    if (lastCentroid) {
      const dX = lastCentroid[0] - centroid[0];
      const dY = lastCentroid[1] - centroid[1];

      const left = Math.max(0, Math.min(maxX, initialWindowX + dX));
      const top = Math.max(0, Math.min(maxY, initialWindowY + dY));

      window.scrollTo({
        left,
        top,
        behavior: 'instant',
      });
    }
  }
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
        socket.send(JSON.stringify(coordinateIndex));
        previewDrawnCount += 1;
        canvas.drawImmediate(coordinateIndex, previewDrawnCount);
      }
      updateLastAsks(coordinateIndex);
      return;
    }

    window.requestAnimationFrame(() => {
      handlePan(ev);
    });
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
