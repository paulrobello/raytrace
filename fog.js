Partrace.Fog = Class.extend({
  init: function (scene, color, type) {
    this.scene = scene;
    this.near = 1;
    this.far = 10;
    this.density = 0.15;
    this.range = this.far - this.near;
    this.color = vec4.clone(color);
    this.type = type || 'linear';
  },
  setType: function (v) {
    this.type = v;
  },
  setNear: function (v) {
    this.near = v;
    this.range = this.far - this.near;
  },
  setFar: function (v) {
    this.far = v;
    this.range = this.far - this.near;
  },
  setColor: function (color) {
    this.color = vec4.clone(color);
  },
  setDensity: function (v) {
    this.density = v;
  },
  calc: function (color, ip) {
    var f = 0;
    switch (this.type) {
    case 'exp':
      f = 1 / Math.exp(ip.dist * this.density);
      break;
    case 'exp2':
      var t = Math.exp(ip.dist * this.density);
      f = 1 / (t * t);
      break;
    case 'linear':
    default:
      if (ip.dist >= this.far) {
        vec4.copy(color, this.color);
        return true;
      } else if (ip.dist <= this.near) {
        return false;
      } else {
        f = (this.far - ip.dist) / this.range;
        vec4.combine(color, color, this.color, f, 1 - f);
        return true;
      }
    }

    if (f < Partrace.epsilon) return false;

    if (f >= 1) {
      vec4.copy(color, this.color);
    } else {
      vec4.combine(color, color, this.color, f, 1 - f);
    }
    return true;
  },
  setPropsFromJson: function (json) {
    if (json.color) this.setColor(Partrace.vToVec4(json.color), 1);
    if (json.near) this.setNear(parseFloat(json.near));
    if (json.far) this.setFar(parseFloat(json.far));
    if (json.density) this.setDensity(parseFloat(json.density));
    if (json.type) this.setType(json.type);
  }
});
