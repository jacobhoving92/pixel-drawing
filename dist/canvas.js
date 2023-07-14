"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Canvas = void 0;
function Canvas(initialData = []) {
    const canvasWidth = 4096;
    const coordinates = initialData;
    const imageData = new Uint8ClampedArray(canvasWidth * canvasWidth);
    function allowedToDraw([x, y]) {
        const index = canvasWidth * y + x;
        if (imageData[index] === 1)
            return false;
        imageData[index] = 1;
        coordinates.push([x, y]);
        return true;
    }
    function getIndex() {
        return coordinates.length;
    }
    function getInitialData() {
        return coordinates;
    }
    return {
        allowedToDraw,
        getIndex,
        getInitialData,
    };
}
exports.Canvas = Canvas;
