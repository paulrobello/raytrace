Partrace.Objects.Sphere=Partrace.Objects.MaterialObj.extend({
  init:function(parent,radius,material){
    this._super(parent,material);        
    this.setRadius(radius||0.5);
  },
  setRadius:function(r){
    this.radius = r;
    this.radius2 = this.radius*this.radius;
  },
  intersect:function(ray){
    var ip = new Partrace.Intersection(ray,this);
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
    var tip=vec4.clone(ip.lip);
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
  },
  intersect:function(ray){
    var ip = new Partrace.Intersection(ray,this);
    this.absoluteToLocal(ip.lp,ip.p);
    this.absoluteToLocal(ip.ld,ip.d);
    var n = this.getAbsoluteUp();
    var sp = vec4.clone(ip.lp);
    vec4.negate(sp,sp);
    sp[3]=0;
    var d = vec4.dot(ip.ld,n);
//    if (d>Partrace.epsilon || d<-Partrace.epsilon) return false;
     if (d>Partrace.epsilon) return false;
          
    d=1/d;
    var t = vec4.dot(sp,n)*d;    
    if (t<=0) return false;
    vec4.combine(ip.lip,ip.lp,ip.ld,1,t);    
    if ( (Math.abs(ip.lip[0])>0.5*this.width) || (Math.abs(ip.lip[1])>0.5*this.height) ) return false;
    
    this.localToAbsolute(ip.ip,ip.lip);
    ip.dist2=vec4.squaredDistance(ray.p,ip.ip);
    return ip;
  },    
  normal:function(ray){
    var ip = ray.ip;
    if (ip.n) {
      vec4.copy(ip.n,this.getAbsoluteUp());
    }else{
      ip.n=vec4.clone(getAbsoluteUp());
    }
    return ip.n;
  },
  uvw:function(ray){
    var ip = ray.ip;
    if (!ip.uvw) ip.uvw=vec4.create();
    ip.uvw[0]=1-(ip.lip[0]+this.width /2)/this.width;
    ip.uvw[1]=  (ip.lip[1]+this.height/2)/this.height;
    ip.uvw[2]=  (ip.lip[2]+this.height/2)/this.height;;
    ip.uvw[3]=1;
    return ip.uvw;
  }      
});
