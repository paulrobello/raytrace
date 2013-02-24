Partrace.Material=BaseObj.extend({
  init: function(){
    this.a=vec4.fromValues(0.0,0.0,0.0,1);
    this.d=vec4.fromValues(1,1,1,1);
    this.s=vec4.clone(this.d);
    this.shiny=0;
    this.reflect=0;
    this.refract=0;
    this.metallic=false;
    this.offset=vec4.create();
    this.rotation=vec4.create();
    this.scale=vec4.fromValues(1,1,1,1);
  },
  getAttrs:function(ray){
    return this;
    return {
      'a':this.a,
      'd':this.d,
      's':this.s,
      'shiny':this.shiny,
      'reflect':this.reflect
    };
  }  
});

Partrace.Materials.Rainbow=Partrace.Material.extend({
  init: function(){
    this._super();
  },
  getAttrs:function(ray){
    var a = this.d[3];
    vec4.copy(this.d,ray.ip.uvw);
    vec4.add(this.d,this.d,this.offset);
    vec4.normalize(this.d,this.d);
    vec4.multiply(this.d,this.d,this.scale);
    this.d[3]=a;
    return this;
  }  
});



Partrace.Objects.MaterialObj=BaseObj.extend({
  init:function(parent,material){
    this._super(parent);
    this.material=material||new Partrace.Material();
  },
});
