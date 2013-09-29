'use strict';

var Generator = function(canvasElement) {
    this.worker = null;
    this.canvas = canvasElement;

    this.onprogress = function(p) {};
    this.ondone = function() {};
};

Generator.prototype.generate = function(seed) {
    var self = this;

    this.stop();

    var width = this.canvas.width;
    var height = this.canvas.height;

    var ctx = this.canvas.getContext('2d');
    var time = new Date();

    this.worker = new Worker('main_workerline.js');

    this.worker.addEventListener('message', function(ev) {
        if(ev.data.progress !== undefined) {
            self.onprogress(ev.data.progress / height);
        }
        else if(ev.data.result !== undefined) {
            var enlapsed = (new Date() - time)/1000;
            console.log('Done in ' + enlapsed + 's');

            var imageData = ctx.createImageData(width, height);
            imageData.data.set(new Uint8Array(ev.data.result));
            ctx.putImageData(imageData, 0, 0);

            self.ondone();
        }
        else {
            console.error('Received unknown message');
        }
    }, false);

    this.worker.postMessage({
        'seed': seed,
        'width': width,
        'height': height
    });
};

Generator.prototype.stop = function() {
    if(this.worker !== null) {
        this.worker.terminate();
    }
};

window.onload = function() {
    var progressElement = document.getElementById('progress-bar');

    var generator = new Generator(document.getElementById('draw'));
    generator.onprogress = function(p) {
        progressElement.value = p * 100;
    };

    document.getElementById('generate-button').onclick = function() {
        var seed = new Date().getTime();
        console.log('Generating with seed ' + seed);
        generator.generate(seed);
    };

    generator.generate(1950328);
};
