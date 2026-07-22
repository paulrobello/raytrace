self.oneRad = Math.PI / 180.0;
self.oneDeg = 180.0 / Math.PI;
self.Math.degToRad = self.Math.degToRad || function (d) {
  return d * self.oneRad;
};
self.Math.radToDeg = self.Math.radToDeg || function (r) {
  return r * self.oneDeg;
};
self.Math.clamp = self.Math.clamp || function (v, l, h) {
  if (v <= l) {
    return l;
  } else if (v >= h) {
    return h;
  }
  return v;
};
self.Math.saturate = self.Math.saturate || function (v) {
  if (v <= 0) {
    return 0;
  } else if (v >= 1) {
    return 1;
  }
  return v;
};
self.Math.sqr = self.Math.sqr || function (v) {
  return v * v;
};

self.Int32Array = self.Int32Array || Array;
self.Float32Array = self.Float32Array || Array;

vec4.norm = vec4.squaredLength;

vec4.combine = function (out, a, b, f1, f2) {
  if (out === undefined) out = vec4.create();
  out[0] = a[0] * f1 + b[0] * f2;
  out[1] = a[1] * f1 + b[1] * f2;
  out[2] = a[2] * f1 + b[2] * f2;
  out[3] = a[3] * f1 + b[3] * f2;
  return out;
};
vec4.project = function (out, p, d, t) {
  if (out === undefined) out = vec4.create();
  out[0] = p[0] + d[0] * t;
  out[1] = p[1] + d[1] * t;
  out[2] = p[2] + d[2] * t;
  out[3] = p[3] + d[3] * t;
  return out;
};

vec4.crossProduct = function (out, a, b) {
  if (out === undefined) out = vec4.create();
  out[0] = a[1] * b[2] - a[2] * b[1];
  out[1] = a[2] * b[0] - a[0] * b[2];
  out[2] = a[0] * b[1] - a[1] * b[0];
  out[3] = 0;
  return out;
};
vec4.cross = vec4.crossProduct;

vec4.reflect = function (out, v, n) {
  if (out === undefined) out = vec4.create();
  var vdotn = -2 * vec4.dot(v, n);
  vec4.project(out, v, n, vdotn);
  return out;
}

vec4.equals = function (a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
};
vec4.almostEquals = function (a, b) {
  return Math.abs(a[0] - b[0]) < 0.0001 && Math.abs(a[1] - b[1]) < 0.0001 && Math.abs(a[2] - b[2]) < 0.0001 && Math.abs(a[3] - b[3]) < 0.0001;
};

vec4.isNull = function (a) {
  return a[0] === 0 && a[1] === 0 && a[2] === 0 && a[3] === 0;
}

vec4.XVector = vec4.fromValues(1, 0, 0, 0);
vec4.YVector = vec4.fromValues(0, 1, 0, 0);
vec4.ZVector = vec4.fromValues(0, 0, 1, 0);
vec4.WVector = vec4.fromValues(0, 0, 0, 1);
vec4.XYZVector = vec4.fromValues(1, 1, 1, 0);
vec4.XYZWVector = vec4.fromValues(1, 1, 1, 1);
vec4.NullVector = vec4.fromValues(0, 0, 0, 0);
vec4.NullPoint = vec4.fromValues(0, 0, 0, 1);


mat4.getX = function (out, mat) {
  if (out === undefined) {
    out = vec4.fromValues(mat[0], mat[1], mat[2], mat[3]);
  } else {
    vec4.set(out, mat[0], mat[1], mat[2], mat[3]);
  }
  return out;
};
mat4.getY = function (out, mat) {
  if (out === undefined) {
    out = vec4.fromValues(mat[4], mat[5], mat[6], mat[7]);
  } else {
    vec4.set(out, mat[4], mat[5], mat[6], mat[7]);
  }
  return out;
};
mat4.getZ = function (out, mat) {
  if (out === undefined) {
    out = vec4.fromValues(mat[8], mat[9], mat[10], mat[11]);
  } else {
    vec4.set(out, mat[8], mat[9], mat[10], mat[11]);
  }
  return out;
};
mat4.getW = function (out, mat) {
  if (out === undefined) {
    out = vec4.fromValues(mat[12], mat[13], mat[14], mat[15]);
  } else {
    vec4.set(out, mat[12], mat[13], mat[14], mat[15]);
  }
  return out;
};

mat4.setX = function (out, v) {
  if (out === undefined) out = mat4.create();
  out[0] = v[0];
  out[1] = v[1];
  out[2] = v[2];
  out[3] = v[3];
  return out;
};
mat4.setY = function (out, v) {
  if (out === undefined) out = mat4.create();
  out[4] = v[0];
  out[5] = v[1];
  out[6] = v[2];
  out[7] = v[3];
  return out;
};
mat4.setZ = function (out, v) {
  if (out === undefined) out = mat4.create();
  out[8] = v[0];
  out[9] = v[1];
  out[10] = v[2];
  out[11] = v[3];
  return out;
};
mat4.setW = function (out, v) {
  if (out === undefined) out = mat4.create();
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = v[3];
  return out;
};

mat4.createRotate = function (out, rad, axis) {
  if (out === undefined) out = mat4.create();
  vec4.normalize(axis, axis);
  var s, c, t;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;

  out[0] = (t * axis[0] * axis[0]) + c;
  out[1] = (t * axis[0] * axis[1]) - (axis[2] * s);
  out[2] = (t * axis[2] * axis[0]) + (axis[1] * s);
  out[3] = 0;

  out[4] = (t * axis[0] * axis[1]) + (axis[2] * s);
  out[5] = (t * axis[1] * axis[1]) + c;
  out[6] = (t * axis[1] * axis[2]) - (axis[0] * s);
  out[7] = 0;

  out[8] = (t * axis[2] * axis[0]) - (axis[1] * s);
  out[9] = (t * axis[1] * axis[2]) + (axis[0] * s);
  out[10] = (t * axis[2] * axis[2]) + c;
  out[11] = 0;

  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;

  return out;
};

mat4.equals = function (a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] &&
    a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] &&
    a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] &&
    a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
};

mat4.anglePreservingMatrixInvert = function (mat) {
  var out = mat4.create();
  var scale = vec4.norm(mat4.getX(undefined, mat));
  if (Math.abs(scale) < GLMAT_EPSILON) {
    mat4.identity(out);
    return out;
  } else {
    scale = 1.0 / scale;
  }

  out[15] = 0;
  mat4.transpose_scale_m33(out, mat, scale);

  out[12] = -(out[0] * out[12] + out[4] * out[13] + out[8] * out[14]);

  out[13] = -(out[1] * out[12] + out[5] * out[13] + out[9] * out[14]);

  out[14] = -(out[2] * out[12] + out[6] * out[13] + out[10] * out[14]);
  return out;
};

mat4.transpose_scale_m33 = function (out, mat, scale) {
  if (out === undefined) out = mat4.create();
  out[0] = scale * mat[0];
  out[4] = scale * mat[1];
  out[8] = scale * mat[2];
  out[1] = scale * mat[4];
  out[5] = scale * mat[5];
  out[9] = scale * mat[6];
  out[2] = scale * mat[8];
  out[6] = scale * mat[9];
  out[10] = scale * mat[10];

  return out;
};

mat4.print = function (mat) {
  console.log(mat);
};
