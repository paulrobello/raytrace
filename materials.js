Partrace.Material=BaseObj.extend({
  init: function(){
    this.a=vec4.fromValues(0.0,0.0,0.0,1);
    this.d=vec4.fromValues(1,1,1,1);
    this.s=vec4.clone(this.d);
    this.shiny=0;
    this.reflect=0;
    this.refract=0;
    this.offset=vec4.create();
    this.rotation=vec4.create();
    this.scale=vec4.fromValues(1,1,1,1);
  }
});

Partrace.Objects.MaterialObj=BaseObj.extend({
  init:function(parent,radius){
    this._super(parent);
    this.material=new Partrace.Material();
  }
});
