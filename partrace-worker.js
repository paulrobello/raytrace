self.onmessage=function(event){
  importScripts(
    "https://rawgit.com/toji/gl-matrix/master/dist/gl-matrix-min.js",  
    "/js/class.js",
    "/js/par.js",
    "/utils.js",

    "/parmath.js",
    "/partrace-threaded.js",
    
    "/scene.js",
    "/fog.js",
    "/baseobj.js",

    "/ray.js",
    "/camera.js",
    "/lights.js",
    "/materials.js",
    "/objects.js"
    
  );

  var partrace = new Partrace(this);  
  partrace.setPropsFromJson(event.data.setup);
  partrace.render();
};