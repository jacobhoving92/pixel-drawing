import { Canvas } from './canvas';
import './styles.scss';

import { io } from 'socket.io-client';

const socket = io({
  transports: ['websocket'],
  timestampRequests: false,
});

const canvas = Canvas(document.getElementById('canvas'));

socket.on('connect', () => {
  console.log('connected');
  socket.emit('init');
  fetch('/api/data')
    .then(async (res) => {
      return await res.json();
    })
    .then((data) => {
      canvas.drawData(data);
    });
});

socket.on('disconnect', () => {
  console.log('We disconnected from the socket');
});

socket.on('draw', (data) => {
  canvas.drawImmediate(data);
});

const lastAsks: string[] = [];

function checkLastAsks([x, y]) {
  const concat = `${x}${y}`;
  return !lastAsks.includes(concat);
}

function updateLastAsks([x, y]) {
  const concat = `${x}${y}`;
  if (lastAsks.length > 10) lastAsks.shift();
  lastAsks.push(concat);
}

canvas.canvas.addEventListener('mousemove', (ev) => {
  const coordinate = [ev.offsetX, ev.offsetY];
  if (canvas.pixelEmpty(coordinate) && checkLastAsks(coordinate)) {
    socket.emit('askToDraw', coordinate);
  }
  updateLastAsks(coordinate);
});
