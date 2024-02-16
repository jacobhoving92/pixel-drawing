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

const canvas = Canvas(document.getElementById('canvas'));

// ADD SOCKET LISTENERS
const hostname =
  process.env.NODE_ENV === 'production'
    ? window.location.hostname + `:${window.location.port}`
    : 'iviviv-mbp.local:3000';

const socket = Socket({
  hostname,
  onOpen: (s: WebSocket | undefined) => {
    setLoading(true);
    if (s) s.send('erase-810226');
    fetch(window.location.protocol + '//' + hostname + '/api/data')
      .then(async (res) => {
        return await res.json();
      })
      .then((data: number[]) => {
        canvas.drawData(data);
        setLoading(false);
      });
  },
  onMessage: (message) => {
    const [coordinateIndex, pixelsDrawnCount] = JSON.parse(message) as [
      number,
      number,
    ];
    canvas.drawImmediate(coordinateIndex, pixelsDrawnCount);
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
  if (!canvas.pixelEmpty(coordinateIndex) && checkLastAsks(coordinateIndex)) {
    socket.send(JSON.stringify(coordinateIndex));
    canvas.erase(coordinateIndex);
  }
  updateLastAsks(coordinateIndex);
});
