import { Canvas, Coordinate, getIndexFromCoordinate } from './canvas';
import './reset.scss';
import { Socket } from './socket';
import './styles.scss';

const setLoading = (loading: boolean) => {
  const loadingEl = document.getElementById('loading');
  const textEl = document.getElementById('text-container');

  if (loadingEl) loadingEl.style.display = loading ? 'flex' : 'none';
  if (textEl) textEl.style.display = !loading ? 'flex' : 'none';
};

const toggleCredits = () => {
  const creditsEl = document.getElementById('credits');
  if (creditsEl)
    creditsEl.style.display =
      creditsEl.style.display === 'none' ? 'flex' : 'none';
};

const credistBtn = document.getElementById('creditsBtn');
if (credistBtn) credistBtn.addEventListener('click', toggleCredits);

const canvas = Canvas(document.getElementById('canvas'));

// UPDATE INFO TEXT

const pixelsDrawnEl = document.getElementById('pixelsDrawn');
const pixelsRemainingEl = document.getElementById('pixelsRemaining');
const rEl = document.getElementById('red');
const gEl = document.getElementById('green');
const bEl = document.getElementById('blue');

function updateUI(pixelsDrawnCount: number) {
  if (pixelsDrawnEl) pixelsDrawnEl.textContent = `${pixelsDrawnCount}`;
  if (pixelsRemainingEl)
    pixelsRemainingEl.textContent = `${canvas.totalPixels - pixelsDrawnCount}`;
  const color = canvas.getColor(pixelsDrawnCount);
  if (rEl) rEl.textContent = `${color.r}`;
  if (gEl) gEl.textContent = `${color.g}`;
  if (bEl) bEl.textContent = `${color.b}`;
}

// ADD SOCKET LISTENERS
const hostname =
  process.env.NODE_ENV === 'production'
    ? window.location.hostname + `:${window.location.port}`
    : '0.0.0.0:3000';

const socket = Socket({
  hostname,
  onOpen: () => {
    fetch(window.location.protocol + '//' + hostname + '/api/data')
      .then(async (res) => {
        return await res.json();
      })
      .then((data: number[]) => {
        canvas.drawData(data);
        setLoading(false);
        updateUI(data.length);
      });
  },
  onMessage: (message) => {
    const [coordinateIndex, pixelsDrawnCount] = JSON.parse(message) as [
      number,
      number,
    ];
    canvas.drawImmediate(coordinateIndex, pixelsDrawnCount);
    updateUI(pixelsDrawnCount);
  },
});

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
  const coordinate = [Math.floor(ev.pageX), Math.floor(ev.pageY)] as Coordinate;
  const coordinateIndex = getIndexFromCoordinate(coordinate);
  if (canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
    socket.send(JSON.stringify(coordinateIndex));
  }
  updateLastAsks(coordinateIndex);
});

type Coords = {
  x: number;
  y: number;
};
let tpCache: Touch[] = [];

const midpoint = ([t1, t2]: Touch[]): Coords => ({
  x: (t1.clientX + t2.clientX) / 2,
  y: (t1.clientY + t2.clientY) / 2,
});

let initialWindowX = window.scrollX;
let initialWindowY = window.scrollY;
let maxX = 4096 - window.innerWidth;
let maxY = 4096 - window.innerHeight;
let maxTranslateX = window.innerWidth;
let maxTranslateY = window.innerHeight;

window.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  initialWindowX = window.scrollX;
  initialWindowY = window.scrollY;
  if (ev.targetTouches.length === 2) {
    for (let i = 0; i < ev.targetTouches.length; i++) {
      tpCache.push(ev.targetTouches[i]);
    }
  }
});

function handlePan(ev: TouchEvent) {
  if (ev.targetTouches.length === 2) {
    // && ev.changedTouches.length === 2
    const point1 = tpCache.findLastIndex(
      (tp) => tp.identifier === ev.targetTouches[0].identifier,
    );
    const point2 = tpCache.findLastIndex(
      (tp) => tp.identifier === ev.targetTouches[1].identifier,
    );

    if (point1 >= 0 && point2 >= 0) {
      const initialMidpoint = midpoint([tpCache[point1], tpCache[point2]]);
      const currentMidpoint = midpoint([
        ev.targetTouches[0],
        ev.targetTouches[1],
      ]);

      const translation = {
        x: Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, currentMidpoint.x - initialMidpoint.x),
        ),
        y: Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, currentMidpoint.y - initialMidpoint.y),
        ),
      };

      window.scrollTo(
        Math.max(0, Math.min(maxX, initialWindowX - translation.x)),
        Math.max(0, Math.min(maxY, initialWindowY - translation.y)),
      );
    }
  } else {
    tpCache = [];
  }
}

window.addEventListener('resize', () => {
  maxX = 4096 - window.innerWidth;
  maxY = 4096 - window.innerHeight;
  maxTranslateX = window.innerWidth;
  maxTranslateY = window.innerHeight;
});

window.addEventListener('touchmove', (ev) => {
  ev.preventDefault();
  if (ev.touches.length === 1) {
    const coordinate = [
      Math.floor(ev.touches[0].pageX),
      Math.floor(ev.touches[0].pageY),
    ] as Coordinate;
    const coordinateIndex = getIndexFromCoordinate(coordinate);
    if (canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
      socket.send(JSON.stringify(coordinateIndex));
    }
    updateLastAsks(coordinateIndex);
    return;
  }

  if (ev.touches.length === 2 && ev.targetTouches.length === 2) {
    handlePan(ev);
  }
});

window.addEventListener('touchend', (ev) => {
  ev.preventDefault();
});

// SCROLL COORDINATES

function scrollFromHash() {
  const hash = window.location.hash.replace('#', '');
  const split = hash.split(',');
  if (split.length === 2) {
    const coordinate = split.map((v) => parseInt(v, 10));
    window.scrollTo(coordinate[0], coordinate[1]);
  }
}

window.addEventListener('hashchange', () => {
  scrollFromHash();
});

scrollFromHash();
