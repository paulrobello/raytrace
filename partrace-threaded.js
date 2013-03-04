Partrace=Class.extend({
  init:function(worker){
    this.worker = worker||null;
    this.camera = new Partrace.Camera(this);
    this.scene  = new Partrace.Scene(this);
    
    Partrace.scene = this.scene; // used for global lookups   
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
    this.buffer = Uint8ClampedArray ? new Uint8ClampedArray(this.width*4) : [];  
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
  setPropsFromJson:function(json){ //*********************************
    Partrace.log(json);
    this.id     = json.id||0;
    this.width  = json.width||640;
    this.height = json.height||480;
    this.startY = json.startY||0;
    this.endY   = json.endY||this.height;
    
    if (json.camera) {
      Partrace.log(json.camera);
      this.camera.setPropsFromJson(json.camera);
    }
    if (json.scene) this.scene.setPropsFromJson(json.scene);    
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
Partrace.epsilon=0.0001;
Partrace.Objects={};
Partrace.Lights={};
Partrace.Materials={};
