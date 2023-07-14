"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const socket_1 = require("./socket");
const canvas_1 = require("./canvas");
const DATA_PATH = path_1.default.join(__dirname, 'database.json');
function getInitalData() {
    return new Promise((resolve, reject) => {
        fs_1.default.readFile(DATA_PATH, 'utf8', (error, data) => {
            if (error) {
                console.log('Could not read file', error);
                resolve([]);
            }
            try {
                const parsed = JSON.parse(data);
                resolve(parsed);
            }
            catch (error) {
                console.log('Could not parse JSON', error);
                resolve([]);
            }
        });
    });
}
let isSaving = false;
function saveData(data) {
    if (isSaving)
        return;
    isSaving = true;
    fs_1.default.writeFile(DATA_PATH, data, (error) => {
        if (error) {
            console.log('Error writing file', error);
        }
        else {
            console.log('Successfully wrote file.');
        }
        isSaving = false;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const initialData = yield getInitalData();
        const app = (0, express_1.default)();
        const canvas = (0, canvas_1.Canvas)(initialData);
        const server = http_1.default.createServer(app);
        const socketServer = (0, socket_1.SocketServer)(server, canvas);
        app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
        app.get('/api/data', (_, res) => {
            res.json(canvas.getInitialData());
        });
        server.listen(3000, () => {
            console.log(`Running server at http://localhost:3000`);
        });
        setInterval(() => {
            saveData(JSON.stringify(canvas.getInitialData()));
        }, 15000);
    });
}
main();
