// The default scene preloaded into the editor. Kept as plain text (JSON with
// `#` comment lines) so it round-trips through the textarea and localStorage
// exactly as written.
export const DEFAULT_SCENE = `# lines starting with # are comments
{
  # 0 = auto detect or set to number of cpu cores
  "maxWorkers":0,
  # width and height of image
  "width":800,
  "height":600,
  # 0 = off, 1=3x3, 2=5x5
  "antiAlias":0,
  # 0=disable adaptive aa
  "aaThreshold":0.001,
  "doReflect":true,
  "doRefract":true,
  "doShadows":true,
  "scene":{
    "bg_color":[0,0,0],
    "camera":{
      "position":[0,0,-2.5],
      "fov":90
    },
    "fog":{
      "disabled":true,
      # "linear","exp","exp2"
      "type":"linear",
      "near":1,
      "far":9
    },
    "lights":[
      {
        "disabled":false,
        "type":"point",
        "position":[5,5,-3],
        # "phong","blinn"
        "shader":"phong",
        # "none","linear","squared"
        "attenuationType":"squared",
        "fallOffRadius":12
      }
    ],
    "materials":[
      {
        "name":"checker",
        "type":"checker",
        "scale":[0.1,0.1,0.05],
        "specular":[1,1,1],
        "shiny":128
      },
      {
        "name":"blue",
        "type":"basic",
        "diffuse":[0,0,1],
        "shiny":16,
        "reflect":0.95,
        "metallic":true
      },
      {
        "name":"red",
        "type":"basic",
        "diffuse":[0.9,0,0],
        "specular":[0.9,0,0],
        "shiny":16,
        "reflect":0.25
      },
      {
        "name":"glass",
        "type":"basic",
        "diffuse":[1,0,0,0.75],
        "refract":1.2,
        "shiny":128
      },
      {
        "name":"checkermat",
        "type":"checkermat",
        "diffuse":[0,1,0],
        "diffuse1":"rainbow",
        "diffuse2":"green",
        "scale":[0.1,0.1,0.05]
      },
      {
        "name":"green",
        "type":"basic",
        "diffuse":[0,1,0]
      },
      {
        "name":"rainbow",
        "type":"rainbow",
        "offset":[2,-3,3]
      }
    ],
    "objects":[
      {
        "name":"left Sphere",
        "type":"sphere",
        "material":"checker",
        "radius":1,
        "position":[-1.25,0,0]
      },
      {
        "name":"right Sphere",
        "type":"sphere",
        "material":"blue",
        "radius":1,
        "position":[1.25,0,0]
      },
      {
        "name":"glass Sphere",
        "type":"sphere",
        "material":"glass",
        "radius":0.5,
        "position":[0.75,-0.5,-1.25]
      },
      {
        "name":"floor Plane",
        "type":"plane",
        "material":"checkermat",
        "position":[0,-1,0]
      }
    ]
  }
}
`;
