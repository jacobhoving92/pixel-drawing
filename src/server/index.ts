import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';

import { SocketServer } from './socket';
import { Canvas, Coordinate } from './canvas';

const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'database.json');

function getInitalData() {
  return new Promise<Coordinate[]>((resolve, reject) => {
    fs.readFile(DATA_PATH, 'utf8', (error, data) => {
      if (error) {
        console.log('Could not read file', error);
        resolve([]);
      }
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (error) {
        console.log('Could not parse JSON', error);
        resolve([]);
      }
    });
  });
}

let isSaving = false;
function saveData(data: string) {
  if (isSaving) return;
  isSaving = true;
  fs.writeFile(DATA_PATH, data, (error) => {
    if (error) {
      console.log('Error writing file', error);
    } else {
      console.log('Successfully wrote file.');
    }
    isSaving = false;
  });
}

async function main() {
  const initialData = await getInitalData();

  const app = express();
  const canvas = Canvas(initialData);
  const server = http.createServer(app);
  const socketServer = SocketServer(server, canvas);

  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/api/data', (_, res) => {
    res.json(canvas.getInitialData());
  });

  server.listen(PORT, () => {
    console.log(`Running server at http://localhost:${PORT}`);
  });

  setInterval(() => {
    saveData(JSON.stringify(canvas.getInitialData()));
  }, 15000);
}

main();
