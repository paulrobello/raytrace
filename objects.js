import { vec4 } from './js/vecmath.js';
import { Partrace } from './partrace-threaded.js';

Partrace.Objects.Sphere=Partrace.Objects.MaterialObj.extend({
  init:function(parent,radius,material){
    this._super(parent,material);
    this.setRadius(radius||0.5);
    this.wlp=vec4.create(); // work var: local ray position
    this.wld=vec4.create(); // work var: local ray direction
    this.wdst=vec4.create(); // work var: scratch (zeroed-w copy of lp)
  },
  setRadius:function(r){
    this.radius = r;
    this.radius2 = this.radius*this.radius;
  },
  intersect:function(ray){
    var lp=this.wlp;
    var ld=this.wld;
    this.absoluteToLocal(lp,ray.p);
    this.absoluteToLocal(ld,ray.d);
    var dst=this.wdst;
    vec4.copy(dst,lp);
    dst[3]=0;
    var b = vec4.dot(dst,ld);
    var c = vec4.dot(dst,dst)-this.radius2;
    var d=(b*b)-c;
    if (d<Partrace.epsilon) return false;
    d=Math.sqrt(d);
    var t1=-b-d;
    var t2=-b+d;
    if (t1<0 && t2<0) return false;
    var ip = new Partrace.Intersection(ray,this);
    vec4.copy(ip.lp,lp);
    vec4.copy(ip.ld,ld);
    if (t1>0){
      vec4.project(ip.lip,ip.lp,ip.ld,t1);
    }else{
      vec4.project(ip.lip,ip.lp,ip.ld,t2);
    }
    ray.inside=t1<0;
    this.localToAbsolute(ip.ip,ip.lip);
    ip.dist2=vec4.squaredDistance(ray.p,ip.ip);
    return ip;
  },
  normal:function(ray){
    var ip = ray.ip;
    if (ip.n) {
      vec4.copy(ip.n,ip.ip);
    }else{
      ip.n=vec4.clone(ip.ip);
    }
    
    vec4.sub(ip.n,ip.n,this.position);
    vec4.scale(ip.n,ip.n,1/this.radius);
    return ip.n;
  },
  uvw:function(ray){
    var ip = ray.ip;
    var tip=this.wdst;
    vec4.copy(tip,ip.lip);
    vec4.normalize(tip,tip);
    if (!ip.uvw) ip.uvw=vec4.create();
    ip.uvw[0]=tip[0]/2+0.5;
    ip.uvw[1]=tip[1]/2+0.5;
    ip.uvw[2]=tip[2]/2+0.5;
    ip.uvw[3]=1;
  }      
});

Partrace.Objects.Plane=Partrace.Objects.MaterialObj.extend({
  init:function(parent,width,height,material){
    this._super(parent,material);
    this.width=width||5;
    this.height=height||5;
    this.wlp=vec4.create(); // work var: local ray position
    this.wld=vec4.create(); // work var: local ray direction
    this.wlip=vec4.create(); // work var: local intersection point
    this.wsp=vec4.create(); // work var: scratch (negated zeroed-w copy of lp)
  },
  intersect:function(ray){
    var lp=this.wlp;
    var ld=this.wld;
    this.absoluteToLocal(lp,ray.p);
    this.absoluteToLocal(ld,ray.d);
    var n = this.getAbsoluteUp();
    var sp = this.wsp;
    vec4.copy(sp,lp);
    vec4.negate(sp,sp);
    sp[3]=0;
    var d = vec4.dot(ld,n);
    if (d>Partrace.epsilon) return false;

    d=1/d;
    var t = vec4.dot(sp,n)*d;
    if (t<=0) return false;
    var lip=this.wlip;
    vec4.combine(lip,lp,ld,1,t);
    if (this.width!==0 && this.height!==0){
      if ( (Math.abs(lip[0])>0.5*this.width) || (Math.abs(lip[2])>0.5*this.height) ) return false;
    }

    var ip = new Partrace.Intersection(ray,this);
    vec4.copy(ip.lp,lp);
    vec4.copy(ip.ld,ld);
    vec4.copy(ip.lip,lip);
    this.localToAbsolute(ip.ip,ip.lip);
    ip.dist2=vec4.squaredDistance(ray.p,ip.ip);
    return ip;
  },
  normal:function(ray){
    var ip = ray.ip;
    if (ip.n) {
      vec4.copy(ip.n,this.getAbsoluteUp());
    }else{
      ip.n=vec4.clone(this.getAbsoluteUp());
    }
    return ip.n;
  },
  uvw:function(ray){
    var ip = ray.ip;
    if (!ip.uvw) ip.uvw=vec4.create();
    var w=this.width;
    var h=this.height;
    ip.uvw[0]=1-(ip.lip[0]+w /2)/w;
    ip.uvw[1]=  (ip.lip[1]+h/2)/h;
    ip.uvw[2]=  (ip.lip[2]+h/2)/h;
    ip.uvw[3]=1;
    return ip.uvw;
  }      
});
