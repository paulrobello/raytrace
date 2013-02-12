var BaseObj = Class.extend({
  init: function(parent){
    this.parent=parent||null;
    this.right=vec4.create();
    this.left=vec4.create();
    this.up=vec4.create();
    this.direction=vec4.create();
    this.position=vec4.create();
    this.scale=vec4.create();
    this.rotation=vec4.create();
    this.localMatrix=mat4.create();

    vec4.copy(this.up,       vec4.YVector);
    vec4.copy(this.direction,vec4.ZVector);
    vec4.copy(this.position, vec4.NullPoint);
    vec4.copy(this.scale,    vec4.XYZVector);  
    vec4.copy(this.rotation, vec4.NullPoint);  
    this.rebuildMatrix();
  },
  pointTo:function(target){
    var absDir=vec4.create();
    vec4.subtract(absDir, target, this.absolutePosition());
    vec4.normalize(absDir,absDir);
    var absRight=vec4.create();
    vec4.cross(absRight,absDir, vec4.YVector);
    vec4.normalize(absRight,absRight);
    var absUp=vec4.create();
    vec4.cross(absUp, absRight, absDir);
    // convert absolute to local and adjust object   
    if (this.parent) {      
      vec4.copy(this.direction,this.parent.absoluteToLocal(absDir));
      vec4.copy(this.up,this.parent.absoluteToLocal(absUp));
    } else {
      vec4.copy(this.direction,absDir);
      vec4.copy(this.up,absUp);
    }
    this.rebuildMatrix();
  },
  absolutePosition:function(out){
    if (out==undefined) out = vec4.create();
    vec4.copy(out,this.position);
    return out;
  },
  getLeft:function(){
    if (!this.left) this.left=vec4.create();
    vec4.cross(this.left,this.up, this.direction);
    return this.left;
  },
  getRight:function(){
    if (!this.right) this.right=vec4.create();
    vec4.cross(this.right,this.direction,this.up);
    return this.right;
  },
  rebuildMatrix:function(){
    var v=vec4.create();
    vec4.scale(v,this.getLeft(),this.scale[0]);
    mat4.setX(this.localMatrix, v);
    vec4.scale(v,this.up, this.scale[1]);
    mat4.setY(this.localMatrix, v);
    vec4.scale(v,this.direction, this.scale[2]);
    mat4.setZ(this.localMatrix, v);
    mat4.setW(this.localMatrix, this.position);
    return this;    
  },
  absoluteToLocal:function(out,v){
    if (out==undefined) out=vec4.create();
    vec4.transformMat4(out,v,this.invAbsoluteMatrix);
    return out;
  },
  localToAbsolute:function(out,v){
    if (out==undefined) out=vec4.create();
    vec4.transformMat4(out,v,this.absoluteMatrix);
    return out;
  },
  getLocalMatrix:function(){
  // this.rebuildMatrix();
    return this.localMatrix;
  },
  setMatrix:function(mat){
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
    return mat4.getW(undefined,this.absoluteMatrix);
  },  
  setPosition:function(pos){
    vec4.copy(this.positio,pos);
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
    if (this.parent!==parent) this.parent=parent;
    return this;
  },
  getAbsoluteDirection:function(){
    var result=mat4.getZ(undefined,this.absoluteMatrix);
    vec4.normalize(result,result);
    return result;
  },
  setDirection:function(dir){
    if (!vec4.isNull(dir)) {
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
    var result=mat4.getY(this.absoluteMatrix);
    vec4.normalize(result,result);
    return result;
  },
  setUp:function(up){
    if (!vec4.isNull(up)) {
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
    vec4.copy(this.scaling,scl);
    this.rebuildMatrix();
    return this;
  },
  setRotation:function(rot){
    vec4.copy(this.rotation,rot);
    this.rebuildMatrix();
    return this;
  },
  getAbsoluteMatrix:function(){
  //  this.rebuildMatrix();
    if (!this.absoluteMatrix) this.absoluteMatrix=mat4.create();
    if (this.parent) {
      mat4.multiply(this.localMatrix, this.parent.getAbsoluteMatrix(), this.localMatrix);
    } else {
      mat4.copy(this.absoluteMatrix,this.localMatrix);
    }
    return this.absoluteMatrix;
  },
  getInvAbsoluteMatrix:function(){
    if (mat4.equals(this.scale, vec4.XYZVector)) {
      if (!this.invAbsoluteMatrix) this.invAbsoluteMatrix=mat4.create();
      if (this.parent){
        mat4.multiply(this.invAbsoluteMatrix,this.parent.getInvAbsoluteMatrix(), mat4.anglePreservingMatrixInvert(this.localMatrix));
      } else {
        mat4.copy(this.invAbsoluteMatrix,mat4.anglePreservingMatrixInvert(this.localMatrix));
      }
    } else {
      mat4.invert(this.invAbsoluteMatrix,this.getAbsoluteMatrix());
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
  rotateAbsolute:function(axis,angle){
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
  normal:function(ip,ray){
  },
  uvw:function(ip,ray){
  }    
});
