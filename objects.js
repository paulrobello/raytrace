Partrace.Objects.Sphere=BaseObj.extend({
  init:function(parent){
    this._super(parent);
    this.setRadius(0.5);
  },
  setRadius:function(r){
    this.radius = r;
    this.radius2 = this.radius*this.radius;
  },
  intersect:function(ray){
    var ip = new Patrace.Intersection(ray,this);
    this.absoluteToLocal(ip.lp,ip.p);
    this.absoluteToLocal(ip.ld,ip.d);
    var dst=vec4.clone(ip.lp);
    dst[3]=0;
    var b = vec4.dot(dst,ip.ld);
    var c = vec4.dot(dst,dst)-this.radius2;
    var d=(b*b)-c;
    if (d<Partrace.epsilon) return false;
    d=Math.sqrt(d);
    var t1=-b-d;
    var t2=-b+d;
    if (t1<0 && t2<0) return false;
    ip.lip=vec4.create();
    if (t1>0){
      vec4.lerp(ip.lip,ip.lp,ip.ld,t1);
    }else{
      vec4.lerp(ip.lip,ip.lp,ip.ld,t2);
    }
    ray.inside=t1<0;
    this.localToAbsolute(ip.ip,ip.lip);
    return ip;
  },    
  normal:function(ip,ray){
    if (ip.n) {
      vec4.copy(ip.n,ip.ip);
    }else{
      ip.n=vec4.clone(ip.ip);
    }
    vec4.sub(ip.n,this.position);
    vec4.scale(ip.n,1/this.radius);
    ip.n[3]=0;
    return ip.n;
  },
  uvw:function(ip,ray){
    var tip=vec4.clone(ip.lip);
    vec4.normalize(tip,tip);
    if (!ip.uvw) ip.uvw=vec4.create();
    ip.uvw[0]=tip[0]/2+0.5;
    ip.uvw[1]=tip[1]/2+0.5;
    ip.uvw[2]=tip[3]/2+0.5;
    ip.uvw[3]=1;
  }      
});
