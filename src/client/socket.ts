export function Socket({
  hostname,
  onOpen,
  onMessage,
}: {
  hostname: string;
  onOpen?: (s?: WebSocket) => void;
  onMessage?: (message: string) => void;
}) {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const serverUrl = `${scheme}://${hostname}`;
  let timeout = 250;
  let socket: WebSocket | undefined;

  let buffer: number[] = [];
  let flushScheduled = false;

  function flush() {
    flushScheduled = false;
    if (!socket || socket.readyState !== 1 || buffer.length === 0) return;
    if (buffer.length === 1) {
      socket.send(JSON.stringify(buffer[0]));
    } else {
      socket.send(JSON.stringify(buffer));
    }
    buffer = [];
  }

  const connect = () => {
    socket = new WebSocket(serverUrl);

    socket.addEventListener('open', () => {
      console.log('connected');
      timeout = 250;
      if (onOpen) onOpen(socket);
    });

    socket.addEventListener('error', () => {
      console.error('Error with socket connection');
      socket?.close();
    });

    socket.addEventListener('close', () => {
      timeout = Math.min(30000, timeout * 2);
      const jitter = timeout * (0.8 + Math.random() * 0.4);
      console.log('We disconnected from the socket, retrying in', Math.round(jitter));
      setTimeout(connect, jitter);
    });

    socket.addEventListener('message', (event: MessageEvent<string>) => {
      if (onMessage) onMessage(event.data);
    });

    return socket;
  };

  connect();

  return {
    send: (coordinateIndex: number) => {
      buffer.push(coordinateIndex);
      if (!flushScheduled) {
        flushScheduled = true;
        requestAnimationFrame(flush);
      }
    },
    sendRaw: (data: string) => {
      if (!socket || socket.readyState !== 1) return;
      socket.send(data);
    },
  };
}
