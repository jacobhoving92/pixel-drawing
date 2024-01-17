import { Server } from 'socket.io';
import http from 'http';
import { CanvasInstance } from './canvas';

export function SocketServer(server: http.Server, canvas: CanvasInstance) {
  const io = new Server(server, {
    serveClient: false,
  });

  io.on('connection', (socket) => {
    console.log('We have a connection!');

    socket.on('askToDraw', async (coordinateIndex: number) => {
      console.log('asked to draw!', coordinateIndex);
      const pixelsDrawnCount = await canvas.draw(coordinateIndex);
      // If we get a number, the pixel is saved as drawn, else it the pixel is already set
      if (pixelsDrawnCount) {
        io.emit('draw', [coordinateIndex, pixelsDrawnCount]);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  return io;
}
