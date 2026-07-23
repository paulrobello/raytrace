// WORKER REALM renderer. A separate main-thread controller also named Partrace
// lives in partrace.js; they are realm-separated by the Worker boundary (audit A2).
import { Class } from './js/class.js';
import { vec4 } from './js/vecmath.js';

export const Partrace = Class.extend({
  init: function (worker) {
    this.worker = worker || null;
    this.camera = new Partrace.Camera(this);
    this.scene = new Partrace.Scene(this);
    this.cBuffer = null;
    this.zBuffer = null;
  },
  setPixel: function (x, y, rgba, z) {
    var o = x * 4;
    var cBuffer = this.cBuffer;
    var zBuffer = this.zBuffer;
    cBuffer[o] = rgba[0];
    cBuffer[o + 1] = rgba[1];
    cBuffer[o + 2] = rgba[2];
    cBuffer[o + 3] = rgba[3];
    if (z === false) {
      zBuffer[x] = -10000;
    } else {
      zBuffer[x] = z.dist;
    }
    if (x === this.width - 1) {
      postMessage({
        id: this.id,
        status: 'setRow',
        x: 0,
        y: y,
        cData: cBuffer,
        zData: zBuffer
      });
    }
    return this;
  },
  render: function () {
    postMessage({
      id: this.id,
      status: 'start'
    });
    var start = (new Date()).getTime();
    this.cBuffer = Uint8ClampedArray ? new Uint8ClampedArray(this.width * 4) : new Array(this.width * 4);
    this.zBuffer = Float32Array ? new Float32Array(this.width) : new Array(this.width);

    var width = this.width;
    var height = this.height;
    var startY = this.startY;
    var endY = this.endY;

    var c_color = vec4.create();
    var aa_color = vec4.create();
    var camera = this.camera;
    var scene = this.scene;
    var antiAlias = this.antiAlias;
    var aaThreshold = this.aaThreshold;
    var aaOffs = [];
    var x, y, aao;
    var aaStep=(1/antiAlias)/2
    for (x=-antiAlias;x<=antiAlias;x++){
      for (y=-antiAlias;y<=antiAlias;y++){
        if (x===0 && y===0) continue;
        aaOffs.push([x*aaStep+((Math.random()-Math.random())*aaStep*0.5),y*aaStep+((Math.random()-Math.random())*aaStep*0.5)]);
      }
    }
    var aaOffsLen = aaOffs.length;
    var aaDiv = 1 / (aaOffsLen+1);

    camera.setup(width, height);
    scene.resetStats();
    var lastColor=vec4.create();

    var ray = new Partrace.Ray('screen');
    for (y = startY; y < endY; y++) {
      for (x = 0; x < width; x++) {
        ray.reset();
        camera.makeCameraRay(ray, x, y, vec4.NullVector);
        scene.raytrace(c_color, ray, 0, 1);
        if ((antiAlias && !aaThreshold) || (antiAlias && aaThreshold && (Math.abs(c_color[0]-lastColor[0])>aaThreshold||Math.abs(c_color[1]-lastColor[1])>aaThreshold||Math.abs(c_color[2]-lastColor[2])>aaThreshold))){
          vec4.copy(lastColor,c_color);
          vec4.copy(aa_color,c_color);
          for (aao = 0; aao < aaOffsLen; aao++) {
            ray.reset();
            ray.aa=1;
            camera.makeCameraRay(ray, x, y, aaOffs[aao]);
            scene.raytrace(c_color, ray, 0, 1);
            vec4.add(aa_color, aa_color, c_color);
          }
          vec4.scale(aa_color, aa_color, aaDiv);
          Partrace.fixColor(aa_color);
          this.setPixel(x, y, aa_color, ray.ip);
        }else{
          Partrace.fixColor(c_color);
          this.setPixel(x, y, c_color, ray.ip);
        }
      } // for x
      if (y%2===0) this.doProgress(y);
    } // for y
    this.doProgress(endY);
    var end = (new Date()).getTime();
    this.scene.computeStats(this.id);
    this.scene.stats.renderTime = (end - start).toFixed(0);
    postMessage({
      id: this.id,
      status: 'stats',
      stats: this.scene.stats
    });
    postMessage({
      id: this.id,
      status: 'end'
    });
  },
  doProgress: function (y) {
    y -= this.startY;
    var p = Math.ceil(y / (this.endY - this.startY) * 100);
    postMessage({
      id: this.id,
      status: 'progress',
      progress: p
    });
  },
  setPropsFromJson: function (json) {
    Partrace.log(json);
    this.id = json.id || 0;
    this.width = json.width || 640;
    this.height = json.height || 480;
    this.startY = json.startY || 0;
    this.endY = json.endY || this.height;
    this.antiAlias = json.antiAlias || 0;
    this.aaThreshold = json.aaThreshold || 0;
    if (json.scene) this.scene.setPropsFromJson(json.scene);
    if (json.doReflect!==undefined) this.scene.doReflect=json.doReflect;
    if (json.doRefract!==undefined) this.scene.doRefract=json.doRefract;
    if (json.doShadows!==undefined) this.scene.doShadows=json.doShadows;

  }
});
Partrace.log = function (msg) {
  postMessage({
    id: this.id,
    status: 'log',
    msg: msg
  });
};
Partrace.fixColor = function (color) {
  color[0] = Math.saturate(color[0]) * 255;
  color[1] = Math.saturate(color[1]) * 255;
  color[2] = Math.saturate(color[2]) * 255;
  color[3] = Math.saturate(color[3]) * 255;
};
Partrace.vToBool = function (v) {
  if (v == 'true' || v === true || parseInt(v) === 1) return true;
};
Partrace.vToVec4 = function (v, point) {
  if (typeof v === 'string') {
    v = v.split(',');
    var i = v.length;
    while (i--) {
      v[i] = parseFloat(v[i]);
    }
  }
  if (Object.prototype.toString.call(v) === '[object Array]') {
    if (v.length === 1) {
      return vec4.fromValues(v[0], v[0], v[0], point ? 1 : 0);
    } else if (v.length === 4) {
      return vec4.fromValues(v[0], v[1], v[2], v[3]);
    } else {
      return vec4.fromValues(v[0], v[1], v[2], point ? 1 : 0);
    }
  } else {
    v = parseFloat(v);
    return vec4.fromValues(v, v, v, point ? 1 : 0);
  }
}

Partrace.bounds = 10000;
Partrace.epsilon = 0.001;
Partrace.Objects = {};
Partrace.Lights = {};
Partrace.Materials = {};
