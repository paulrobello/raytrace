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
    var start = new Date().getTime();
    var width=this.width;
    var height=this.height;
    var x=width;
    var y=height;
    var cb=this.colorBuffer;

    var c_color=vec4.create();
    var aa_color=vec4.create();
    var camera=this.camera;

    this.scene.resetStats();
    
    this.clearBuffer(cb);
    this.copyColorToScreen();
    
    camera.setup(width,height);

    var ray=new Partrace.Ray('screen');    
    var that=this;
    var loopFunc=function(){
      if (y--){
        while (x--){
          ray.reset();
          camera.makeCameraRay(ray,x,y,vec4.NullVector);
          vec4.set(c_color,0,0,0,1);
          that.scene.raytrace(c_color,ray,0,1);
          Partrace.fixColor(c_color);          
          that.setPixel(cb,x,y,c_color[0],c_color[1],c_color[2],c_color[3]);
        }
        x=width;
        if (y%2==0) that.copyColorToScreen();      
        that.doProgress(height-y);
        setTimeout(loopFunc);
      }else{
        that.copyColorToScreen();
        var end = new Date().getTime();
        that.scene.computeStats();
        that.scene.stats.renderTime=((end-start)/1000).toFixed(1);
        Partrace.log(that.scene.stats);
      }
    };
    loopFunc();
  },
  doProgress:function(y){
    var p=Math.ceil(y/this.height*100);
    $("#progress").progressbar("option", {value:p});
  },
  testScene:function(){ //*********************************//
    this.camera.setPosition(vec4.fromValues(0,0,-3,1));  
    this.scene.fog.setNear(0);
    this.scene.fog.setFar(9);
    var light=new Partrace.Lights.Point();
    light.setPosition(vec4.fromValues(5,5,-5,1));
    light.fallOffRadius=15;
    this.scene.add(light);
    
    var sphere=new Partrace.Objects.Sphere(null,1);    
    sphere.setPosition(vec4.fromValues(-1.25,0,0,1));
    sphere.material.reflect=0.25;
    vec4.set(sphere.material.d,0.9,0,0,1);
    //vec4.set(sphere.material.a,0.9,0,0,1);
    sphere.material.shiny=128;
    sphere.material.metallic=true;
    this.scene.add(sphere);  
    
    var sphere=new Partrace.Objects.Sphere(null,1);
    sphere.setPosition(vec4.fromValues(1.25,0,0,1));
    sphere.material.reflect=0.25;
    vec4.set(sphere.material.d,0.0,0,0.9,1);
    //vec4.set(sphere.material.a,0.9,0,0,1);
    sphere.material.shiny=16;    
    this.scene.add(sphere);  

    var sphere=new Partrace.Objects.Sphere(null,0.75);
    sphere.setPosition(vec4.fromValues(0.75,-0.25,-1.25,1));
//    sphere.material.refract=1.51714; // glass
    sphere.material.refract=1.0; 
    vec4.set(sphere.material.d,0.1,0.1,0.1,0.25);
    sphere.material.shiny=64;    
    this.scene.add(sphere);  
    
    var plane=new Partrace.Objects.Plane(null);
    plane.setPosition(vec4.fromValues(0,-1,0,1));
    vec4.set(plane.material.d,0.0,1.0,0.0,1);
    this.scene.add(plane);
          

    this.render();
  }
});
Partrace.fixColor=function(color){
  color[0]=Math.saturate(color[0])*255;
  color[1]=Math.saturate(color[1])*255;
  color[2]=Math.saturate(color[2])*255;
  color[3]=Math.saturate(color[3])*255;
};
Partrace.log=function(msg){
  if (typeof msg == 'object'){
    $("#log").prepend(FormatJSON(msg,"  ",0, 2));
  }else{
    $("#log").prepend(msg);
  }
  console.log(msg);
};
Partrace.bounds=10000;
Partrace.epsilon=0.00001;
Partrace.Objects={};
Partrace.Lights={};
Partrace.Materials={};
