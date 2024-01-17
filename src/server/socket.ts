import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { CanvasInstance } from './canvas';

export function SocketServer(server: http.Server, canvas: CanvasInstance) {
  const wss = new WebSocketServer({ server });

  return {
    init: () => {
      wss.on('connection', (socket) => {
        console.log('We have a connection!');

        socket.on('error', console.error);
        socket.on('message', async (data) => {
          const coordinateIndex = parseInt(data.toString(), 10);
          const pixelsDrawnCount = await canvas.draw(coordinateIndex);
          // If we get a number, the pixel is saved as drawn, else it the pixel is already set
          if (pixelsDrawnCount) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify([coordinateIndex, pixelsDrawnCount]),
                );
              }
            });
          }
        });

        socket.on('disconnect', () => {
          console.log('User disconnected');
        });
      });
    },
  };
}
