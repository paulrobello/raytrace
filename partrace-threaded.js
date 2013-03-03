Partrace=Class.extend({
  init:function(worker,id,width,height,startY,endY){
//    this.worker=worker;
    this.id=id||0;
    this.width = width||640;
    this.height = height||480;
    this.startY=startY||0;
    this.endY=endY||this.height;
    this.camera = new Partrace.Camera(this);
    this.scene = new Partrace.Scene(this);
    this.buffer=Float32Array ? new Float32Array(this.width*4) : [];
  },

  setPixel:function(x,y,r,g,b,a){
    var o=x*4;
    this.buffer[o]=r;
    this.buffer[o+1]=g;
    this.buffer[o+2]=b;
    this.buffer[o+3]=a;
    
    if (x==this.width-1){
      postMessage({
        id:this.id,
        status:'setRow',
        x:0,
        y:y,        
        data:this.buffer
      });
    }
    
    return this;
    postMessage({
      id:this.id,
      status:'setPixel',
      parms:{x:x,y:y,r:r,g:g,b:b,a:a}
    });
    return this;
  },
  render:function(){
    postMessage({id:this.id,status: 'start'});  
    var start = new Date().getTime();
    var width=this.width;
    var height=this.height;
    var x=width;
    var y=this.endY;

    var c_color=vec4.create();
    var aa_color=vec4.create();
    var camera=this.camera;

    this.scene.resetStats();
    
    camera.setup(width,height);

    var ray=new Partrace.Ray('screen');    
    loopFunc=(function(that){ return function(){
      if (y-->=that.startY){
        while (x--){
          ray.reset();
          camera.makeCameraRay(ray,x,y,vec4.NullVector);
          that.scene.raytrace(c_color,ray,0,1);
          Partrace.fixColor(c_color);
          that.setPixel(x,y,c_color[0],c_color[1],c_color[2],c_color[3]);
        }
        x=width;
        that.doProgress(height-y);
        setTimeout(loopFunc,1);
      }else{
        var end = new Date().getTime();
        that.scene.computeStats();
        that.scene.stats.renderTime=((end-start)/1000).toFixed(1);
        postMessage({id:that.id,status:'stats',stats:that.scene.stats});
        postMessage({id:that.id,status:'end'});
      }
    }
    })(this);
    loopFunc();
  },
  doProgress:function(y){
    y-=this.startY;
    var p=Math.ceil(y/(this.endY-this.startY)*100);
    postMessage({
      id:this.id,
      status: 'progress',
      progress: p
    });
  },
  testScene:function(){ //*********************************//
    this.camera.setPosition(vec4.fromValues(0,0,-2.5,1));  

    //this.scene.fog=new Partrace.Fog(this.scene,this.scene.bg_color,'linear');    
    if (this.scene.fog){
      this.scene.fog.setNear(1);
      this.scene.fog.setFar(9);
      this.scene.fog.setType('linear');
    }
    var light=new Partrace.Lights.Point();
    light.setPosition(vec4.fromValues(5,5,-5,1));
    light.fallOffRadius=15;
    this.scene.add(light);
    
    // red
    var sphere=new Partrace.Objects.Sphere(null,1,new Partrace.Materials.Checker());
    vec4.set(sphere.material.scale,0.1,0.1,0.05,1);
    sphere.setPosition(vec4.fromValues(-1.25,0,0,1));
    //sphere.material.reflect=0.25;
    vec4.set(sphere.material.d,0.9,0,0,1);
    //vec4.set(sphere.material.a,0.9,0,0,1);
    sphere.material.shiny=128;
    sphere.material.metallic=true;
    this.scene.add(sphere);  
    
    //blue
    var sphere=new Partrace.Objects.Sphere(null,1);
    sphere.setPosition(vec4.fromValues(1.25,0,0,1));
    sphere.material.reflect=0.25;
    vec4.set(sphere.material.d,0.0,0,0.9,1);
    sphere.material.shiny=16;    
    this.scene.add(sphere);  

    // glass
    var sphere=new Partrace.Objects.Sphere(null,0.5);
    sphere.setPosition(vec4.fromValues(0.75,-0.5,-1.25,1));
    sphere.material.refract=1.51714; // glass
    sphere.material.reflect=0; 
    vec4.set(sphere.material.d,1,1,1,0.25);
    sphere.material.shiny=128;    
//    this.scene.add(sphere);  

    // checker
    var m1=new Partrace.Materials.Rainbow();
    var m2=new Partrace.Material(0,1,0);
    var plane=new Partrace.Objects.Plane(null,5,5,new Partrace.Materials.CheckerMat(m1,m2));
    plane.setPosition(vec4.fromValues(0,-1,0,1));
    vec4.set(plane.material.d,0.0,1.0,0.0,1);
    vec4.set(plane.material.scale,0.1,0.1,0.05,1);
    this.scene.add(plane);
          
    this.render();
  }
});
Partrace.log=function(msg){
  postMessage({
    id:this.id,
    status:'log',
    msg:msg
  });
};
Partrace.fixColor=function(color){
  color[0]=Math.saturate(color[0])*255;
  color[1]=Math.saturate(color[1])*255;
  color[2]=Math.saturate(color[2])*255;
  color[3]=Math.saturate(color[3])*255;
};

Partrace.bounds=10000;
Partrace.epsilon=0.000001;
Partrace.Objects={};
Partrace.Lights={};
Partrace.Materials={};
