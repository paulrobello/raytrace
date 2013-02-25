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
    this.doShadows=true;
    this.bg_color=vec4.fromValues(0,0,0,1);    
    this.resetStats();
  },
  resetStats:function(){
    this.stats = {
      rays:{},
      objects:0,
      lights:0
    };
    return this;  
  },
  incStats:function(key,type){
    var stats=this.stats;
    if (!stats.rays[key]) stats.rays[key]=0;
    stats.rays[key]++;
    if (!type) return;
    key=key+'_'+type;
    if (!stats.rays[key]) stats.rays[key]=0;
    stats.rays[key]++;    
    return this;
  },  
  computeStats:function(){
    var stats=this.stats.rays;
    if (!stats.total) return;
    for (var key in stats){
      if (key==="total") continue;
      var new_key=key+"_percent";
      var total=stats[key.replace(/(_hit|_miss)/,'')]||0;
      if (total) stats[new_key]=(stats[key]/total*100).toFixed(1);
    }
    stats=this.stats;
    stats.objects=this.objects.length;
    stats.lights=this.lights.length;
    return this;
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
    var stats=this.stats;
    this.incStats(ray.type,'');
    this.incStats('total','');
    
    var objects=this.objects;
    var i = objects.length;
    var ip=null;
    while (i--){
      if (ray.type==='shadow' && !objects[i].castShadows) continue;
      if (ip=objects[i].intersect(ray)){
        ray.intersections.push(ip);
      }
    }
    if (ray.intersections.length>1) ray.intersections.sort(this.ipSort);

    if (ray.intersections.length>0) {
      var ip=ray.intersections[0];
      ray.ip=ip;
      ip.ray=ray;
      ip.dist=Math.sqrt(ip.dist2);
      ip.object.normal(ray);
      ip.object.uvw(ray);
    }else{
      ray.ip=false;
    }
    if (ray.intersections.length){
      this.incStats(ray.type,'hit');
      return true;
    }else{
      this.incStats(ray.type,'miss');    
      return false;
    }    
  },
  raytrace:function(color,ray,depth,ir){
    vec4.copy(color,this.bg_color);
    if (depth>this.maxDepth) return false;
    if (!this.itersectScene(ray)) return false;
    
    var ip=ray.ip;
    var mat = ip.object.material.getAttrs(ray);
    vec4.set(color,0,0,0,1);
    
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
          vec4.reflect(rRay.d,ray.d,ip.n);
          vec4.normalize(rRay.d,rRay.d);
          vec4.project(rRay.p,ip.ip,rRay.d,Partrace.epsilon);
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
          var cosi=-vec4.dot(nvec,rRay.d);
          var cosi2=cosi*cosi;
          var sini=Math.sqrt(1-cosi2);
          var sint=n*sini;
          var sint2=sint*sint;
          
          if (sint2<1){
            var rColor=vec4.create();          
            var cost=Math.sqrt(1-sint2);
            
            vec4.combine(rRay.d,rRay.d,nvec,n,-n*cosi*cost);
            vec4.normalize(rRay.d,rRay.d);
            vec4.project(rRay.p,ip.ip,rRay.d,Partrace.epsilon*100);
            rRay.intensity=ray.intensity*ma;
            rRay.depth=depth;
            rRay.inside=ray.inside;
            
            if (this.raytrace(rColor,rRay,depth+1,mir)){ // beers law to compute dufuse color absorbsion
              var absorb=vec4.clone(mat.d);
              vec4.scale(absorb,absorb,0.15*-rRay.ip.dist);
              absorb[0]=Math.clamp(Math.exp(absorb[0]),0,1);
              absorb[1]=Math.clamp(Math.exp(absorb[1]),0,1);
              absorb[2]=Math.clamp(Math.exp(absorb[2]),0,1);
              absorb[3]=1;
              vec4.multiply(rColor,rColor,absorb);
            }
            vec4.add(color,color,rColor);
          }
        } // end doRefract
      } // end if depth < maxdepth
    } // end while i
    vec4.scale(color,color,1/lights.length);
    if (this.fog){
      if (this.fog.calc(color,ip)){
        this.incStats('fog','hit');
      }else{
        this.incStats('fog','miss');
      }      
    }
    return true;
  }
});
