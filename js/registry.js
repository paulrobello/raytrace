// A1: single source of truth mapping JSON type names -> constructors.
//
// Importing the scene-graph files here attaches every Partrace.* class to the
// shared namespace as a side effect; once they have evaluated, we can build the
// type registries that Scene.setPropsFromJson looks up. Both the module worker
// entry (partrace-worker.js) and the test harness (tests/loader.js) import this
// module so the registry is built exactly once, in one place.
import { Partrace } from '../partrace-threaded.js';
import '../scene.js';      // side effect: attaches Partrace.Scene
import '../fog.js';        // side effect: attaches Partrace.Fog
import '../baseobj.js';    // side effect: attaches BaseObj (exported)
import '../ray.js';        // side effect: attaches Partrace.Ray / Intersection
import '../camera.js';     // side effect: attaches Partrace.Camera
import '../lights.js';     // side effect: attaches Partrace.Light / Lights.Point
import '../materials.js';  // side effect: attaches Partrace.Material(s.*) / Objects.MaterialObj
import '../objects.js';    // side effect: attaches Partrace.Objects.Sphere / Plane

// Lights and materials construct with no JSON-derived args (their JSON fields
// flow through setPropsFromJson), so the registry stores the class itself and
// the call site does `new TypeCtor()`.
Partrace.LIGHT_TYPES = {
  point: Partrace.Lights.Point
};
Partrace.MATERIAL_TYPES = {
  basic: Partrace.Material,
  checker: Partrace.Materials.Checker,
  checkermat: Partrace.Materials.CheckerMat,
  rainbow: Partrace.Materials.Rainbow,
  combiner: Partrace.Materials.Combiner
};

// Objects take constructor args (Sphere: radius; Plane: width/height) that
// setPropsFromJson does NOT restore, so each entry is a factory preserving the
// original `new ...(null, ...)` call signatures exactly.
Partrace.OBJECT_TYPES = {
  sphere: function (obj) { return new Partrace.Objects.Sphere(null, obj.radius); },
  plane: function (obj) { return new Partrace.Objects.Plane(null, obj.width, obj.height); }
};
