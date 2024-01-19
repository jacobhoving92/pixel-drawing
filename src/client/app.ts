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
    : 'localhost:3000';

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

canvas.canvas.addEventListener('pointermove', (ev) => {
  const coordinate = [
    Math.floor(ev.offsetX),
    Math.floor(ev.offsetY),
  ] as Coordinate;
  const coordinateIndex = getIndexFromCoordinate(coordinate);
  if (canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
    socket.send(JSON.stringify(coordinateIndex));
  }
  updateLastAsks(coordinateIndex);
});

canvas.canvas.addEventListener('touchmove', (ev) => {
  if (ev.touches.length === 1) {
    ev.preventDefault();
    ev.stopPropagation();
    const coordinate = [
      Math.floor(ev.touches[0].clientX),
      Math.floor(ev.touches[0].clientY),
    ] as Coordinate;
    const coordinateIndex = getIndexFromCoordinate(coordinate);
    if (canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
      socket.send(JSON.stringify(coordinateIndex));
    }
    updateLastAsks(coordinateIndex);
  }
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
