Partrace.Scene = Class.extend({
  init: function (partrace) {
    this.partrace = partrace;
    this.camera = partrace.camera;
    this.lights = [];
    this.objects = [];
    this.materials = [];
    this.maxDepth = 3;
    this.doReflect = true;
    this.doRefract = true;
    this.doShadows = true;
    this.bg_color = vec4.fromValues(0, 0, 0, 1);
    this.fog = null;
    this.resetStats();
  },
  resetStats: function () {
    this.stats = {
      rays: {},
      objects: 0,
      lights: 0
    };
    return this;
  },
  incStats: function (key, type) {
    var stats = this.stats;
    if (!stats.rays[key]) stats.rays[key] = 0;
    stats.rays[key]++;
    if (!type) return;
    key = key + '_' + type;
    if (!stats.rays[key]) stats.rays[key] = 0;
    stats.rays[key]++;
    return this;
  },
  computeStats: function (id) {
    this.stats.id = id;
    var stats = this.stats.rays;
    if (!stats.total) return;
    for (var key in stats) {
      if (key === "total") continue;
      var new_key = key + "_percent";
      var total = 0;
      if (key.match(/(_hit|_miss)/)) {
        total = stats[key.replace(/(_hit|_miss)/, '')] || 0;
      } else {
        total = stats['total'];
      }
      if (total) stats[new_key] = (stats[key] / total * 100).toFixed(1);
    }
    stats = this.stats;
    stats.objects = this.objects.length;
    stats.lights = this.lights.length;
    return this;
  },
  add: function (obj) {
    obj.scene = this;
    if (obj instanceof Partrace.Light) {
      this.lights.push(obj);
      return this.lights.length - 1;
    } else if (obj instanceof Partrace.Material) {
      this.materials.push(obj);
      return this.materials.length - 1;
    }
    this.objects.push(obj);
    return this.objects.length - 1;
  },
  ipSort: function (a, b) {
    return a.dist2 - b.dist2;
  },
  itersectScene: function (ray) {
    var stats = this.stats;
    this.incStats('total', '');

    var objects = this.objects;
    var i = objects.length;
    var ip = null;
    while (i--) {
      if (ray.type === 'shadow' && !objects[i].castShadows) continue;
      if (ip = objects[i].intersect(ray)) {
        ray.intersections.push(ip);
      }
    }
    if (ray.intersections.length > 1) ray.intersections.sort(this.ipSort);

    if (ray.intersections.length > 0) {
      var ip = ray.intersections[0];
      ray.ip = ip;
      ip.ray = ray;
      ip.dist = Math.sqrt(ip.dist2);
      ip.object.normal(ray);
      ip.object.uvw(ray);
    } else {
      ray.ip = false;
    }
    if (ray.intersections.length) {
      this.incStats(ray.type, 'hit');
      return true;
    } else {
      this.incStats(ray.type, 'miss');
      return false;
    }
  },
  raytrace: function (color, ray, depth, ir) {
    vec4.copy(color, this.bg_color);
    if (depth > this.maxDepth) return false;
    if (!this.itersectScene(ray)) return false;
    vec4.set(color, 0, 0, 0, 1);

    var ip = ray.ip;
    var mat = ip.object.material.getAttrs(ray);

    var ma = mat.d[3]; // alpha
    var mr = mat.reflect; // reflectance
    var mir = mat.refract; // index of refraction

    var lights = this.lights;
    var i = lights.length;

    var lightColor = vec4.create();
    while (i--) {
      var light = lights[i];
      light.intensity(lightColor, ip);
      vec4.add(color, color, lightColor);
      if (depth < this.maxDepth) {
        if (this.doReflect && mr > 0 && !ray.inside) {
          var rRay = new Partrace.Ray('reflect', vec4.clone(ray.p), vec4.clone(ray.d));
          vec4.reflect(rRay.d, ray.d, ip.n);
          vec4.normalize(rRay.d, rRay.d);
          vec4.project(rRay.p, ip.ip, rRay.d, Partrace.epsilon);
          rRay.intensity = ray.intensity * (1 - mr);
          rRay.inside = ray.inside;
          var rColor = vec4.create();
          rRay.depth = depth;
          this.raytrace(rColor, rRay, depth + 1, ir);
          rColor[3] = 0;
          if (mat.metallic) {
            vec4.multiply(rColor, rColor, mat.d);
          }
          vec4.scale(rColor, rColor, mr);

          vec4.add(color, color, rColor);
        } // end do reflect
        if (this.doRefract && ma < 1) {
          var n = ir / mir;
          var nvec = ip.n;
          if (ray.inside) {
            nvec = vec4.clone(ip.n);
            vec4.negate(nvec, nvec);
          }
          var cosI = -vec4.dot(nvec, ray.d);
          var cosT2 = 1 - (n * n) * (1 - (cosI * cosI));
          if (cosT2 > 0) {
            var rRay = new Partrace.Ray('refract', vec4.clone(ray.p), vec4.clone(ray.d));
            var rColor = vec4.create();
            vec4.combine(rRay.d, ray.d, nvec, n, n * cosI - Math.sqrt(cosT2));
            vec4.normalize(rRay.d, rRay.d);
            vec4.project(rRay.p, ip.ip, rRay.d, 0.01);
            rRay.intensity = ray.intensity * ma;
            rRay.depth = depth;
            rRay.inside = ray.inside;
            if (this.raytrace(rColor, rRay, depth + 1, mir)) { // beers law to compute dufuse color absorbsion
              var absorb = vec4.clone(mat.d);
              vec4.scale(absorb, absorb, 0.5 * -Math.abs(ray.ip.dist - rRay.ip.dist));
              absorb[0] = Math.saturate(Math.exp(absorb[0]));
              absorb[1] = Math.saturate(Math.exp(absorb[1]));
              absorb[2] = Math.saturate(Math.exp(absorb[2]));
              absorb[3] = 1;
              if (ray.inside){
                vec4.multiply(rColor, rColor, absorb);
                vec4.multiply(rColor, rColor, mat.d);
                vec4.scale(rColor, rColor, ma);
              }else{
                vec4.multiply(rColor, rColor, absorb);
                vec4.multiply(rColor, rColor, mat.d);
              }
              vec4.add(color, color, rColor);
            }
          } //cosT2>0
        } // end doRefract
      } // end if depth < maxdepth
    } // end while i
    vec4.scale(color, color, 1 / lights.length);
    if (this.fog) {
      if (this.fog.calc(color, ip)) {
        this.incStats('fog', 'hit');
      } else {
        this.incStats('fog', 'miss');
      }
    }
    return true;
  },
  materialByName: function (name) {
    var i = this.materials.length;
    while (i--) {
      if (this.materials[i].name == name) {
        return this.materials[i];
      }
    }
    return null;
  },
  setPropsFromJson: function (json) {
    if (json.camera) {
      this.camera.setPropsFromJson(json.camera);
    }

    if (json.bg_color) {
      vec4.copy(this.bg_color, Partrace.vToVec4(json.bg_color, 1));
    }
    if (json.fog && (json.fog.disabled === false || json.fog.disabled === undefined)) {
      this.fog = new Partrace.Fog(this, this.bg_color);
      this.fog.setPropsFromJson(json.fog);
    } else {
      this.fog = null;
    }
    var i;
    if (json.lights) {
      i = json.lights.length;
      while (i--) {
        var obj = json.lights[i];
        if (obj.disabled === true) continue;

        var newobj = null;

        switch (obj.type) {
        case 'point':
          newobj = new Partrace.Lights.Point();
          break;
        default:
          Partrace.log('Unknown light type: ' + obj.type);
        }
        if (newobj) {
          newobj.setPropsFromJson(obj);
          this.add(newobj);
        }
      }
    }
    if (json.materials) {
    i = json.materials.length;
    while (i--) {
      var obj = json.materials[i];
      if (obj.disabled === true) continue;
      var newobj = null;

      switch (obj.type) {
      case 'basic':
        newobj = new Partrace.Material();
        break;
      case 'checker':
        newobj = new Partrace.Materials.Checker();
        break;
      case 'checkermat':
        newobj = new Partrace.Materials.CheckerMat();
        break;
      case 'rainbow':
        newobj = new Partrace.Materials.Rainbow();
        break;
      case 'combiner':
        newobj = new Partrace.Materials.Combiner();
        break;
      default:
        Partrace.log('Unknown material type: ' + obj.type);
      }
      if (newobj) {
        newobj.setPropsFromJson(obj);
        this.add(newobj);
      }
    }
    }
    if (json.objects) {
    i = json.objects.length;
    while (i--) {
      var obj = json.objects[i];
      if (obj.disabled === true) continue;
      var newobj = null;

      switch (obj.type) {
      case 'sphere':
        newobj = new Partrace.Objects.Sphere(null, obj.radius);
        break;
      case 'plane':
        newobj = new Partrace.Objects.Plane(null, obj.width, obj.height);
        break;
      default:
        Partrace.log('Unknown object type: ' + obj.type);
      }
      if (newobj) {
        newobj.setPropsFromJson(obj);
        this.add(newobj);
      }
    }
    }
  }
});
