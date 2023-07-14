"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketServer = void 0;
const socket_io_1 = require("socket.io");
function SocketServer(server, canvas) {
    const io = new socket_io_1.Server(server, {
        serveClient: false,
    });
    io.on('connection', (socket) => {
        console.log('We have a connection!');
        socket.on('askToDraw', (data) => {
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
exports.SocketServer = SocketServer;
