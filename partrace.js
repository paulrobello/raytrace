Partrace=Class.extend({
  init:function(canvas){
    this.element = document.getElementById(canvas);
    this.width = this.element.width;
    this.height = this.element.height;
    this.ctx = this.element.getContext("2d");
    this.colorBuffer = this.ctx.createImageData(this.width,this.height); 
    this.zBuffer =     this.ctx.createImageData(this.width,this.height);
    this.maxWorkers=1;
    this.workersDone=0;
    this.workers=[];
    this.stats={};
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
  render:function(setup){
    var start = new Date().getTime();
    var width=this.width;
    var height=this.height;

    setup.width=width;
    setup.height=height;

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
    
    switch (data.status){
      case 'setPixel':
        data=data.parms;
        this.setPixel(this.colorBuffer,data.x,data.y,data.r,data.g,data.b,data.a);
      break;
      case 'setRow':
        var index = data.y * this.width * 4;
        data=data.data;
        var x = this.width;        
        while (x--){
          var o=x*4;
          this.colorBuffer.data[index+o  ]=data[o  ];
          this.colorBuffer.data[index+o+1]=data[o+1];
          this.colorBuffer.data[index+o+2]=data[o+2];
          this.colorBuffer.data[index+o+3]=data[o+3];
        }
      break;
      case 'stats':
        this.workers[data.id].stats=data.stats;        
        data.msg=data.stats;
        this.mergeStats(data.id);
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
        if (this.workersDone===this.workers.length) Partrace.log(this.stats);
        this.copyColorToScreen();
      break;
      default:console.log(evt);
    };
  },
  doProgress:function(){
    var p=0;
    var i=this.workers.length;
    while (i--) {
      p+=this.workers[i].progress/this.workers.length;
    }
    $("#progress").progressbar("option", {value:p});
    if (p%5==0) this.copyColorToScreen();          
  },
  mergeStats:function(w){
    w=this.workers[w];
    
    for (var key in w.stats){
      if (key==="rays") continue;
      if (!this.stats[key]) this.stats[key]=0;
      if (key==="renderTime" || key.indexOf("percent")>0){
        this.stats[key]+=parseFloat(w.stats[key]);
      }else{
        if (!this.stats[key]) this.stats[key]=parseInt(w.stats[key]);
      }      
    }
    this.stats.rays={};
    for (var key in w.stats.rays){
      if (!this.stats.rays[key]) this.stats.rays[key]=0;
      if (key.indexOf("percent")>0){
        this.stats.rays[key]+=parseFloat(w.stats.rays[key]);
      }else{
        this.stats.rays[key]+=parseInt(w.stats.rays[key]);
      }
    }
  },
  testScene:function(){ 
    var setup={
      scene:{
/*        fog:{
          type:'linear',
          near:1,
          far:9
        },*/
        camera:{
          position:[0,0,-2.5]
        },
        lights:[
          {
            type:'point',
            position:[5,5,-5],
            falloffRadius:15,
          }
        ],
        materials:[
/*          {
            name:'checker',
            type:'checker',
            scale:[0.1,0.1,0.05],
            //reflect:0.25
            shiny:128,
            metallic:true
          },*/
          {
            name:'blue',
            type:'basic',
            diffuse:[0,0,0.9],
            shiny:16,
            reflect:0.25
          }
/*          {
            name:'glass',
            type:'basic',
            diffuse:[1],
            refract:1.51714,//glass
            shiny:128
          },
          {
            name:'green',
            type:'basic',
            diffuse:[0,1,0]            
          },
          {
            name:'rainbow',
            type:'rainbow'            
          },
          {
            name:'checkermat',
            type:'checkermat',
            m1:'rainbow',
            m2:'green',
            scale:[0.1,0.1,0.05],
            duffuse:[0,1,0,]
          } */
        ],
        objects:[        
/*          {
            name:'left Sphere',
            type:'sphere',
            material:'checker',
            radius:1,
            position:[-1.25,0,0],            
          },*/
          {
            name:'right Sphere',
            type:'sphere',
            material:'blue',
            radius:1,
            position:[1.25,0,0]
          },
/*          {
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
          }*/
        ]
      }
    }
    this.render(setup);
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
Partrace.epsilon=0.000001;
Partrace.Objects={};
Partrace.Lights={};
Partrace.Materials={};
