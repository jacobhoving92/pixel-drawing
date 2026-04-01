import { Canvas, Coordinate, getIndexFromCoordinate } from './canvas';
import { Socket } from './socket';

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
  onOpen: () => {
    setLoading(true);
    socket.sendRaw('erase-810226');
    fetch(window.location.protocol + '//' + hostname + '/api/data')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load pixel data');
        const reader = res.body!.getReader();
        let remainder = new Uint8Array(0);
        let totalPixels = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const combined = new Uint8Array(remainder.length + value.length);
          combined.set(remainder);
          combined.set(value, remainder.length);

          const usable = combined.length - (combined.length % 3);
          const count = usable / 3;
          const chunk: number[] = new Array(count);
          for (let i = 0; i < count; i++) {
            chunk[i] = (combined[i * 3] << 16) | (combined[i * 3 + 1] << 8) | combined[i * 3 + 2];
          }

          canvas.drawChunk(chunk, totalPixels);
          totalPixels += count;
          remainder = combined.slice(usable);
        }

        canvas.finalizeStream();
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
    socket.send(coordinateIndex);
    canvas.erase(coordinateIndex);
  }
  updateLastAsks(coordinateIndex);
});
