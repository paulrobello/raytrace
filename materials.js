Partrace.Material = BaseObj.extend({
  init: function (r, g, b, a) {
    this._super();
    this.name = 'material';
    this.a = vec4.fromValues(0.0, 0.0, 0.0, 1);
    this.d = vec4.fromValues(
      r === undefined ? 1 : r,
      g === undefined ? 1 : g,
      b === undefined ? 1 : b,
      a === undefined ? 1 : a
    );
    this.s = vec4.fromValues(1, 1, 1, 1);
    this.shiny = 0;
    this.reflect = 0;
    this.refract = 0;
    this.metallic = false;
    this.offset = vec4.create();
  },
  getAttrs: function (ray) {
    return this;
  },
  setDiffuse: function (v) {
    vec4.copy(this.d, v);
    return this;
  },
  setSpecular: function (v) {
    vec4.copy(this.s, v);
    return this;
  },
  setOffset: function (v) {
    vec4.copy(this.offset, v);
    return this;
  },
  setShiny: function (v) {
    this.shiny = v;
    return this;
  },
  setReflect: function (v) {
    this.reflect = v;
    return this;
  },
  setRefract: function (v) {
    this.refract = v;
    return this;
  },
  setMetallic: function (v) {
    this.metallic = v;
    return this;
  },
  setPropsFromJson: function (json) {
    this._super(json);
    if (json.diffuse) this.setDiffuse(Partrace.vToVec4(json.diffuse, 1));
    if (json.specular) this.setSpecular(Partrace.vToVec4(json.specular));
    if (json.offset) this.setOffset(Partrace.vToVec4(json.offset));
    if (json.shiny) this.setShiny(parseFloat(json.shiny));
    if (json.reflect) this.setReflect(parseFloat(json.reflect));
    if (json.refract) this.setRefract(parseFloat(json.refract));
    if (json.metallic) this.setMetallic(Partrace.vToBool(json.metallic));

    return this;
  }
});

Partrace.Materials.Rainbow = Partrace.Material.extend({
  init: function () {
    this._super();
  },
  getAttrs: function (ray) {
    var a = this.d[3];
    vec4.copy(this.d, ray.ip.uvw);
    vec4.add(this.d, this.d, this.offset);
    vec4.normalize(this.d, this.d);
    vec4.multiply(this.d, this.d, this.scale);
    this.d[3] = a;
    return this;
  }
});

Partrace.Materials.Checker = Partrace.Material.extend({
  init: function (d1, d2) {
    this._super();
    this.d1 = d1 || vec4.fromValues(1, 1, 1, 1);
    this.d2 = d2 || vec4.fromValues(0, 0, 0, 1);
  },
  getAttrs: function (ray) {
    var scaled = vec4.create();
    var ip = ray.ip;
    scaled[0] = ip.uvw[0] / this.scale[0] + Partrace.epsilon;
    scaled[1] = ip.uvw[1] / this.scale[1] + Partrace.epsilon;
    scaled[2] = ip.uvw[2] / this.scale[2] + Partrace.epsilon;
    vec4.add(scaled, scaled, this.offset);
    var x = Math.floor(scaled[0]) % 2;
    var y = Math.floor(scaled[1]) % 2;
    var z = Math.floor(scaled[2]) % 2;

    if (scaled[0] < 0) x ^= 1;
    if (scaled[1] < 0) y ^= 1;
    if (scaled[2] < 0) z ^= 1;
    if (((x + y + z) & 1) === 0) {
      vec4.copy(this.d, this.d1);
    } else {
      vec4.copy(this.d, this.d2);
    }
    return this;
  },
  setDiffuse1: function (v) {
    vec4.copy(this.d1, v);
    return this;
  },
  setDiffuse2: function (v) {
    vec4.copy(this.d2, v);
    return this;
  },
  setPropsFromJson: function (json) {
    this._super(json);
    if (json.diffuse1) this.setDiffuse1(Partrace.vToVec4(json.diffuse1, 1));
    if (json.diffuse2) this.setDiffuse2(Partrace.vToVec4(json.diffuse2, 1));
    return this;
  }
});

Partrace.Materials.CheckerMat = Partrace.Material.extend({
  init: function (d1, d2) {
    this._super();
    this.d1 = d1;
    this.d2 = d2;
  },
  getAttrs: function (ray) {
    if (!this.d1 || !this.d2) return this;

    var scaled = vec4.create();
    var ip = ray.ip;
    scaled[0] = ip.uvw[0] / this.scale[0] + Partrace.epsilon;
    scaled[1] = ip.uvw[1] / this.scale[1] + Partrace.epsilon;
    scaled[2] = ip.uvw[2] / this.scale[2] + Partrace.epsilon;
    vec4.add(scaled, scaled, this.offset);
    var x = Math.floor(scaled[0]) % 2;
    var y = Math.floor(scaled[1]) % 2;
    var z = Math.floor(scaled[2]) % 2;

    if (scaled[0] < 0) x ^= 1;
    if (scaled[1] < 0) y ^= 1;
    if (scaled[2] < 0) z ^= 1;
    if (((x + y + z) & 1) === 0) {
      vec4.copy(this.d, this.d1.getAttrs(ray).d);
    } else {
      vec4.copy(this.d, this.d2.getAttrs(ray).d);
    }
    return this;
  },
  setDiffuse1: function (v) {
    this.d1 = v;
    return this;
  },
  setDiffuse2: function (v) {
    this.d2 = v;
    return this;
  },
  setPropsFromJson: function (json) {
    this._super(json);
    if (json.diffuse1) this.setDiffuse1(Partrace.scene.materialByName(json.diffuse1));
    if (json.diffuse2) this.setDiffuse2(Partrace.scene.materialByName(json.diffuse2));
    return this;
  }
});

Partrace.Materials.Combiner = Partrace.Material.extend({
  init: function (d1, d2) {
    this._super();
    this.d1 = d1;
    this.d2 = d2;
  },
  getAttrs: function (ray) {
    if (!this.d1 || !this.d2) return this;
    vec4.copy(this.d, this.d1.getAttrs(ray).d);
    vec4.add(this.d, this.d, this.d2.getAttrs(ray).d);
    return this;
  },
  setDiffuse1: function (v) {
    this.d1 = v;
    return this;
  },
  setDiffuse2: function (v) {
    this.d2 = v;
    return this;
  },
  setPropsFromJson: function (json) {
    this._super(json);
    if (json.diffuse1) this.setDiffuse1(Partrace.scene.materialByName(json.diffuse1));
    if (json.diffuse2) this.setDiffuse2(Partrace.scene.materialByName(json.diffuse2));
    return this;
  }
});



//-------------------------//

Partrace.Objects.MaterialObj = BaseObj.extend({
  init: function (parent, material) {
    this._super(parent);
    this.material = material || new Partrace.Material();
  },
  setMaterial: function (v) {
    this.material = v;
  },
  setPropsFromJson: function (json) {
    this._super(json);
    if (json.material) this.setMaterial(Partrace.scene.materialByName(json.material));
  }
});
