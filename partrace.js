self.console = self.console || {
  info: function () {},
  log: function () {},
  debug: function () {},
  warn: function () {},
  error: function () {}
};

Partrace=Class.extend({
  init:function(canvas){
    this.element = document.getElementById(canvas);
    this.width = this.element.width;
    this.height = this.element.height;
    this.ctx = this.element.getContext("2d");
    this.colorBuffer = this.ctx.createImageData(this.width,this.height); 
    this.zBuffer =     this.ctx.createImageData(this.width,this.height);
    this.camera = new Partrace.Camera(this);
    this.scene = new Partrace.Scene(this);
    this.stats = {
      rays:{},
      objects:0,
      lights:0
    };
  },
  createBuffer:function(width,height){
    var buffer = document.createElement('canvas');
    buffer.width=width;
    buffer.height=height;
    return buffer.getContext("2d");
  },
  setPixel:function(data,x,y,r,g,b,a){
    var index = (x + y * this.width) * 4;
    data.data[index+0] = r;
    data.data[index+1] = g;
    data.data[index+2] = b;
    data.data[index+3] = a;
    return this;
  },
  getPixel:function(data,x,y){
    var index = (x + y * this.width) * 4;
    var p=vec4.fromValues(
      data.data[index+0],
      data.data[index+1],
      data.data[index+2],
      data.data[index+3]
    );
    return p;
  },
  clearBuffer:function(buffer,r,g,b,a){
    var i=this.width*this.height*4;
    while (i--){
      buffer.data[i]=((i+1)%4===0) ? 255 : 0;
    }  
    return this;
  },
  copyBufferToScreen:function(buffer){
    this.ctx.putImageData( buffer, 0, 0 );  
    return this;
  },
  copyColorToScreen:function(){
    this.copyBufferToScreen(this.colorBuffer);
    return this;
  },
  copyZToScreen:function(){
    this.copyBufferToScreen(this.zBuffer);
    return this;
  },
  render:function(){
    var width=this.width;
    var height=this.height;
    var x=width;
    var y=height;
    var cb=this.colorBuffer;
    var background_color=vec4.fromValues(0,0,0,1);
    var c_color=vec4.clone(background_color);
    var aa_color=vec4.clone(background_color);
    var camera=this.camera;
    var stats=this.stats;
    stats.rays['total']=0;
    stats.rays['camera']=0;
    stats.rays['reflect']=0;
    stats.rays['refract']=0;
    stats.rays['shadow']=0;
    stats.rays['hit']=0;
    stats.rays['miss']=0;
    
    this.clearBuffer(cb);
    this.copyColorToScreen();
    
    camera.setup(width,height);
    
    var that=this;
    var loopFunc=function(){
      if (y--){
        while (x--){
          var ray=new Partrace.Ray('screen');
          camera.makeCameraRay(ray,x,y,vec4.NullVector);
          vec4.copy(c_color,background_color);
          that.scene.raytrace(c_color,ray,0);
          Partrace.fixColor(c_color);          
          that.setPixel(cb,x,y,c_color[0],c_color[1],c_color[2],c_color[3]);
        }
        x=width;
        if (y%2==0) that.copyColorToScreen();      
        that.doProgress(height-y);
        setTimeout(loopFunc);
      }else{
        console.log(stats);
      }
    };
    loopFunc();
    
    this.copyColorToScreen();
  },
  doProgress:function(y){
    var p=Math.ceil(y/this.height*100);
    if (y%32==0) console.log(p);
    $("#progress").progressbar("option", {max:100,value:p});
  },
  testScene:function(){ //*********************************//
    var light=new Partrace.Lights.Point();
    light.attenuationType='linear';
    light.setPosition(vec4.fromValues(5,5,-5,1));
    this.scene.add(light);
    var sphere=new Partrace.Objects.Sphere(null,1);    
    vec4.set(sphere.material.d,0.9,0,0,1);
    sphere.material.shiny=16;
    
    this.scene.add(sphere);    
    this.camera.translate(0,0,-5);
    this.render();
  },
  testbuffer:function(){  
    var ctx=this.ctx;
    ctx.fillStyle="#FF0000";
    ctx.strokeStyle="#FF0000";
  //  ctx.fillRect(0,0,150,75);
    ctx.beginPath();    
    ctx.arc(95,50,40,0,2*Math.PI);
    ctx.stroke();    
    this.clearBuffer(this.colorBuffer);
    this.copyColorToScreen();
    for (var i = 0; i<300; i++){
      this.setPixel(this.colorBuffer,i, i, 0,0,255,255 );
    }
    this.copyColorToScreen();
    console.log(this.getPixel(this.colorBuffer,0,0));
  }  
});
Partrace.fixColor=function(color){
  color[0]=Math.clamp(color[0],0,1)*255;
  color[1]=Math.clamp(color[1],0,1)*255;
  color[2]=Math.clamp(color[2],0,1)*255;
  color[3]=Math.clamp(color[3],0,1)*255;
}
Partrace.bounds=10000;
Partrace.epsilon=0.00001;
Partrace.Objects={};
Partrace.Lights={};
Partrace.Materials={};

Partrace.Scene=Class.extend({
  init:function(partrace){
    this.partrace=partrace;
    this.camera=partrace.camera;
    this.lights=[];    
    this.objects=[];
    this.materials=[];
    this.maxDepth=3;
    this.doReflect=false;
    this.doRefract=false;
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
  raytrace:function(color,ray,depth){
    if (depth>this.maxDepth) return;
    if (!this.itersectScene(ray)) {
      this.partrace.stats.rays['miss']++;
      return;
    }
    this.partrace.stats.rays['hit']++;
    var ip=ray.ip;
    var mat = ip.object.material;
    vec4.set(color,0,0,0,1);
    
    var a=mat.d[3]; // alpha    
    var r=mat.reflect; // reflectance
    var ir=mat.refract; // index of refraction
    var lights=this.lights;
    var i = lights.length;
    var lightColor=vec4.create();
    var reflectColor=vec4.create();
    var refractColor=vec4.create();
    while (i--){
      var light=lights[i];      
      light.intensity(lightColor,ip);
      a=ip.d[3];
      vec4.add(color,color,lightColor);
      if (depth<this.maxDepth){
        if (this.doReflect && r>0 && !ray.inside){
        }
        if (this.doRefract && a>0){
        }
      }
    }
    vec4.scale(color,color,1/lights.length);
    this.calcFog(color,ip);
    
  },
  calcFog:function(color,ip){
  }
});


