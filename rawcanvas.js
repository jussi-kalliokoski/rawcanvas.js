var RawCanvas = (function () {

var PixelArray = (function () {

var c;
c = document.createElement('canvas');

if (typeof Uint8Array !== 'undefined') {
    return function (width, height) {
        return new Uint8Array(width * height * 4);
    };
} else if ((c = document.createElement('canvas')).getContext) {
    return function (width, height) {
        c.width     = width;
        c.height    = height;
        return c.getContext('2d').getImageData(0, 0, width, height).data;
    };
} else {
    
}

}());

function extend (obj) {
    var args    = arguments,
        l       = args.length,
        i, n;

    for (i=1; i<l; i++) {
        for (n in args[i]) {
            if (args[i].hasOwnProperty(n)) {
                obj[n] = args[i][n];
            }
        }
    }

    return obj;
}

function RawCanvas (elem) {
    this.elem = elem;

    var i = RawCanvas.backends.length;

    while (i-- && !RawCanvas.backends[i](this));

    if (!this.draw) throw new Error('No backend available.');

    this.setDimensions(elem.width, elem.height);

    this.init && this.init();
}

RawCanvas.prototype = {
    elem: null,
    data: null,

    width: null,
    height: null,

    setDimensions: function (width, height) {
        this.width  = this.elem.width   = width;
        this.height = this.elem.height  = height;
        this.data   = PixelArray(this.width, this.height);
        this.ondimensionchange && this.ondimensionchange(this.width, this.height);
    },
};

RawCanvas.backends = [];

function Raw2D (c) {
    try {
        c.ctx = c.elem.getContext('2d');
    } catch (e) {}

    if (!c.ctx) return;

    extend(c, Raw2D.prototype);

    return true;
}

Raw2D.prototype = {
    type: '2d',

/*
    ctx: null,
*/

    imgdata: null,

    draw: function () {
        var i;
        for (i=0; i<this.data.length; i++) {
            this.imgdata.data[i] = this.data[i];
        }
        this.ctx.putImageData(this.imgdata, 0, 0);
    },

    clear: function () {
        this.ctx.clearRect(0, 0, this.width, this.height);
    },

    ondimensionchange: function () {
        this.ctx        = this.elem.getContext('2d');
        this.imgdata    = this.ctx.getImageData(0, 0, this.width, this.height);
    },
};

RawCanvas.backends.push(Raw2D);

var vertexSource = "attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}";
var fragmentSource = "#ifdef GL_ES\nprecision highp float;\n#endif\nuniform sampler2D img;uniform vec2 r;" +
"void main(void){vec2 p=-1.0+2.0*gl_FragCoord.xy/r.xy;gl_FragColor=texture2D(img,vec2((p.x+1.0)/2.0,(1.0-p.y)/2.0));}";

function get3DContext (canvas) {
    var names   = ["webgl", "experimental-webgl"],
        ctx     = null,
        i;

    for (i=0; i<names.length; i++) {
        try {
            ctx = canvas.getContext(names[i]);
        } catch(e) {}

        if (ctx) break;
    }
    return ctx;
}

function loadShader (gl, shaderSource, shaderType) {
    var shader  = gl.createShader(shaderType),
        compiled, lastError;

    gl.shaderSource(shader, shaderSource);

    gl.compileShader(shader);

    compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (!compiled) {
        lastError = gl.getShaderInfoLog(shader);
        console.error('GLSL:', shader, '-', lastError);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram (gl, shaders, attributes, locations) {
    var program = gl.createProgram(),
        i, linked, lastError;

    for (i=0; i<shaders.length; i++) {
        gl.attachShader(program, shaders[i]);
    }

    if (attributes) {
        for (i=0; i<attributes.length; i++) {
            gl.bindAttribLocation(program, locations ? locations[i] : i, attributes[i]);
        }
    }

    gl.linkProgram(program);

    linked = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (!linked) {
        lastError = gl.getProgramInfoLog (program);
        console.error("Linking:", lastError);

        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function RawWebGL (c) {
    c.gl = get3DContext(c.elem);

    if (!c.gl) return;

    extend(c, RawWebGL.prototype);

    return true;
}

RawWebGL.prototype = {
    type: 'WebGL',

/*
    gl: null,
*/
    vs: null,
    fs: null,
    pl: null,
    rl: null,
    il: null,
    ft: null,
    sp: null,
    

    init: function () {
        var self = this;

        self.vs = loadShader(self.gl, vertexSource, self.gl.VERTEX_SHADER);
        self.fs = loadShader(self.gl, fragmentSource, self.gl.FRAGMENT_SHADER);
        self.sp = createProgram(self.gl, [self.vs, self.fs]);
        self.gl.useProgram(self.sp);

        self.pl = self.gl.getAttribLocation(self.sp, "p");
        self.rl = self.gl.getUniformLocation(self.sp, "r");
        self.il = self.gl.getUniformLocation(self.sp, "img");
        self.ft = self.gl.createTexture();

        self.gl.bindTexture(self.gl.TEXTURE_2D, self.ft);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.width, self.height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, self.data);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.LINEAR);
        self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.LINEAR);
        self.gl.bindTexture(self.gl.TEXTURE_2D, null);

        self.vb = self.gl.createBuffer();
        self.gl.bindBuffer(self.gl.ARRAY_BUFFER, self.vb);
        self.gl.bufferData(self.gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            1.0,  1.0]),
        self.gl.STATIC_DRAW);
        self.gl.enableVertexAttribArray(self.pl);
        self.gl.vertexAttribPointer(self.pl, 2, self.gl.FLOAT, false, 0, 0);
    },

    draw: function () {
        var self = this;

        self.gl.clear(self.gl.COLOR_BUFFER_BIT);

        self.gl.uniform2f(self.rl, self.elem.width, self.elem.height);

        self.gl.activeTexture(self.gl.TEXTURE0);
        self.gl.bindTexture(self.gl.TEXTURE_2D, self.ft);
        self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGBA, self.width, self.height, 0, self.gl.RGBA, self.gl.UNSIGNED_BYTE, self.data);
        self.gl.uniform1i(self.il, 0);

        self.gl.drawArrays(self.gl.TRIANGLES, 0, 6);
    },
};

RawCanvas.backends.push(RawWebGL);

return RawCanvas;

}());
