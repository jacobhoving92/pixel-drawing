var fs = require('fs');

var express = require('express');
var app = express();
var server = app.listen(3000);

app.use(express.static('public'));
app.use(express.json({ limit: '500mb' }));
var socket = require('socket.io');
// socket checking connectiong with other users
var io = socket(server);
io.sockets.on('connection', newConnection);

function newConnection(socket) {
    console.log('new connection: ' + socket.id);

    socket.on('mouse', mouseMsg);

    function mouseMsg(data) {
        socket.broadcast.emit('mouse', data)
        console.log(data);
    }
}

// sending the storedCanvas in JSON file to the front end
app.get('/imageData', function (req, res) {
    let imageData = fs.readFileSync('./database.json');
    let pixelImage = JSON.parse(imageData);
    res.json(pixelImage)
})

// receiving new storedCanvas from front end
app.post('/receivingData', (request, reponse) => {
    console.log('I got a request');
    let newDataImage = request.body;
    console.log(newDataImage);
    // write new storedCanvas to JSON file
    fs.writeFile('database.json', JSON.stringify(newDataImage, null, 2), err => {
        if (err) {
            console.log(err);
        } else {
            console.log('file successfully written')
        }
    });
})


// let data = [];
// for (let i = 0; i < 16777216; i++) {
//     data.push([0, 0, 0],)
// }
// data = JSON.stringify(data);

// fs.writeFile('database.json', data, err => {
//     if (err) {
//         console.log(err);
//     } else {
//         console.log('file successfully written')
//     }
// });