import express, { Response, Request, NextFunction } from 'express';
import http from 'http';
import path, { extname } from 'path';
import multer from 'multer';
import compression from 'compression';
import fs from 'fs';

import { SocketServer } from './socket';
import { Canvas } from './canvas';

const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath =
      process.env.UPLOAD_PATH || path.join(__dirname, 'uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10000000, // 100 MB
  },
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(json)$/)) {
      return callback(new Error('Please upload a a JSON file.'));
    }
    callback(null, true);
  },
});

function authenticate(req: Request, res: Response, next: NextFunction) {
  const reject = () => {
    res.setHeader('www-authenticate', 'Basic');
    res.sendStatus(401);
  };

  const authorization = req.headers.authorization;
  if (!isAuthorized(authorization)) {
    return reject();
  }
  next();
}

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

  app.get('/admin', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  app.post('/api/clear', authenticate, (req, res) => {
    console.log('resetting canvas');
    canvas.reset();
    res.json({
      success: true,
      message: 'Canvas cleared',
      status: 200,
    });
  });

  app.post(
    '/api/upload',
    authenticate,
    upload.single('file'),
    async (req, res) => {
      if (req.file) {
        console.log('uploading pixel data');
        const success = await canvas.setFromFile(req.file);
        res.json({
          success,
        });
      } else {
        res.json({
          success: false,
        });
      }
    },
  );

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/data', async (_, res) => {
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    const data = await canvas.getCurrentData();
    res.json(data);
  });

  app.get('/api/download', authenticate, async (_, res) => {
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    const data = await canvas.getRawData();
    res.json(data);
  });

  server.listen(PORT, () => {
    console.log(`Running server at http://localhost:${PORT}`);
  });
}

main();
