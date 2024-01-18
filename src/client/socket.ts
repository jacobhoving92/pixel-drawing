export function Socket({
  hostname,
  onOpen,
  onMessage,
}: {
  hostname: string;
  onOpen?: () => void;
  onMessage?: (message: string) => void;
}) {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const serverUrl = `${scheme}://${hostname}`;
  let timeout = 250;
  let socket: WebSocket | undefined;

  const connect = () => {
    socket = new WebSocket(serverUrl);

    socket.addEventListener('open', () => {
      console.log('connected');
      timeout = 250;
      if (onOpen) onOpen();
    });

    socket.addEventListener('error', () => {
      console.error('Error with socket connection');
      socket?.close();
    });

    socket.addEventListener('close', () => {
      console.log('We disconnected from the socket, retrying in', timeout);
      setTimeout(connect, Math.min(30000, (timeout += timeout)));
    });

    socket.addEventListener('message', (event: MessageEvent<string>) => {
      if (onMessage) onMessage(event.data);
    });

    return socket;
  };

  connect();

  return {
    send: (data: string) => {
      if (!socket) return;
      socket.send(data);
    },
  };
}
