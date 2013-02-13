Partrace.Light=BaseObj.extend({
  init: function(partrace,parent){
    this._super(parent);
    
    this.attenuationType='none';
    this.ka=vec4.fromValues(0.05,0.05,0.05,1);
    this.kd=vec4.fromValues(1,1,1,1);
    this.ks=vec4.clone(this.kd);
    this.fallOffRadius=10;
  },
  intensity:function(color,ip){
  }  
});

Partrace.Lights.Point=Partrace.Light.extend({
  init: function(partrace,parent){
    this._super(parent);
    this.attenuationType='squared';
    this.fallOffRadius=25;
    this.radius=2;
  },
  intensity:function(color,ip){
    if (ip.object instanceof Partrace.Light){
      vec4.copy(color,this.kd);
      return this;
    }

    var sh=0;
    var a=1;
    var mat=ip.object.material;
    if (mat){
      sh=mat.shiny;
      a=mat.d[3];
    }
    var sl=vec4.create(); // no specular
    var dl=vec4.create(); // no diffuse
    var al=vec4.clone(this.ka); // ambient
      
    var l=vec4.create(); // light vector
    vec4.subtract(l,this.position,ip.ip);
    var dist2=vec4.sqrLen(l);
    var dn=1/Math.sqrt(dist2);
    vec4.scale(l,l,dn); // normalize light vector
    var dist=dist2*dn;
    
    var ldotn=vec4.dot(l,ip.n);
    //if (ldotn<Partrace.epsilon) return; // disable for 2 sided lighting
    
//    var st=new Partrace.Intersection(); // shadow ip
    var oi=1; //attenuation modifyer for soft shadows and caustics
    
    //phong specular
    if (sh>0){
      var r=vec4.reflect(undefined,l,ip.n); // reflect light around normal
      vec4.normalize(r,r);
      var rdotv=vec4.dot(r,ip.ray.d); // angle between camera and reflected light
      if (rdotv>0){ // specular
        vec4.copy(sl,this.ks); // start with light specular
        vec4.multiply(sl,sl,mat.s); // combine material specular
        vec4.scale(sl,sl,Math.pow(rdotv,sh)); // scale the specular dot by shine level
      }
    }
    switch (this.attenuationType){
      case 'none':att=1; break;
      case 'linear':att=Math.clamp(1-(dist/this.fallOffRadius),0,1); break;
      case 'squared':att=Math.clamp(1-Math.sqr(dist/this.fallOffRadius),0,1); break;
      default: att=1; // no falloff
    }
    
    vec4.add(al,al,mat.a); // combine material ambient    
    
    vec4.copy(dl,this.kd);
    vec4.multiply(dl,dl,mat.d); // combine light diffuse with material
    vec4.scale(dl,dl,ldotn); //diffuse color shaded by angle between light and normal

    vec4.copy(color,dl); // diffuse
    vec4.add(color,color,sl) // add specular
    vec4.scale(color,color,att*oi) // attenuate
    vec4.add(color,color,al); // add with ambient    
    vec4.scale(color,color,a); // apply transparency       
  }    
});
