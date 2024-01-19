import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import compression from 'compression';

import { SocketServer } from './socket';
import { Canvas } from './canvas';

const PORT = process.env.PORT || 3000;

function isAuthorized(authorization?: string) {
  if (!authorization) return false;
  const [username, password] = Buffer.from(
    authorization.replace('Basic ', ''),
    'base64',
  )
    .toString()
    .split(':');

  return username === 'admin' && password === process.env.ADMIN_PASS;
}

async function main() {
  const app = express();
  const canvas = await Canvas();
  const server = http.createServer(app);
  const socketServer = SocketServer(server, canvas);

  socketServer.init();

  app.use(compression());

  app.get('/admin', (req, res) => {
    const reject = () => {
      res.setHeader('www-authenticate', 'Basic');
      res.sendStatus(401);
    };

    const authorization = req.headers.authorization;
    if (!isAuthorized(authorization)) {
      return reject();
    }

    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  app.post('/api/clear', (req, res) => {
    const reject = () => {
      res.setHeader('www-authenticate', 'Basic');
      res.sendStatus(401);
    };

    const authorization = req.headers.authorization;
    if (!isAuthorized(authorization)) {
      return reject();
    }

    console.log('resetting canvas');
    canvas.reset();
    res.json(
      JSON.stringify({
        success: true,
        message: 'Canvas cleared',
        status: 200,
      }),
    );
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/data', async (_, res) => {
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:1234');
    }
    const data = await canvas.getCurrentData();
    res.json(data);
  });

  app.get('/api/download', async (_, res) => {
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:1234');
    }
    const data = await canvas.getRawData();
    res.json(data);
  });

  server.listen(PORT, () => {
    console.log(`Running server at http://localhost:${PORT}`);
  });
}

main();
