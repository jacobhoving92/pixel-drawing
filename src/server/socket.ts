import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { CanvasInstance } from './canvas';

export function SocketServer(server: http.Server, canvas: CanvasInstance) {
  const wss = new WebSocketServer({ server });

  return {
    init: () => {
      wss.on('connection', (socket) => {
        console.log('We have a connection!');
        let eraseMode = false;

        socket.on('error', console.error);
        socket.on('message', async (data) => {
          const coordinateIndex = data.toString();
          if (coordinateIndex === 'erase-810226') {
            eraseMode = true;
            return;
          }
          if (eraseMode) {
            await canvas.erase(coordinateIndex);
          } else {
            const pixelsDrawnCount = await canvas.draw(coordinateIndex);
            // If we get a number, the pixel is saved as drawn, else it the pixel is already set
            if (pixelsDrawnCount) {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify([
                      coordinateIndex,
                      pixelsDrawnCount,
                      client === socket ? 1 : 0,
                    ]),
                  );
                }
              });
            }
          }
        });

        socket.on('disconnect', () => {
          console.log('User disconnected');
        });
      });
    },
  };
}
