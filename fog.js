Partrace.Fog=Class.extend({
  init:function(scene,color,type){
    this.scene=scene;
    this.near=1;
    this.far=10;
    this.range=this.far-this.near;
    this.color=vec4.clone(color);
    this.type=type||'linear'; // todo
  },
  setNear:function(v){
    this.near=v;
    this.range=this.far-this.near;
  },
  setFar:function(v){
    this.far=v;
    this.range=this.far-this.near;
  },
  setColor:function(color){
    this.color=vec4.clone(color);
  },
  calc:function(color,ip){
//    if (this.near<0) return false;
    var d=ip.dist-this.near;
    if (d<=0) return false
    var c=d/this.range;
    if (c>=this.range) {
      vec4.copy(color,this.color);
    } else {
      vec4.combine(color,color,this.color,1-c,c);
    }    
    return true;
  }  
});
