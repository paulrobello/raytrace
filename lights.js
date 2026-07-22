Partrace.Light=BaseObj.extend({
  init: function(partrace,parent){
    this._super(parent);

    this.attenuationType='none';
    this.ka=vec4.fromValues(0,0,0,1);
    this.kd=vec4.fromValues(1,1,1,1);
    this.ks=vec4.fromValues(1,1,1,1);
    this.fallOffRadius=10;
    this.l=vec4.create(); // light vector used by intensity function
    this.h=vec4.create(); // used for blinn specular
    this.sl=vec4.create(); // no specular
    this.dl=vec4.create(); // no diffuse
    this.al=vec4.create(); // no ambient
    this.sColor=vec4.create();
  },
  intensity:function(color,ip){
    return false;
  }
});

Partrace.Lights.Point=Partrace.Light.extend({
  init: function(parent){
    this._super(parent);
    this.attenuationType='squared';
    this.radius=2;
    this.shader='blinn';
    this.intensity=this.intensityBlinnPhong;
  },
  intensityBlinnPhong:function(color,ip){
    if (ip.object instanceof Partrace.Light){
      vec4.copy(color,this.kd);
      return this;
    }

    var
    sh, // default shine
    a, // default alpha
    mat=ip.object.material;
    if (mat){ // use material values if available
      sh=mat.shiny;
      a=mat.d[3];
    }else{
      a=1;
      sh=0;
    }
    var l = this.l;
    vec4.subtract(l,this.position,ip.ip);
    var dist2=vec4.sqrLen(l);
    var dn=1/Math.sqrt(dist2);
    vec4.scale(l,l,dn); // normalize light vector
    var dist=dist2*dn;

    var ldotn=vec4.dot(l,ip.n);
    var intensity=Math.saturate(ldotn);

    var al=this.al; // ambient light
    var dl=this.dl; // diffuse light
    var sl=this.sl; // specular light

    if (mat){ // do we have a material ?
      vec4.add(al,this.ka,mat.a); // add light ambient with material
      vec4.multiply(dl,this.kd,mat.d); // combine light diffuse with material
    }else{
      vec4.copy(al,this.ka);
      vec4.copy(dl,this.kd);
    }
    vec4.copy(sl,this.ks); // start with light specular
    vec4.scale(dl,dl,intensity); //diffuse color shaded by angle between light and normal

    var oi=1; //attenuation modifyer for soft shadows and caustics

    if (this.scene.doShadows && this.castShadows && ip.object.receiveShadows && !ip.ray.inside){
      var sRay=new Partrace.Ray('shadow',ip.ip,l);
      vec4.project(sRay.p,sRay.p,sRay.d,Partrace.epsilon);
      sRay.depth=ip.ray.depth;

      if (this.scene.itersectScene(sRay)){
        oi=this.ka[0];
        var smat=sRay.ip.object.material; // object casting shadow material
        if (smat){
          var sta=smat.getAttrs(sRay);
          if (sta.d[3]<1){
            oi=sta.d[3];
            vec4.scale(this.sColor,sta.d,oi);
            vec4.multiply(dl,dl,this.sColor);
          } // end translucent
        } // end smat
      } // end shadow hit
    } // end do shadow

    // specular
    if (sh>0){
      var intensity;
      var h = this.h;
      switch(this.shader){
        case 'phong':
          vec4.reflect(h,l,ip.n); // reflect light around normal
          vec4.normalize(h,h);
          var rdotv=vec4.dot(h,ip.ray.d); // angle between ray and reflected light
          intensity=Math.pow(Math.saturate(rdotv),sh);
          break;
        case 'blinn':
          vec4.negate(h,ip.ray.d);
          vec4.add(h,h,l); // compute half vector;
          vec4.normalize(h,h);
          var ndoth=vec4.dot(ip.n,h); // angle between camera and reflected light
          intensity=Math.pow(Math.saturate(ndoth),sh);
          break;
        default: intensity=0;
      }

      if (mat) vec4.multiply(sl,sl,mat.s); // combine material specular
      vec4.scale(sl,sl,intensity); // scale the specular dot by shine level
    } // end specular

    switch (this.attenuationType){
      case 'none':att=1; break;
      case 'linear':att=Math.saturate(1-(dist/this.fallOffRadius)); break;
      case 'squared':att=Math.saturate(1-Math.sqr(dist/this.fallOffRadius)); break;
      default: att=1; // no falloff
    }

    vec4.copy(color,dl); // start with diffuse
    if (sh>0) vec4.add(color,color,sl) // add specular
    vec4.scale(color,color,att*oi) // attenuate and shadow
    vec4.add(color,color,al); // add ambient
    vec4.scale(color,color,a); // apply transparency
    return false;
  },
  setDiffuse:function(v){
    vec4.copy(this.kd,v);
  },
  setSpecular:function(v){
    vec4.copy(this.ks,v);
  },
  setAmbient:function(v){
    vec4.copy(this.ka,v);
  },
  setfallOffRadius:function(v){
    this.fallOffRadius=v;
  },
  setAttenuationType:function(v){
    this.attenuationType=v;
  },
  setShader:function(v){
    this.shader=v;
  },
  setPropsFromJson:function(json){
    this._super(json);
    if (json.diffuse)  this.setDiffuse(Partrace.vToVec4(json.diffuse,1));
    if (json.specular) this.setSpecular(Partrace.vToVec4(json.specular,1));
    if (json.ambient)  this.setAmbient(Partrace.vToVec4(json.ambient));
    if (json.fallOffRadius!==undefined) this.setfallOffRadius(parseFloat(json.fallOffRadius));
    if (json.attenuationType) this.setAttenuationType(json.attenuationType);
    if (json.shader) this.setShader(json.shader);
  }
});
