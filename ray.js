Partrace.Ray=BaseObj.extend({
  init:function(type,p,d){
    this.type = type||'unknown';
    this.p=p||vec4.fromValues(0,0,0,1); // start position
    this.d=d||vec4.fromValues(0,0,1,0); // direction
    this.intensity=1; // used to track if ray has been fully absorbed by translucent objects
    this.inside=false; // inside object?
    this.ir=1; // index of refraction
    this.depth=0; // trace recursion depth    
    this.intersections=[]; // list of intersections this ray has passed through
  },
  reset:function(){
    vec4.set(this.p,0,0,0,1); // start position
    vec4.set(this.d,0,0,1,0); // direction
    this.intensity=1; // used to track if ray has been fully absorbed by translucent objects
    this.inside=false; // inside object?
    this.ir=1; // index of refraction
    this.depth=0; // trace recursion depth    
    this.intersections.length=0; // list of intersections this ray has passed through
  },
  copy:function(r){
    this.type=r.type;
    vec4.copy(this.p,r.p);
    vec4.copy(this.d,r.d);
    this.intensity=r.intensity;
    this.inside=r.inside;
    this.ir=r.ir;
    this.depth=r.depth;
    this.intersections.length=r.intersections.length;
    var i = r.intersections.length;
    while (i--){
      this.intersections[i]=r.intersections[i];
    }    
  },
  clone:function(){
    var r = new Partrace.Ray();
    r.copy(this);
    return r;
  }  
});
Partrace.Intersection=BaseObj.extend({
  init:function(ray,object){
    this.ray=ray||null;
    this.object=object||null;
    this.dist=Partrace.bounds;
    this.dist2=this.dist*this.dist;
    this.p=vec4.create(); // start position
    this.lp=vec4.create();    
    this.d=vec4.create(); // direction
    this.ld=vec4.create();
    this.ip=vec4.create(); // intersection point
    this.lip=vec4.create();
//    this.n=vec4.create(); // normal // created on demand
//    this.uvw=vec4.create(); // tex coord // created on demand
    if (this.ray){
      vec4.copy(this.p,ray.p);
      vec4.copy(this.d,ray.d);
    }
  },
  copy:function(r){
    this.type=r.type;
    vec4.copy(this.p,r.p);
    vec4.copy(this.lp,r.lp);    
    vec4.copy(this.d,r.d);
    vec4.copy(this.ld,r.ld);
    vec4.copy(this.ip,r.ip);
    vec4.copy(this.lip,r.lip);
    if (r.n) {
      vec4.copy(this.n,r.n);
    }else{
      this.n=null;
    }
    if (r.uvw) {
      vec4.copy(this.uvw,r.uvw);
    }else{
      this.uvw=null;
    }
    this.dist=r.dist;
    this.dist2=r.dist2;
    this.ray=r.ray.clone();
    return this;
  },
  clone:function(){
    var r = new Partrace.Ray();
    r.copy(this);
    return r;
  }
});
  