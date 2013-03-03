Partrace=Class.extend({
  init:function(worker,setup){
    this.worker=worker||null;
    this.setup=setup||{};
    this.id=setup.id||0;
    this.width = setup.width||640;
    this.height = setup.height||480;
    this.startY=setup.startY||0;
    this.endY=setup.endY||this.height;
    this.camera = new Partrace.Camera(this);
    this.scene = new Partrace.Scene(this);
    this.buffer=Uint32Array ? new Uint32Array(this.width*4) : [];
    Partrace.scene=this.scene; // used for global lookups
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
  doSetup:function(){ //*********************************//
    var setup=this.setup;
    var scene=setup.scene;
    
    if (scene.camera) this.camera.setPropsFromJson(scene.camera);
    if (scene.fog){
      this.scene.fog=new Partrace.Fog(this.scene,this.scene.bg_color);    
      this.scene.fog.setPropsFromJson(scene.fog);
    }
    var i=scene.lights.length;
    while (i--){
      var light=scene.lights[i];      
      var newlight=null;
      switch (light.type){
        case 'point':newlight=new Partrace.Lights.Point(); break;
        default:Partrace.log('Unknown light type: '+light.type);
      }
      if (newlight){
        newlight.setPropsFromJson(light);
        this.scene.add(newlight);
      }
    }
    i=scene.materials.length;
    while(i--){
      var mat=scene.materials[i];
      var newmat=null;
      switch (mat.type){
        case 'basic': newmat = new Partrace.Material(); break;
        case 'checker': newmat = new Partrace.Materials.Checker(); break;
        case 'chckermat': newmat = new Partrace.Materials.CheckerMat();
        case 'rainbow': newmat = new Partrace.Materials.Rainbow(); break;
        case 'combiner': newmat = new new Partrace.Materials.Combiner(); break;
        default:Partrace.log('Unknown material type: '+mat.type);        
      }
      if (newmat){
        newmat.setPropsFromJson(mat);
        Partrace.log(newmat);        
        this.scene.add(newmat);
      }
    }
    i=scene.objects.length;
    while(i--){
      var obj=scene.objects[i];
      var newobj=null;
      switch (obj.type){
        case 'sphere':newobj=new Partrace.Objects.Sphere(null,obj.radius,mat);break;
        case 'plane':newobj=new Partrace.Objects.Plane(null,obj.width,obj.height,mat);        
        default:Partrace.log('Unknown object type: '+obj.type);
      }
      if (newobj){
        newobj.setPropsFromJson(obj);
        this.scene.add(newobj);
      }
    }
    
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
Partrace.vToBool=function(v){
  if (v=='true' || v===true || parseInt(v)===1) return true;
};
Partrace.vToVec4=function(v,point){
  if (typeof v === 'string') {
    v=v.explode(',');
    var i = v.length;
    while (i--){
      v[i]=parseFloat(v[i]);
    }
  }
  console.log(Object.prototype.toString.call( v ));
  if( Object.prototype.toString.call( v ) === '[object Array]' ){
    if (v.length===1){
      return vec4.fromValues(v[0],v[0],v[0],point ? 1 : 0);
    }else if (v.length===4){
      return vec4.fromValues(v[0],v[1],v[2],v[3]);
    }else{
      return vec4.fromValues(v[0],v[1],v[2],point ? 1 : 0);
    }
  }else{
    v=parseFloat(v);
    return vec4.fromValues(v,v,v,point ? 1 : 0);
  }
}

Partrace.bounds=10000;
Partrace.epsilon=0.000001;
Partrace.Objects={};
Partrace.Lights={};
Partrace.Materials={};
