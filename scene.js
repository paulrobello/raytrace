Partrace.Scene=Class.extend({
  init:function(partrace){
    this.partrace=partrace;
    this.camera=partrace.camera;
    this.lights=[];    
    this.objects=[];
    this.materials=[];
    this.maxDepth=3;
    this.doReflect=true;
    this.doRefract=true;
  },
  add:function(obj){
    if (obj instanceof Partrace.Light){
      this.lights.push(obj);      
    }else{
      this.objects.push(obj);
    }            
    return this.objects.length-1;
  },
  itersectScene:function(ray){
    var stats=this.partrace.stats;
    stats.rays[ray.type]++;
    stats.rays['total']++;
    
    var objects=this.objects;
    var i = objects.length;
    var ip=null;
    var bestDist=Partrace.bounds;
    while (i--){
      if (ip=objects[i].intersect(ray)){
        ray.intersections.push(ip);
      }
    }
    if (ray.intersections.length>1){
      ray.intersections.sort(function(a,b){
        return a.dist2-b.dist2;
      });
    }
    if (ray.intersections.length>0) {
      var ip=ray.intersections[0];
      ray.ip=ip;
      ip.dist=Math.sqrt(ip.dist2);
      ip.object.normal(ray);
      ip.object.uvw(ray);
    }
    return ray.intersections.length;
  },
  raytrace:function(color,ray,depth,ir){
    if (depth>this.maxDepth) return;
    if (!this.itersectScene(ray)) {
      this.partrace.stats.rays['miss']++;
      return;
    }
    this.partrace.stats.rays['hit']++;
    var ip=ray.ip;
    var mat = ip.object.material;
    vec4.set(color,0,0,0,1);
    if (!mat) return;
    
    var ma=mat.d[3]; // alpha    
    var mr=mat.reflect; // reflectance
    var mir=mat.refract; // index of refraction

    var lights=this.lights;
    var i = lights.length;

    var lightColor=vec4.create();
    var reflectColor=vec4.create();
    var refractColor=vec4.create();
    while (i--){
      var light=lights[i];      
      light.intensity(lightColor,ip);
      vec4.add(color,color,lightColor);
      if (depth<this.maxDepth){
        if (this.doReflect && mr>0 && !ray.inside){
          var rRay=new Partrace.Ray('reflect',ray.p,ray.d);
          vec4.reflect(rRay.d,rRay.d,ip.n);
          vec4.normalize(rRay.d,rRay.d);
          vec4.combine(rRay.p,ip.ip,rRay.d,1,Partrace.epsilon);
          rRay.intensity=ray.intensity*(1-mr);
          rRay.inside=ray.inside;
          var rColor=vec4.create();
          this.raytrace(rColor,rRay,depth+1,ir);
          rColor[3]=0;
          if (mat.matallic){
            mat4.multiply(rColor,rColor,mat.d);
          }
          vec4.scale(rColor,rColor,mr);
          vec4.add(color,color,rColor);
        }
        if (this.doRefract && ma>0){
          var n=ir/mir;
          var rRay=new Partrace.Ray('refract',ray.p,ray.d);
          var nvec=vec4.clone(ip.n);
          if (ray.inside) vec4.negate(nvec,nvec);
          var cosi=-vec4.dot(nvec,ray.d);
          var cost2=1-n*n*(1-cosi*cosi);
          var rColor=vec4.create();          
          if (cost2>0){
            vec4.combine(rRay.d,rRay.d,nvec,n,n*cosi-Math.sqrt(cost2));
            vec4.normalize(rRay.d,rRay.d);
            vec4.combine(rRay.p,ip.ip,rRay.d,1,Partrace.epsilon);
            rRay.intensity=ray.intensity*(1-ma);
            rRay.inside=ray.inside;

            this.raytrace(rColor,rRay,depth+1,mir);
            if (ma<1){ // if alpha is not solid use beers law to compute dufuse color absorbsion
              var absorb=vec4.clone(mat.d);
              vec4.scale(absorb,0.007*-1);
              absorb[0]=Math.exp(absorb[0]);
              absorb[1]=Math.exp(absorb[1]);
              absorb[2]=Math.exp(absorb[2]);
              absorb[3]=0;
//              vec4.multiply(rColor,rColor,absorb);  //fix me
            }
//            vec4.scale(rColor,rColor,ma);
          }
          vec4.add(color,color,rColor);
        }
      }
    }
    vec4.scale(color,color,1/lights.length);
    this.calcFog(color,ip);    
  },
  calcFog:function(color,ip){
  }
});
