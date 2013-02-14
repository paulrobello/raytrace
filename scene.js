Partrace.Scene=Class.extend({
  init:function(partrace){
    this.partrace=partrace;
    this.camera=partrace.camera;
    this.lights=[];    
    this.objects=[];
    this.materials=[];
    this.maxDepth=2;
    this.doReflect=true;
    this.doRefract=true;
    this.doShadows=true;
    this.background_color=vec4.fromValues(0,0,0,1);    
    this.fogNear=1;
    this.fogFar=10;
    this.fogRange=this.fogFar-this.fogNear;
    this.fogColor=vec4.clone(this.background_color);
    
  },
  add:function(obj){
    obj.scene=this;
    if (obj instanceof Partrace.Light){
      this.lights.push(obj);      
    }else{
      this.objects.push(obj);
    }            
    return this.objects.length-1;
  },
  ipSort:function(a,b){
     return a.dist2-b.dist2;
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
    if (ray.intersections.length>1) ray.intersections.sort(this.ipSort);

    if (ray.intersections.length>0) {
      var ip=ray.intersections[0];
      ray.ip=ip;
      ip.dist=Math.sqrt(ip.dist2);
      ip.object.normal(ray);
      ip.object.uvw(ray);
    }else{
      ray.ip=false;
    }
    return ray.intersections.length;
  },
  raytrace:function(color,ray,depth,ir){
    vec4.copy(color,this.background_color);
    if (depth>this.maxDepth) return false;
    if (!this.itersectScene(ray)) {
      this.partrace.stats.rays['miss']++;
      return false;
    }
    this.partrace.stats.rays['hit']++;
    var ip=ray.ip;
    var mat = ip.object.material;
    vec4.set(color,0,0,0,1);
    //if (!mat) return false;
    
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
          rRay.depth=depth;
          this.raytrace(rColor,rRay,depth+1,ir);
          rColor[3]=0;
          if (mat.matallic){
            mat4.multiply(rColor,rColor,mat.d);
          }
          vec4.scale(rColor,rColor,mr);
          vec4.add(color,color,rColor);
        } // end do reflect
        if (this.doRefract && ma<1){
          var n=ir/mir;
          var rRay=new Partrace.Ray('refract',ray.p,ray.d);
          var nvec=vec4.clone(ip.n);
          if (ray.inside) vec4.negate(nvec,nvec);
          var cosi=-vec4.dot(nvec,ray.d);
          var cosi2=cosi*cosi;
          var sini=Math.sqrt(1-cosi*cosi);
          var sint=n*sini;
          var sint2=sint*sint;
          var rColor=vec4.create();          
          if (sint2<1){
            var cost=Math.sqrt(1-sint2);
            
            vec4.combine(rRay.d,rRay.d,nvec,n,-n*cosi*cost);
            vec4.normalize(rRay.d,rRay.d);
            vec4.combine(rRay.p,ip.ip,rRay.d,1,Partrace.epsilon);
            rRay.intensity=ray.intensity*(1-ma);
            rRay.depth=depth;
            rRay.inside=ray.inside;
            
            if (ma<1 && this.raytrace(rColor,rRay,depth+1,mir)){ // if alpha is not solid use beers law to compute dufuse color absorbsion
              var absorb=vec4.clone(mat.d);
              vec4.scale(absorb,absorb,0.15*-rRay.ip.dist);
              absorb[0]=Math.clamp(Math.exp(absorb[0]),0,1);
              absorb[1]=Math.clamp(Math.exp(absorb[1]),0,1);
              absorb[2]=Math.clamp(Math.exp(absorb[2]),0,1);
              absorb[3]=1;
              vec4.multiply(rColor,rColor,absorb);
            }
          }
          vec4.add(color,color,rColor);
        } // end doRefract
      } // end if depth < maxdepth
    } // end while i
    vec4.scale(color,color,1/lights.length);
    this.calcFog(color,ip);    
    return true;    
  },
  calcFog:function(color,ip){
    if (this.fogNear<0) return;
    var d=ip.dist-this.fogNear;
    if (d<=0) return
    var c=d/this.fogRange;
    if (c>=this.fogRange) {
      vec4.copy(color,this.fogColor);
    } else {
      vec4.combine(color,color,this.fogColor,1-c,c);
    }
    this.partrace.stats.rays['fog']++;
  }
});
