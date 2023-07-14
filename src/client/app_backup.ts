import './styles.css';

let data = {
  finalX: 0,
  finalY: 0,
  red: 0,
  green: 0,
  blue: 0,
  remaining: 16777216,
  drawnCount: 0,
};

var canvas = document.getElementById('canvas'),
  context = canvas.getContext('2d'),
  pixelSize = 1;

// Add drawing listener //
document.onload = loadCanvas();
// document.onload = addInfo();
canvas.addEventListener('click', draw, false);

document.addEventListener('keypress', (event) => {
  var name = event.key;
  if (name === 's') {
    // get canvas data
    var image = canvas.toDataURL();

    // create temporary link
    var tmpLink = document.createElement('a');
    tmpLink.download = data.drawnCount + '.png'; // set the name of the download file
    tmpLink.href = image;

    // temporarily add link to body and initiate the download
    document.body.appendChild(tmpLink);
    tmpLink.click();
    document.body.removeChild(tmpLink);
  }
});

function draw(e) {
  var pos = getPosition(this);
  var x = e.pageX - pos.x;
  var y = e.pageY - pos.y;
  var p = context.getImageData(x, y, 1, 1).data;

  var pixel = getPixelSelected(e);
  console.log('pixel: ' + pixel);

  data.finalX = pixel['x'];
  data.finalY = pixel['y'];

  context.fillStyle =
    'rgb(' + data.red + ',' + data.green + ',' + data.blue + ')';
  context.fillRect(data.finalX, data.finalY, pixelSize, pixelSize);

  if (p[3] < 1) {
    if (data.blue < 256) {
      data.blue = data.blue + 1;
    }

    if (data.blue == 256) {
      data.blue = 0;
      data.green = data.green + 1;
    }

    if (data.green == 256) {
      data.green = 0;
      data.red = data.red + 1;
    }

    if (data.red == 256) {
      return;
    }

    data.remaining = data.remaining - 1;
    data.drawnCount = data.drawnCount + 1;

    addInfo();
    // store();
    socket.emit('mouse', data);
  }
}

function getPixelSelected(e) {
  var rect = canvas.getBoundingClientRect(),
    pixel = new Array();

  pixel['x'] = Math.floor((e.clientX - rect.left) / pixelSize) * pixelSize;
  pixel['y'] = Math.floor((e.clientY - rect.top) / pixelSize) * pixelSize;

  return pixel;
}

// test color select

// var canvas = document.getElementById("canvas");

function getPosition(obj) {
  var curleft = 0,
    curtop = 0;
  if (obj.offsetParent) {
    do {
      curleft += obj.offsetLeft;
      curtop += obj.offsetTop;
    } while ((obj = obj.offsetParent));
    return { x: curleft, y: curtop };
  }
  return undefined;
}

function addInfo() {
  document.getElementById('pixelsDrawn').textContent = data.drawnCount;
  document.getElementById('pixelsRemaining').textContent = data.remaining;
  document.getElementById('red').textContent = data.red;
  document.getElementById('green').textContent = data.green;
  document.getElementById('blue').textContent = data.blue;
}

// send canvas to back end and save canvas to JSON file

function store() {
  const imgSrc = canvas.toDataURL('img/png');

  const dataImage = { storedCanvas: imgSrc };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataImage),
  };
  // let a = 0;

  // A =>>> console.log('a')

  fetch('/receivingData', options);
  // .then(response => {
  //   return response.json()
  // }).then(data => {
  //   loadCanvas(data)
  // }).catch(error => {asdasd})

  // B =>>> console.log('b') -> DEZE CODE DRAAIT METETEEN na A

  // localStorage.setItem("storedCanvas", imgSrc);
  // localStorage.setItem("storedData", JSON.stringify(data));
}

// localStorage();

function loadCanvas() {
  // const dataURL = localStorage.getItem("storedCanvas");
  // const incomingData = localStorage.getItem("storedData");

  // for (let y = 0; y < 4096; y++) {
  // for (let x = 0; x < 4096; x++) {

  // }
  // }

  // let jsondata = "";
  // let apiUrl = "/imageData"

  // async function getJson(url) {
  //     let response = await fetch(url);
  //     let data = await response.json()
  //     return data;
  // }

  // async function main() {

  //     //OPTION 2
  //     jsondata = await getJson(apiUrl)
  //     console.log(jsondata.storedCanvas);
  // }

  // main();

  let dataset;

  fetch('/imageData')
    .then((response) => response.json()) //converts request from fetch to json
    .then((data) => {
      dataset = JSON.stringify(data.storedCanvas);
      init();
    });

  function init() {
    console.log('dataset: ' + dataset);

    const img = new Image();
    img.src = dataset;
    console.log('img.src: ' + img.src);

    // context.drawImage(img, 0, 0);

    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    var image = new Image();
    image.onload = function () {
      ctx.drawImage(image, 0, 0);
    };
    image.src = dataset;
    console.log('image.src: ' + image.src);
  }

  // fetch('/imageData')
  // .then(response => response.json())
  // .then(data => {
  //   console.log(data.storedCanvas)

  //   let dataURL = data.storedCanvas;
  //   console.log(dataURL)

  //   const img = new Image();
  //   img.src = dataURL;
  //     context.drawImage(img, 0, 0);

  // })
  // .catch(err => console.log(err));

  // if (dataURL && incomingData) {
  //   const img = new Image();
  //   img.src = dataURL;
  //   img.onload = function () {
  //     context.drawImage(img, 0, 0);
  //   };
  //   data = JSON.parse(incomingData);
  // } else {
  //   console.log('No data');
  // }
}

function finish() {
  // get canvas data
  var image = canvas.toDataURL();

  // create temporary link
  var tmpLink = document.createElement('a');
  tmpLink.download = data.drawnCount + '.png'; // set the name of the download file
  tmpLink.href = image;

  // temporarily add link to body and initiate the download
  document.body.appendChild(tmpLink);
  tmpLink.click();
  document.body.removeChild(tmpLink);
  context.clearRect(0, 0, canvas.width, canvas.height);
  data.red = 0;
  data.green = 0;
  data.blue = 0;
  data.redLength = 1;
  data.greenLength = 1;
  data.blueLength = 1;
  data.remaining = 16777216;
  data.drawnCount = 0;
  addInfo();
  store();
}

// live socket connection with other users
var socket;

socket = io.connect('http://localhost:3000');
socket.on('mouse', newDrawing);

// update canvas when other users draw.
function newDrawing(recievedData) {
  context.fillStyle =
    'rgb(' +
    recievedData.red +
    ',' +
    recievedData.green +
    ',' +
    recievedData.blue +
    ')';
  context.fillRect(
    recievedData.finalX,
    recievedData.finalY,
    pixelSize,
    pixelSize,
  );
  data = recievedData;
  addInfo();
}
