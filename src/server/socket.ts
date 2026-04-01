import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { CanvasInstance } from './canvas';

export function SocketServer(server: http.Server, canvas?: CanvasInstance) {
  const wss = new WebSocketServer({ server });

  function broadcast(
    sender: WebSocket,
    coordinateIndex: string,
    pixelsDrawnCount: number,
  ) {
    const base = `["${coordinateIndex}",${pixelsDrawnCount},`;
    const ownerMsg = base + '1]';
    const otherMsg = base + '0]';
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(client === sender ? ownerMsg : otherMsg);
      }
    });
  }

  function broadcastBatch(
    sender: WebSocket,
    results: { coordinateIndex: string; pixelsDrawnCount: number | undefined }[],
  ) {
    const drawn = results.filter(
      (r): r is { coordinateIndex: string; pixelsDrawnCount: number } =>
        !!r.pixelsDrawnCount,
    );
    if (drawn.length === 0) return;

    const ownerMsgs = drawn.map((r) =>
      JSON.stringify([r.coordinateIndex, r.pixelsDrawnCount, 1]),
    );
    const otherMsgs = drawn.map((r) =>
      JSON.stringify([r.coordinateIndex, r.pixelsDrawnCount, 0]),
    );

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const msgs = client === sender ? ownerMsgs : otherMsgs;
        for (const msg of msgs) {
          client.send(msg);
        }
      }
    });
  }

  return {
    init: () => {
      wss.on('connection', async (socket) => {
        console.log('We have a connection!');
        let eraseMode = false;

        socket.on('error', console.error);
        socket.on('message', async (data) => {
          const message = data.toString();
          if (message === 'erase-810226') {
            eraseMode = true;
            return;
          }

          try {
            const parsed = JSON.parse(message);

            if (eraseMode) {
              await canvas?.erase(String(parsed));
              return;
            }

            if (Array.isArray(parsed)) {
              const indices = parsed.map(String);
              const results = await canvas?.drawBatch(indices);
              if (!results) return;
              broadcastBatch(socket, results);
            } else {
              const coordinateIndex = String(parsed);
              const pixelsDrawnCount = await canvas?.draw(coordinateIndex);
              if (pixelsDrawnCount) {
                broadcast(socket, coordinateIndex, pixelsDrawnCount);
              }
            }
          } catch {
            console.error('Could not draw pixel');
          }
        });

        socket.on('close', () => {
          console.log('User disconnected');
        });
      });
    },
  };
}
