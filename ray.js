Partrace.Ray=BaseObj.extend({
  init:function(type){
    this.type = type||'unknown';
    this.p=vec4.fromValues(0,0,0,1); // start position
    this.d=vec4.fromValues(0,0,1,0); // direction
    this.intensity=1; // used to track if ray has been fully absorbed by translucent objects
    this.inside=false; // inside object?
    this.io=1; // index of refraction
    this.depth=0; // trace recursion depth    
    this.intersections=[];
  },
  copy:function(r){
    this.type=r.type;
    vec4.copy(this.p,r.p);
    vec4.copy(this.d,r.d);
    this.intensity=r.intensity;
    this.inside=r.inside;
    this.io=r.io;
    this.depth=r.depth;
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
    this.p=vec4.create();
    if (this.ray){
      vec4.copy(this.p,ray.p);
      vec4.copy(this.d,ray.d);
    }
  }
});
  