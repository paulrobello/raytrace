Partrace.Camera=BaseObj.extend({
  init: function(partrace,parent){
    this._super(parent);
    this.partrace=partrace;
    this.setPosition(vec4.fromValues(0,0,-1,1));
    
    this.look=vec4.fromValues(0,0,0,1);
    this.fov=90;
    
    this.width=partrace.width;
    this.height=partrace.height;
    this.aspectRatio=this.width/this.height;

    this.focusBlurLevels=3;
    this.focusDist=-0.5;
    this.farFocusDist=0.75;    
    this.wd=vec4.create(); // working var
    this.wu=vec4.create(); // working var
    this.wr=vec4.create(); // working var
    this.wv=vec4.create(); // working var
  },
  setLook:function(look){
    look[3]=1;
    vec4.copy(this.look,look);
    return this;
  },
  setLookXYZ:function(x,y,z){
    this.look[0]=x;
    this.look[1]=y;
    this.look[2]=z;
    return this;
  },
  setFov:function(v){
    this.fov=v;
    return this;
  },
  setFocusBlurLevels:function(v){
    this.focusBlurLevels=v;
    return this;
  },
  setFocusDist:function(v){
    this.focusDist=v;
    return this;
  },
  setFarFocusDist:function(v){
    this.farFocusDist=v;
    return this;
  },
  makeCameraRay:function(out,x,y,o){
    out.copy(this.defaultCameraRay);
    var imPlaneUPos=this.vLeft  +(this.vRight-this.vLeft)  *((x+o[0])/this.width);
    var imPlaneVPos=this.vBottom+(this.vTop  -this.vBottom)*((y+o[1])/this.height);
    var d=this.wd;
    var u=this.wu;
    var r=this.wr;
    var v=this.wv;
    //vec4.negate(d,this.direction);// moved to setup
    vec4.scale(u,this.up,imPlaneVPos);
    vec4.subtract(v,u,d);
    vec4.scale(r,this.getRight(),imPlaneUPos);
    vec4.add(out.d,r,v);
    vec4.normalize(out.d,out.d);
    return out;
  },
  setup:function(width,height){
    this.width=width;
    this.height=height;

    this.pointTo(this.look);

    this.aspectRatio=width/height;

    this.vTop=   -Math.tan(Math.degToRad(this.fov/2));
    this.vRight= -this.aspectRatio*this.vTop;
    this.vBottom=-this.vTop;
    this.vLeft=  -this.vRight;

    this.defaultCameraRay=new Partrace.Ray('camera');
    vec4.copy(this.defaultCameraRay.p,this.position);
    vec4.copy(this.defaultCameraRay.d,this.direction);
    
    vec4.negate(this.wd,this.direction);
    return this;
  },
  setPropsFromJson:function(json){
    this._super(json);
    if (json.fov) this.setFov(parseFloat(json.fov));
    if (json.focusBlurLevels) this.setFocusBlurLevels(parseFloat(json.focusBlurLevels));
    if (json.focusDist) this.setFocusDist(parseFloat(json.focusDist));
    if (json.farFocusDist) this.setFarFocusDist(parseFloat(json.farFocusDist));
    if (json.look) this.setLook(Partrace.vToVec4(json.look,1));    
  }  
});
