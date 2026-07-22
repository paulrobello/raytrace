// gl-matrix 3.x exposes only the glMatrix namespace; re-export its modules
// as bare globals for 2.x-style callers. Works in both window and worker scopes.
// The 3.x namespace objects are frozen (Rollup), so copy them into plain
// objects — parmath.js attaches custom extensions (vec4.cross, mat4.getX, ...).
(function (g) {
  var ns = g.glMatrix;
  if (!ns) return;
  var names = ["glMatrix", "mat2", "mat2d", "mat3", "mat4", "quat", "quat2", "vec2", "vec3", "vec4"];
  for (var i = 0; i < names.length; i++) {
    var copy = {}, src = ns[names[i]];
    for (var k in src) copy[k] = src[k];
    g[names[i]] = copy;
  }
})(typeof self !== "undefined" ? self : this);
