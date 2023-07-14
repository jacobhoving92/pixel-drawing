import { Server } from 'socket.io';
import http from 'http';
import { CanvasInstance, Coordinate } from './canvas';

export function SocketServer(server: http.Server, canvas: CanvasInstance) {
  const io = new Server(server, {
    serveClient: false,
  });

  io.on('connection', (socket) => {
    console.log('We have a connection!');

    socket.on('askToDraw', (data: Coordinate) => {
      if (canvas.allowedToDraw(data)) {
        io.emit('draw', [data[0], data[1], canvas.getIndex()]);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  return io;
}
