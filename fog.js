Partrace.Fog=Class.extend({
  init:function(scene,color,type){
    this.scene=scene;
    this.fogNear=1;
    this.fogFar=10;
    this.fogRange=this.fogFar-this.fogNear;
    this.color=vec4.clone(color);
    this.type=type||'linear'; // todo
  },
  calc:function(color,ip){
    if (this.fogNear<0) return false;
    var d=ip.dist-this.fogNear;
    if (d<=0) return false
    var c=d/this.fogRange;
    if (c>=this.fogRange) {
      vec4.copy(color,this.color);
    } else {
      vec4.combine(color,color,this.color,1-c,c);
    }    
    return true;
  }  
});
