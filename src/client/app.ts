import { Canvas, Coordinate, getIndexFromCoordinate } from './canvas';
import { Socket } from './socket';
import { UI } from './ui';

import './reset.scss';
import './styles.scss';

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
      .then((data: number[]) => {
        canvas.drawData(data);
        ui.setLoading(false);
        ui.updateText(data.length);
        previewDrawnCount = data.length;
        if (processMode) ui.loopProcess();
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

type Coords = {
  x: number;
  y: number;
};
let tpCache: Touch[] = [];

const midpoint = (t1: Touch, t2: Touch): Coords => ({
  x: Math.round((t1.pageX + t2.pageX) / 2),
  y: Math.round((t1.pageY + t2.pageY) / 2),
});

let initialWindowX = window.scrollX;
let initialWindowY = window.scrollY;
let maxX = 4096 - window.innerWidth;
let maxY = 4096 - window.innerHeight;
let maxTranslateX = window.innerWidth;
let maxTranslateY = window.innerHeight;

window.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  ui.checkTouchMessage();
});

canvas.canvas.addEventListener('touchstart', (ev) => {
  if (ev.targetTouches.length === 2) {
    initialWindowX = window.scrollX;
    initialWindowY = window.scrollY;
    for (let i = 0; i < ev.targetTouches.length; i++) {
      tpCache.push(ev.targetTouches[i]);
    }
  }
});

window.addEventListener(
  'touchend',
  (ev) => {
    if (!(ev.target instanceof HTMLButtonElement)) ev.preventDefault();
  },
  { passive: false },
);

function handlePan(ev: TouchEvent) {
  if (ev.targetTouches.length === 2) {
    window.requestAnimationFrame(() => {
      const point1 = tpCache.findLastIndex(
        (tp) => tp.identifier === ev.targetTouches[0].identifier,
      );
      const point2 = tpCache.findLastIndex(
        (tp) => tp.identifier === ev.targetTouches[1].identifier,
      );

      if (point1 >= 0 && point2 >= 0) {
        const initialMidpoint = midpoint(tpCache[point1], tpCache[point2]);
        const currentMidpoint = midpoint(
          ev.targetTouches[0],
          ev.targetTouches[1],
        );

        const midPointX = currentMidpoint.x - initialMidpoint.x;
        const midPointY = currentMidpoint.y - initialMidpoint.y;

        const translation = {
          x: Math.max(-maxTranslateX, Math.min(maxTranslateX, midPointX)),
          y: Math.max(-maxTranslateY, Math.min(maxTranslateY, midPointY)),
        };

        const left = Math.max(
          0,
          Math.min(maxX, initialWindowX - translation.x),
        );
        const top = Math.max(0, Math.min(maxY, initialWindowY - translation.y));

        window.scrollTo({
          left,
          top,
          behavior: 'instant',
        });

        initialWindowX = left;
        initialWindowY = top;
      }
    });
  } else {
    tpCache = [];
  }
}

canvas.canvas.addEventListener(
  'touchmove',
  (ev) => {
    ev.preventDefault();
    if (ev.targetTouches.length === 1) {
      if (ui.isAnimating()) return;
      const coordinate = [
        Math.floor(ev.targetTouches[0].pageX),
        Math.floor(ev.targetTouches[0].pageY),
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
  maxTranslateX = window.innerWidth;
  maxTranslateY = window.innerHeight;
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
      // Save the current position to URL
      window.location.hash = `${window.scrollX},${window.scrollY}`;
      return;
    case 'g':
      document.body.classList.toggle('largeType');
      return;
  }
});

scrollFromHash();
