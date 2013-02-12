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
    var p=[];
    p[0]=data.data[index+0];
    p[1]=data.data[index+1];
    p[2]=data.data[index+2];
    p[3]=data.data[index+3];    
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
    this.clearBuffer(cb);
    this.copyColorToScreen();
    var background_color=vec4.fromValues(0,0,0,255);
    var c_color=vec4.clone(background_color);
    var aa_color=[0,0,0,255];
    var camera=this.camera;
    var stats=this.stats;
    stats.rays['total']=0;
    stats.rays['camera']=0;
    stats.rays['reflect']=0;
    stats.rays['refract']=0;
    stats.rays['shadow']=0;
    camera.setup(width,height);
    var ray=new Partrace.Ray('screen');
    
    while (y--){
      while (x--){
        camera.makeCameraRay(ray,x,y,vec4.NullVector);

        vec4.copy(c_color,background_color);
        this.scene.rayTrace(c_color,ray,0);
        this.setPixel(cb,x,y,c_color[0],c_color[1],c_color[2],c_color[3]);
      }
//      console.log(ray);
      x=width;
      this.copyColorToScreen();      
      this.doProgress(height-y);
    }
//    this.copyColorToScreen();
    console.log(stats);
  },
  doProgress:function(y){
    var p=(y/this.height*100).toFixed(1);
    //console.log(p);
  },
  testScene:function(){
    var sphere=new Partrace.Objects.Sphere();
    this.scene.add(sphere);
    
    this.camera.translate(0,0,5);
//    this.camera.rotate(90,0,0);
//    console.log(this.camera);    
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
Partrace.bounds=10000;

Partrace.Objects={};

Partrace.Scene=Class.extend({
  init:function(partrace){
    this.partrace=partrace;
    this.camera=partrace.camera;
    this.lights=[];    
    this.objects=[];
    this.materials=[];
  },
  add:function(obj){
    this.objects.push(obj);
    return this.objects.length-1;
  },
  itersectScene:function(ray,ip){
    var stats=this.partrace.stats;
    stats.rays[ray.type]++;
    stats.rays['total']++;
  },
  rayTrace:function(color,ray,depth){
    if (depth>3) return;
    var objects=this.objects;
    var o = objects.length;
    var ip=null;
    while (o--){
      if (ip=objects[o].intersect(ray)){
        ray.intersections.push(ip);
      }
    }
  }
});


