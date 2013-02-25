Partrace.Material=BaseObj.extend({
  init: function(r,g,b,a){
    this.a=vec4.fromValues(0.0,0.0,0.0,1);
    this.d=vec4.fromValues(
      r===undefined?1:r,
      g===undefined?1:g,
      b===undefined?1:b,
      a===undefined?1:a
    );
    this.s=vec4.fromValues(1,1,1,1);
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

Partrace.Materials.Checker=Partrace.Material.extend({
  init: function(d1,d2){
    this._super();
    this.d1=d1||vec4.fromValues(1,1,1,1);
    this.d2=d2||vec4.fromValues(0,0,0,1);
  },
  getAttrs:function(ray){
    var scaled=vec4.create();
    var ip=ray.ip;
    scaled[0]=ip.uvw[0]/this.scale[0]+Partrace.epsilon;
    scaled[1]=ip.uvw[1]/this.scale[1]+Partrace.epsilon;
    scaled[2]=ip.uvw[2]/this.scale[2]+Partrace.epsilon;
    vec4.add(scaled,scaled,this.offset);
    var x=Math.floor(scaled[0]) % 2;
    var y=Math.floor(scaled[1]) % 2;
    var z=Math.floor(scaled[2]) % 2;
    
    if (scaled[0]<0) x^=1;
    if (scaled[1]<0) y^=1;
    if (scaled[2]<0) z^=1;
    if (((x+y+z) & 1) === 0){
      vec4.copy(this.d,this.d1);
    }else{
      vec4.copy(this.d,this.d2);
    }
    return this;
  }  
});

Partrace.Materials.CheckerMat=Partrace.Material.extend({
  init: function(d1,d2){
    this._super();
    this.d1=d1;
    this.d2=d2;
  },
  getAttrs:function(ray){
    if (!this.d1 || !this.d2) return this;
    
    var scaled=vec4.create();
    var ip=ray.ip;
    scaled[0]=ip.uvw[0]/this.scale[0]+Partrace.epsilon;
    scaled[1]=ip.uvw[1]/this.scale[1]+Partrace.epsilon;
    scaled[2]=ip.uvw[2]/this.scale[2]+Partrace.epsilon;
    vec4.add(scaled,scaled,this.offset);
    var x=Math.floor(scaled[0]) % 2;
    var y=Math.floor(scaled[1]) % 2;
    var z=Math.floor(scaled[2]) % 2;
    
    if (scaled[0]<0) x^=1;
    if (scaled[1]<0) y^=1;
    if (scaled[2]<0) z^=1;
    if (((x+y+z) & 1) === 0){
      vec4.copy(this.d,this.d1.getAttrs(ray).d);
    }else{
      vec4.copy(this.d,this.d2.getAttrs(ray).d);
    }
    return this;
  }  
});

Partrace.Materials.Combiner=Partrace.Material.extend({
  init: function(d1,d2){
    this._super();
    this.d1=d1;
    this.d2=d2;
  },
  getAttrs:function(ray){
    if (!this.d1 || !this.d2) return this;    
    vec4.copy(this.d,this.d1.getAttrs(ray));
    vec4.add(this.d,this.dthis.d2.getAttrs(ray));
    return this;
  }
});

      

//-------------------------//

Partrace.Objects.MaterialObj=BaseObj.extend({
  init:function(parent,material){
    this._super(parent);
    this.material=material||new Partrace.Material();
  }
});
