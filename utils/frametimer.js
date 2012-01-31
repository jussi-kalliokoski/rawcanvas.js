var FrameTimer = (function () {

function FrameTimer (callback) {
    this.callback = callback;
    this.lastHit = +new Date;

    var self = this;

    this._callback = function(){
        self.nextFrame();
    };

    this.fpsTimer = setInterval(function () {
        self.calculateFPS();
    }, 1000);

    this.start();
}

FrameTimer.prototype = {
    _callback: null,
    fpsTimer: null,
    callback: null,
    id: null,

    stopped: false,
    fps: 0,
    frameCount: 0,
    lastHit: 0,

    start: function () {
        this.id = FrameTimer.request(this._callback);
    },

    nextFrame: function () {
        if (this.stopped) return;
        this.frameCount++;
        this.callback && this.callback();
        this.start();
    },

    clear: function () {
        this.stopped = true;
        this.id === null || FrameTimer.clear(this.id);
        this.id = null;
    },

    calculateFPS: function () {
        var hit = +new Date;

        this.fps = ~~(this.frameCount / (hit - this.lastHit) * 1000);

        this.frameCount = 0;
        this.lastHit    = hit;
    },

    destroy: function () {
        this.clear();
        this.fpsTimer === null || clearInterval(this.fpsTimer);
    },
};

var request = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback, element){
                return window.setTimeout(callback, 1000 / 60);
            };
})();

var clear = (function(){
    return  window.clearAnimationFrame       ||
            window.webkitClearAnimationFrame ||
            window.mozClearAnimationFrame    ||
            window.oClearAnimationFrame      ||
            window.msClearAnimationFrame     ||
            function(id){
                window.clearTimeout(id);
            };
});

FrameTimer.request  = function () { return request.apply(window, arguments) };
FrameTimer.clear    = function () { return clear.apply(window, arguments) };

return FrameTimer;
}());
