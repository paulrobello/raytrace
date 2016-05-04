Partrace=Class.extend({
  init:function(canvas){
    this.element = document.getElementById(canvas);
    this.width =  this.element.width;
    this.height = this.element.height;
    this.ctx = this.element.getContext("2d");
    this.colorBuffer = this.ctx.createImageData(this.width,this.height);
    this.zColorBuffer =     this.ctx.createImageData(this.width,this.height);
    this.zBuffer = Float32Array ? new Float32Array(this.width*this.height) : new Array(this.width*this.height);
    this.maxWorkers=1;
    this.workersDone=0;
    this.workers=[];
    this.stats={rays:{}};
    this.start_render=0;
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
    for (var i=0,l=this.width*this.height*4;i<l;i++){
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
    this.copyBufferToScreen(this.zColorBuffer);
    return this;
  },
  normalizeZBuffer:function(){
    var buffer=this.zBuffer;
    var hv=-10000,lv=10000;
    for (var i=0,l=buffer.length;i<l;i++){
      if (buffer[i]===-10000) continue;
      if (buffer[i]>hv) hv=buffer[i];
      if (buffer[i]<lv) lv=buffer[i];
    }
    var r=hv-lv;
    console.log('zBuffer range l,h,r',lv,hv,r);
    if (r===0) r=1;
    for (var i=0,l=buffer.length;i<l;i++){
      if (buffer[i]===-10000){
        //buffer[i]=0;
      }else{
        buffer[i]=1.0-Math.saturate((buffer[i]+(-lv))/r);
      }
    }
    return this;
  },
  zBufferToColor:function(){
    var o;
    var zColor=this.zColorBuffer;
    var zBuffer=this.zBuffer;
    for (var x=0,l=zBuffer.length;x<l;x++){
      o=x*4;
      if (zBuffer[x]===-10000){
        zColor.data[o  ]=0;
        zColor.data[o+1]=0;
        zColor.data[o+2]=0;
        zColor.data[o+3]=0;
      }else{
        zColor.data[o  ]=zBuffer[x]*255;
        zColor.data[o+1]=zBuffer[x]*255;
        zColor.data[o+2]=zBuffer[x]*255;
        zColor.data[o+3]=255;
      }
    }
    return this;
  },
  render:function(setup){
    this.start_render = performance.now();
    this.workers=[];
    this.workersDone=0;
    this.element.width=setup.width||this.element.width;
    this.element.height=setup.height||this.element.height;

    this.width =  this.element.width;
    this.height = this.element.height;
    this.ctx = this.element.getContext("2d");
    this.colorBuffer =  this.ctx.createImageData(this.width,this.height);
    this.zColorBuffer = this.ctx.createImageData(this.width,this.height);
    this.zBuffer = Float32Array ? new Float32Array(this.width*this.height) : new Array(this.width*this.height);

    var width=this.width;
    var height=this.height;

    setup.width=width;
    setup.height=height;
    this.maxWorkers=setup.maxWorkers ? setup.maxWorkers : navigator.hardwareConcurrency||1;

    this.clearBuffer(this.colorBuffer);
    this.copyColorToScreen();

    var set=$.extend({},setup);

    var wy=height/this.maxWorkers;
    for (var w=0; w<this.maxWorkers; w++){
      var worker = new Worker('partrace-worker.js');
      worker.postMessage = worker.webkitPostMessage || worker.postMessage;
      worker.progress=0;
      worker.stats={};
      worker.done=false;
      worker.addEventListener('message', $.proxy(this, 'onMessage'),false);
      worker.addEventListener('error', $.proxy(this, 'onError'), false);
      var sy=wy*w;
      set.startY=sy;
      set.endY=sy+wy;
      set.id=w;
      worker.postMessage({
        action:'init',
        setup:set
      });
      this.workers.push(worker);
    }
  },
  onMessage:function(evt){
    var data=evt.data;
    var cData,zData;
    switch (data.status){
      case 'setPixel':
        data=data.parms;
        this.setPixel(this.colorBuffer,data.x,data.y,data.r,data.g,data.b,data.a);
      break;
      case 'setRow':
        var index = data.y * this.width * 4;
        var zindex = data.y * this.width;
        zData=data.zData;
        cData=data.cData;
        for (var x=0,l=this.width*4;x<l;x+=4){
          this.colorBuffer.data[index+x  ]=cData[x  ];
          this.colorBuffer.data[index+x+1]=cData[x+1];
          this.colorBuffer.data[index+x+2]=cData[x+2];
          this.colorBuffer.data[index+x+3]=cData[x+3];
          this.zBuffer[zindex+x/4]=zData[x/4];
        }
      break;
      case 'stats':
        this.workers[data.id].stats=data.stats;
        data.msg=data.stats;
      case 'log':
        Partrace.log(data.msg);
      break;
      case 'progress':
        var w=this.workers[data.id].progress=data.progress;
        this.doProgress();
      break;
      case 'end':
        this.workers[data.id].done=true;
        this.workersDone++;
        this.copyColorToScreen();

        if (this.workersDone===this.workers.length) {
          this.normalizeZBuffer();
          this.zBufferToColor();
          this.start_render = performance.now()-this.start_render;
          for (var i=0;i<this.workers.length;i++) this.mergeStats(i);
          this.computeStats();
          Partrace.log(this.stats);
          Partrace.log('Total render time '+this.start_render.toFixed(2)+' ms');
        }
      break;
      default:console.log(evt);
    };
  },
  onError: function(e) {
    Partrace.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
  },
  doProgress:function(){
    var p=0;
    for (var i=0,l=this.workers.length;i<l;i++) {
      p+=this.workers[i].progress/this.workers.length;
    }
    $("#progress").progressbar("option", {value:p});
    if (p%20===0) this.copyColorToScreen();
  },
  computeStats:function(){
    var stats=this.stats.rays;
    if (!stats.total) return;
    for (var key in stats){
      if (key==="total" || key.indexOf('_percent')>-1) continue;
      var new_key=key+"_percent";
      var total=0;
      if (key.match(/(_hit|_miss)/)){
        total=stats[key.replace(/(_hit|_miss)/,'')]||0;
      }else{
        total=stats['total'];
      }
      if (total) stats[new_key]=(stats[key]/total*100).toFixed(1);
    }

  },
  mergeStats:function(w){
    w=this.workers[w];

    for (var key in w.stats){
      if (key==="rays" || key==="renderTime" || key==="id") continue;
      if (!this.stats[key]) this.stats[key]=0;
      if (key.indexOf("percent")>0){
        this.stats[key]+=parseFloat(w.stats[key]);
      }else{
        if (!this.stats[key]) this.stats[key]=parseInt(w.stats[key]);
      }
    }
    //this.stats.rays={};
    for (var key in w.stats.rays){
      if (key.indexOf("percent")>0) continue;
      if (!this.stats.rays[key]) this.stats.rays[key]=0;
      this.stats.rays[key]+=parseInt(w.stats.rays[key]);
    }
  },
  testScene:function(){
    var setup={
      camera:{
        position:[0,0,-2.5],
        fov:90
      },
      scene:{
        bg_color:[0,0,0],
        fog:{
          disabled:true,
          type:'linear',
          near:1,
          far:9
        },
        lights:[
          {
            type:'point',
            position:[5,5,-5],
            falloffRadius:25,
          }
        ],
        materials:[
          {
            name:'checker',
            type:'checker',
            scale:[0.1,0.1,0.05],
            //reflect:0.25
            shiny:128,
            metallic:true
          },
          {
            name:'blue',
            type:'basic',
            diffuse:[0,0,0.9],
            shiny:16,
            reflect:0.25
          },
          {
            name:'glass',
            type:'basic',
            diffuse:[1,1,1,0.25],
            refract:1.51714,//glass
            shiny:128
          },
          {
            name:'checkermat',
            type:'checkermat',
            diffuse:[0,1,0],
            diffuse1:'rainbow',
            diffuse2:'green',
            scale:[0.1,0.1,0.05]
          },
          {
            name:'green',
            type:'basic',
            diffuse:[0,1,0]
          },
          {
            name:'rainbow',
            type:'rainbow'
          }
        ],
        objects:[
          {
            name:'left Sphere',
            type:'sphere',
            material:'checker',
            radius:1,
            position:[-1.25,0,0]
          },
          {
            name:'right Sphere',
            type:'sphere',
            material:'blue',
            radius:1,
            position:[1.25,0,0]
          },
          {
            disabled:false,
            name:'glass Sphere',
            type:'sphere',
            material:'glass',
            radius:0.5,
            position:[0.75,-0.5,-1.25]
          },
          {
            name:'floor Plane',
            type:'plane',
            material:'checkermat',
            position:[0,-1,0],
          }
        ]
      }
    };
    this.render(setup);
    return setup;
  }
});
Partrace.fixColor=function(color){
  color[0]=Math.saturate(color[0])*255;
  color[1]=Math.saturate(color[1])*255;
  color[2]=Math.saturate(color[2])*255;
  color[3]=Math.saturate(color[3])*255;
};
Partrace.log=function(msg){
  if (typeof msg === 'object'){
    $("#log").prepend(JSON.stringify(msg,null, 2)+'<br>');
  }else{
    $("#log").prepend(msg+'<br>');
  }
  console.log(msg);
};
Partrace.bounds=10000;
Partrace.epsilon=0.000001;
Partrace.Objects={};
Partrace.Lights={};
Partrace.Materials={};
