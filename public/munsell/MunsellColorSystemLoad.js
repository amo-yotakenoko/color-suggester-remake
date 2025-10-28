var munsellColorSystemCanvas = document.getElementById("munsellColorSystemCanvas");

function drowCircle(x, y) {
    munsellCtx.beginPath();
    munsellCtx.arc(munsellColorSystemCanvas.width / 2 + x, munsellColorSystemCanvas.height / 2 + y, 10, 0, 2 * Math.PI);
    munsellCtx.fill();
    munsellCtx.closePath();
}
readcolorcodeToHVC();
var munsellColors = [];
function readcolorcodeToHVC() {
    fetch('./colorcodeToHVC.txt')
        .then(function (response) {
        return response.text(); // テキストコンテンツのPromiseを返す
    })
        .then(function (text) {
        // console.log(text.split('\n'));
        munsellColors = text.split('\n').map(function (line) { return line.split('\t'); });
        munsellColors.map(function (c) {
            // console.log(c);
            // setMunsellColor(c);
            //              var colorcode, H, V, C;
            // [colorcode, H, V, C] = c;
            // console.log(colorcode)
        });
        colorAddLoop(1);
    });
}
function colorAddLoop(i) {
    // console.log(munsellColors[i]);
    // addColorMesh(colorcode, H, V, C);
    for (var j = 0; j < 10; j++) {
        if (!munsellColors[i])
            return;
        i += 1;
        var color = munsellColors[i];
        // console.log(color)
        if (color == null)
            continue;
        addColorMesh(color[0], parseFloat(color[1]), parseFloat(color[2]), parseFloat(color[3]));
    }
    // colorAddLoop(i + 1);
    requestAnimationFrame(function () {
        colorAddLoop(i);
    });
}