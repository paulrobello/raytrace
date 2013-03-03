var BaseObj = Class.extend({
  init: function(parent){
    this.parent=parent||null;
    this.up=vec4.create();
    this.direction=vec4.create();
    this.position=vec4.create();
    this.scale=vec4.create();
    this.rotation=vec4.create();
    this.localMatrix=mat4.create();
    this.calculating=false;
    this.scene=null;
    this.castShadows=true;
    this.receveShadows=true;

    vec4.copy(this.up,       vec4.YVector);
    vec4.copy(this.direction,vec4.ZVector);
    vec4.copy(this.position, vec4.NullPoint);
    vec4.copy(this.scale,    vec4.XYZWVector);  
    vec4.copy(this.rotation, vec4.NullPoint);  
    mat4.identity(this.localMatrix);
    
    this.material=null;
  },
  pointTo:function(target){
    this.dirty=true;
    var pos=vec4.clone(this.position);
    pos[0]*=-1;
    pos[2]*=-1;
    
    if (this.parent) {
      this.parent.localToAbsolute(pos,pos);
    }
    mat4.lookAt(this.localMatrix,pos,target,vec4.YVector);    
    
    mat4.getY(this.up,this.localMatrix);
    vec4.scale(this.up,this.up,this.scale[1]);
    mat4.getZ(this.direction,this.localMatrix);
    vec4.scale(this.direction,this.direction,this.scale[2]);
    
    if (this.parent) {      
      this.parent.absoluteToLocal(this.direction,this.direction);
      this.parent.absoluteToLocal(this.up,this.up);
    }
  },
  getPosition:function(){
    return this.position;
  },
  getRight:function(){
    if (this.dirty || !this.left){
      this.left=vec4.create();
      vec4.cross(this.left,this.up, this.direction);
    }
    return this.left;
  },
  getLeft:function(){
    if (this.dirty || !this.right){
      this.right=vec4.create();
      vec4.cross(this.right,this.direction,this.up);
    }
    return this.right;
  },
  rebuildMatrix:function(){
    if (this.calculating) return this;
    this.calculating=true;
    var v=vec4.create();
    vec4.scale(v,this.getLeft(),this.scale[0]);
    mat4.setX(this.localMatrix, v);
    vec4.scale(v,this.up, this.scale[1]);
    mat4.setY(this.localMatrix, v);
    vec4.scale(v,this.direction, this.scale[2]);
    mat4.setZ(this.localMatrix, v);
    mat4.setW(this.localMatrix, this.position);
    this.calculating=false;    
    return this;    
  },
  absoluteToLocal:function(out,v){
    if (out==undefined) out=vec4.create();
    vec4.transformMat4(out,v,this.getInvAbsoluteMatrix());
    return out;
  },
  localToAbsolute:function(out,v){
    if (out==undefined) out=vec4.create();
    vec4.transformMat4(out,v,this.getAbsoluteMatrix());
    return out;
  },
  getLocalMatrix:function(){
    if (this.dirty || !this.localMatrix) this.rebuildMatrix();
    return this.localMatrix;
  },
  setMatrix:function(mat){
    this.dirty=true;
    mat4.copy(this.localMatrix,mat);

    mat4.getY(this.up,this.localMatrix);
    mat4.getZ(this.direction,this.localMatrix);
    mat4.getW(this.position,this.localMatrix);

    vec4.set(this.scale,vec4.length(mat4.getX(undefined,this.localMatrix),vec4.length(this.up), vec4.length(this.direction),1));

    vec4.normalize(this.up,this.up);
    vec4.normalize(this.direction,this.direction);
    this.getRight();
    this.getLeft();
    return this;
  },
  getAbsolutePosition:function(){
    if (this.dirty || !this.absPos){
      this.absPos= mat4.getW(undefined,this.getAbsoluteMatrix());
    }
    return this.absPos;
  },  
  setPosition:function(pos){
    this.dirty=true;
    pos[3]=1;
    vec4.copy(this.position,pos);
    this.rebuildMatrix();
    return this;
  },  
  setPositionXYZ:function(x,y,z){
    this.dirty=true;
    vec4.copy(this.position,[x,y,z,1]);
    this.rebuildMatrix();
    return this;
  },  
  setAbsolutePosition:function(pos){
    if (this.parent) {
      this.setPosition(this.parent.absoluteToLocal(pos));
    }else{
      this.setPosition(pos);
    }
    return this;
  },  
  getParent:function(){
    return this.parent;
  },
  setParent:function(parent){
    this.dirty=true;  
    if (this!==parent && this.parent!==parent) this.parent=parent;
    return this;
  },
  getAbsoluteDirection:function(){
    if (this.dirty || !this.absUp){
      this.absUp=mat4.getZ(undefined,this.getAbsoluteMatrix());
      vec4.normalize(this.absUp,this.absUp);
    }
    return this.absUp;
  },
  setDirection:function(dir){
    this.dirty=true;  
    if (!vec4.isNull(dir)) {
      vec4.normalize(dir,dir);
      vec4.copy(this.direction,dir);
      this.rebuildMatrix();
    }
    return this;
  },
  setAbsoluteDirection:function(dir){  
    if (this.parent){
      this.setDirection(this.parent.absoluteToLocal(dir));
    } else {
      this.setDirection(dir);
    }
    return this;
  },  
  getAbsoluteUp:function(){
    if (this.dirty || !this.absUp){
      this.absUp=mat4.getY(undefined,this.getAbsoluteMatrix());
      vec4.normalize(this.absUp,this.absUp);
    }
    return this.absUp;
  },
  setUp:function(up){  
    if (!vec4.isNull(up)) {
      this.dirty=true;    
      vec4.normalize(up,up);
      vec4.copy(this.up,up);
      this.rebuildMatrix();
    }
    return this;
  },  
  setAbsoluteUp:function(up){
    if (this.parent) {
      this.setUp(this.parent.absoluteToLocal(up));
    } else {
      this.setUp(up);
    }
    return this;
  },
  setScaling:function(scl){
    this.dirty=true;  
    scl[3]=1;
    vec4.copy(this.scaling,scl);
    this.rebuildMatrix();
    return this;
  },
  setRotation:function(rot){ // fix
    this.dirty=true;  
    vec4.copy(this.rotation,rot);
    this.rebuildMatrix();
    return this;
  },
  getAbsoluteMatrix:function(){
    if (this.dirty || !this.absoluteMatrix || (this.parent && this.parent.dirty)){
      if (!this.absoluteMatrix) this.absoluteMatrix=mat4.create();
      this.dirty=false;
      if (this.parent) {
        mat4.multiply(this.localMatrix, this.parent.getAbsoluteMatrix(), this.getLocalMatrix());
      } else {
        mat4.copy(this.absoluteMatrix,this.getLocalMatrix());
      }
    }
    return this.absoluteMatrix;
  },
  getInvAbsoluteMatrix:function(){
    if (this.dirty || !this.invAbsoluteMatrix){
      if (!this.invAbsoluteMatrix) this.invAbsoluteMatrix=mat4.create();
      if (mat4.equals(this.scale, vec4.XYZVector)) {
        if (this.parent){
          mat4.multiply(this.invAbsoluteMatrix,this.parent.getInvAbsoluteMatrix(), mat4.anglePreservingMatrixInvert(this.getLocalMatrix()));
        } else {
          mat4.copy(this.invAbsoluteMatrix,mat4.anglePreservingMatrixInvert(this.getLocalMatrix()));
        }
      } else {
        mat4.invert(this.invAbsoluteMatrix,this.getAbsoluteMatrix());
      }
    }
    return this.invAbsoluteMatrix;
  },
  pitch:function(d){
    return this.rotate(d,0,0);
  },
  yaw:function(d){
    return this.rotate(0,d,0);
  },
  roll:function(d){
    return this.rotate(0,0,d);
  },
  rotate:function(rx, ry, rz){
    var resMat=this.localMatrix;
    var v = vec4.create();
    var m = mat4.create();
    if (rx!==0) {
      vec4.copy(v, vec4.XVector);
      mat4.multiply(resMat,resMat,mat4.createRotate(m, -Math.degToRad(rx),v));
    }
    if (ry!==0) {
      vec4.copy(v, vec4.YVector);
      mat4.multiply(resMat,resMat,mat4.createRotate(m, -Math.degToRad(ry),v));
    }
    if (rz!==0) {
      vec4.copy(v, vec4.ZVector);
      mat4.multiply(resMat,resMat,mat4.createRotate(m, -Math.degToRad(rz),v));
    }
    return this;
  },
  rotateAbsolute:function(rx, ry, rz){
    var resMat=this.localMatrix;
    var m = mat4.create();
    if (rx!==0) {
      mat4.multiply(resMat,resMat,mat4.createRotate(m, -Math.degToRad(rx),this.absoluteToLocal(vec4.XVector)));
    }
    if (ry!==0) {
      mat4.multiply(resMat,resMat,mat4.createRotate(m, -Math.degToRad(ry),this.absoluteToLocal(vec4.YVector)));
    }
    if (rz!==0) {
      mat4.multiply(resMat,resMat,mat4.createRotate(m, -Math.degToRad(rz),this.absoluteToLocal(vec4.ZVector)));
    }
    return this;
  },
  rotateAbsoluteAxis:function(axis,angle){
    if (angle!==0) {
      var v = vec4.create();
      vec4.copy(v, this.absoluteToLocal(axis));
      mat4.multiply(this.localMatrix,mat4.createRotate(undefined, v, Math.degToRad(angle)), this.getLocalMatrix());
      this.rebuildMatrix();
    }
    return this;
  },
  translate:function(tx, ty, tz){
    if (ty==undefined){
     vec4.add(this.position,this.position,tx);
    }else{
      vec4.add(this.position,this.position,vec4.fromValues(tx,ty,tz,0));
    }
    this.rebuildMatrix();
    return this;
  },
  intersect:function(ray){
    return false;
  },   
  normal:function(ray){
  },
  uvw:function(ray){
  },
  setName:function(v){
    this.name=v||"";
  },
  setPropsFromJson:function(json){
    if (json.name)      this.setName(json.name);      
    if (json.position)  this.setPosition(Partrace.vToVec4(json.position,1));
    if (json.direction) this.setDirection(Partrace.vToVec4(json.direction));
    if (json.up)        this.setUp(Partrace.vToVec4(json.up));    
    if (json.scale)     this.setScaling(Partrace.vToVec4(json.scale,1));
    if (json.castShadow)    this.setCastShadow(Partrace.vToBool(json.castShadows));
    if (json.recieveShadow) this.setCastShadow(Partrace.vToBool(json.recieveShadows));
  }  
});
