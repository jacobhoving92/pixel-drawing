import { Canvas, Coordinate, getIndexFromCoordinate } from './canvas';
import './styles.scss';

import { io } from 'socket.io-client';

const URL =
  process.env.NODE_ENV === 'production'
    ? window.location.host
    : 'http://localhost:3000';

const socket = io(URL, {
  transports: ['websocket'],
});

const setLoading = (loading: boolean) => {
  const loadingEl = document.getElementById('loading');
  const info = document.getElementById('info');

  if (loadingEl) loadingEl.style.display = loading ? 'flex' : 'none';
  if (info) info.style.display = !loading ? 'flex' : 'none';
};

const canvas = Canvas(document.getElementById('canvas'));

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

socket.on('connect', () => {
  console.log('connected');
  socket.emit('init');
  fetch(URL + '/api/data')
    .then(async (res) => {
      return await res.json();
    })
    .then((data: number[]) => {
      canvas.drawData(data);
      setLoading(false);
      updateUI(data.length);
    });
});

socket.on('disconnect', () => {
  console.log('We disconnected from the socket');
});

socket.on('draw', ([coordinateIndex, pixelsDrawnCount]: [number, number]) => {
  canvas.drawImmediate(coordinateIndex, pixelsDrawnCount);
  updateUI(pixelsDrawnCount);
});

const lastAsks: number[] = [];

function checkLastAsks(coordinateIndex: number) {
  return !lastAsks.includes(coordinateIndex);
}

function updateLastAsks(coordinateIndex: number) {
  if (lastAsks.length > 10) lastAsks.shift();
  lastAsks.push(coordinateIndex);
}

canvas.canvas.addEventListener('pointermove', (ev) => {
  const coordinate = [ev.offsetX, ev.offsetY] as Coordinate;
  const coordinateIndex = getIndexFromCoordinate(coordinate);
  if (canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
    socket.emit('askToDraw', coordinateIndex);
  }
  updateLastAsks(coordinateIndex);
});

canvas.canvas.addEventListener('touchmove', (ev) => {
  if (ev.touches.length > 1) {
    ev.preventDefault();
    ev.stopPropagation();
    const coordinate = [
      ev.touches[0].clientX,
      ev.touches[0].clientY,
    ] as Coordinate;
    const coordinateIndex = getIndexFromCoordinate(coordinate);
    if (canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
      socket.emit('askToDraw', coordinateIndex);
    }
    updateLastAsks(coordinateIndex);
  }
});