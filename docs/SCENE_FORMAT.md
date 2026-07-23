# Scene Format Reference

PARTrace scenes are JSON objects edited in the page's **Scene** textarea (or sent to the renderer directly). Comment lines beginning with `#` are stripped before parsing, so you can annotate scenes inline. This document is the authoritative list of every top-level key, type, and field, derived from `scene.js` (`Scene.setPropsFromJson`), `js/registry.js`, and each scene-graph class's `setPropsFromJson`.

## Table of Contents

- [Top-Level Keys](#top-level-keys)
- [Value Forms](#value-forms)
- [The `scene` Object](#the-scene-object)
- [Camera](#camera)
- [Fog](#fog)
- [Lights](#lights)
- [Materials](#materials)
- [Objects](#objects)
- [Shared `BaseObj` Fields](#shared-baseobj-fields)
- [The `disabled` Flag](#the-disabled-flag)
- [Default Scene](#default-scene)
- [Related Documentation](#related-documentation)

## Top-Level Keys

These live at the root of the JSON object. The `scene` key is the only one that is structurally required to render anything visible; the rest have sensible defaults.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `maxWorkers` | number | `0` | `0` auto-detects (`navigator.hardwareConcurrency`, falling back to 2). Any other positive integer pins the worker-pool size. Each worker renders one contiguous horizontal row-slice. |
| `width` | number | `640` (worker) / canvas width (page) | Render width in pixels. |
| `height` | number | `480` (worker) / canvas height (page) | Render height in pixels. |
| `antiAlias` | number | `0` | `0` = off, `1` = 3×3 supersampling, `2` = 5×5 supersampling. |
| `aaThreshold` | number | `0` | Adaptive anti-aliasing color-difference threshold. `0` disables the adaptive test (supersamples every pixel when `antiAlias` is set). Non-zero only re-samples a pixel when a neighboring color differs by more than this threshold. |
| `doReflect` | boolean | `true` | Enables recursive reflection rays. |
| `doRefract` | boolean | `true` | Enables recursive refraction rays (glass/transparency). |
| `doShadows` | boolean | `true` | Enables shadow rays from lights. |
| `scene` | object | — | The scene graph. See [The `scene` Object](#the-scene-object). |

## Value Forms

Vector and color fields accept any of the following, coerced by `Partrace.vToVec4`:

| Form | Example | Meaning |
|------|---------|---------|
| 3-component array | `[1, 0, 0]` | `x, y, z`. The `w` (4th) component is set from the field's convention: `1` for points (positions), `0` for directions/normals. |
| 4-component array | `[1, 0, 0, 0.75]` | `x, y, z, w`. For colors, `w` is alpha (`0`–`1`, where `< 1` is transparent and triggers refraction). |
| 1-component array or scalar | `[0.5]` or `0.5` | Broadcast to all components (`[0.5, 0.5, 0.5]`). |
| String | `"1,0,0"` or `"1,0,0,1"` | Comma-separated numbers, same rules as the array form. |

## The `scene` Object

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `bg_color` | color | `[0, 0, 0]` (black) | Background color used when a ray misses every object. Also the default fog color. |
| `camera` | object | `[0,0,-1]` looking at `0,0,0` | See [Camera](#camera). |
| `fog` | object | `null` (disabled) | See [Fog](#fog). Present but `disabled:true` means no fog. |
| `lights` | array | `[]` | See [Lights](#lights). |
| `materials` | array | `[]` | See [Materials](#materials). Materials are referenced by `name` from objects and from other materials. |
| `objects` | array | `[]` | See [Objects](#objects). |

## Camera

Parsed by `Camera.setPropsFromJson` (`camera.js`) plus the shared [BaseObj fields](#shared-baseobj-fields).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `position` | point | `[0, 0, -1]` | Camera position. |
| `look` | point | `[0, 0, 0]` | Point the camera looks at. |
| `fov` | number | `90` | Horizontal field of view in degrees. |
| `focusBlurLevels` | number | `3` | Depth-of-field supersampling level. |
| `focusDist` | number | `-0.5` | Near focus distance for depth-of-field. |
| `farFocusDist` | number | `0.75` | Far focus distance for depth-of-field. |

## Fog

Parsed by `Fog.setPropsFromJson` (`fog.js`). Fog is **created unless `disabled` is exactly `true`** — omitting the key or setting `disabled:false` turns fog on. Fog blends the hit color toward `color` based on the hit distance.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `disabled` | boolean | `false` | `true` disables fog entirely (fog defaults to on when the `fog` object is present). |
| `color` | color | scene `bg_color` | Fog tint. |
| `type` | string | `"linear"` | One of `"linear"`, `"exp"`, `"exp2"`. |
| `near` | number | `1` | Near distance (linear only). Hits closer than this are unfogged. |
| `far` | number | `10` | Far distance (linear only). Hits farther than this are fully fogged. |
| `density` | number | `0.15` | Density coefficient for `exp` / `exp2` (`f = 1 / exp(dist·density)` or its square). |

## Lights

Registered light types live in `Partrace.LIGHT_TYPES` (`js/registry.js`). Every light also accepts the shared [BaseObj fields](#shared-baseobj-fields).

### `point`

A point light at `position`. Parsed by `Lights.Point.setPropsFromJson` (`lights.js`).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `diffuse` | color | `[1, 1, 1]` | Diffuse color the light contributes. |
| `specular` | color | `[1, 1, 1]` | Specular highlight color. |
| `ambient` | color | `[0, 0, 0]` | Ambient color added to every lit surface. |
| `fallOffRadius` | number | `10` (point) | Distance over which intensity falls to zero. |
| `attenuationType` | string | `"squared"` (point) | Distance attenuation model: `"none"`, `"linear"`, or `"squared"`. |
| `shader` | string | `"blinn"` (point) | Specular shading model: `"phong"` (reflect·view) or `"blinn"` (normal·half-vector). |
| `castShadows` | boolean | `true` | Whether this light casts shadows (also gated by the scene's `doShadows`). |

The shader switch:
- **Phong** — specular intensity is `(R·V)^shiny`, where `R` is the light vector reflected about the surface normal and `V` is the view vector.
- **Blinn-Phong** — specular intensity is `(N·H)^shiny`, where `H = normalize(L + V)` is the half vector.

## Materials

Registered material types live in `Partrace.MATERIAL_TYPES` (`js/registry.js`). Every material also accepts the shared [BaseObj fields](#shared-baseobj-fields). Material base fields (parsed by `Material.setPropsFromJson` in `materials.js`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | `"material"` | Name used by objects (and `checkermat`/`combiner`) to reference this material. |
| `diffuse` | color | `[1, 1, 1, 1]` | Diffuse color. Alpha (`w`) `< 1` makes the surface translucent and triggers refraction (see `refract`). |
| `specular` | color | `[1, 1, 1, 1]` | Specular color. |
| `shiny` | number | `0` | Specular exponent (Phong/Blinn shininess). `0` disables specular. |
| `reflect` | number | `0` | Reflectance in the range `0`–`1`. `0` is matte; `1` is a perfect mirror. |
| `refract` | number | `0` | Index of refraction. `0` disables refraction; typical glass is around `1.2`–`1.5`. Only effective when `diffuse` alpha `< 1`. |
| `metallic` | boolean | `false` | When `true`, reflection color is tinted by the diffuse color (metals). |
| `offset` | vec4 | `[0, 0, 0, 0]` | Per-material offset applied to texture coordinates / shading. |
| `scale` | vec4 | `[1, 1, 1, 1]` | Per-material scale (inherited from BaseObj). For `checker` it sets the checker cell size; for `rainbow` it scales the color. |

### `basic`

The base `Material` itself. Uses only the fields above.

### `checker`

A two-color procedural checkerboard driven by the hit's surface coordinates. The two cell colors are inline RGBA values.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `diffuse1` | color | `[1, 1, 1, 1]` | Color of even cells. |
| `diffuse2` | color | `[0, 0, 0, 1]` | Color of odd cells. |
| `scale` | vec4 | `[1, 1, 1, 1]` | Checker cell size along each axis. |

### `checkermat`

Like `checker`, but `diffuse1` / `diffuse2` are **material names** (strings) resolved via `Scene.materialByName`, so each cell renders as another full material (including its own reflect/refract/specular). Lets you combine two materials in a checker pattern.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `diffuse1` | string | — | Name of the material for even cells. |
| `diffuse2` | string | — | Name of the material for odd cells. |
| `scale` | vec4 | `[1, 1, 1, 1]` | Checker cell size along each axis. |

> **Note:** The referenced materials must appear in the `materials` array (order does not matter; resolution is by name).

### `rainbow`

Derives the surface color from the intersection's surface coordinates (normal direction), producing a smooth rainbow gradient. There are no type-specific JSON fields; `offset` shifts the gradient and `scale` scales it.

### `combiner`

Sums the diffuse colors of two other materials at each hit. Like `checkermat`, `diffuse1` / `diffuse2` are **material names** (strings).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `diffuse1` | string | — | Name of the first material. |
| `diffuse2` | string | — | Name of the second material. |

## Objects

Registered object types live in `Partrace.OBJECT_TYPES` (`js/registry.js`). Every object also accepts the shared [BaseObj fields](#shared-baseobj-fields). The `material` field (parsed by `Objects.MaterialObj.setPropsFromJson`) names a material from the `materials` array.

### `sphere`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `radius` | number | `0.5` | Sphere radius. (Read directly by the type factory before construction.) |
| `material` | string | default material | Name of the material to render the sphere with. |

### `plane`

An axis-aligned plane (in the object's local XZ plane). When `width` and `height` are both non-zero the plane is bounded to those extents; if either is `0` the bounds check is skipped and the plane is infinite in both axes.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `width` | number | `5` | Plane extent along the local X axis. `0` disables bounding (see above). (Read directly by the type factory.) |
| `height` | number | `5` | Plane extent along the local Z axis. `0` disables bounding (see above). (Read directly by the type factory.) |
| `material` | string | default material | Name of the material to render the plane with. |

## Shared `BaseObj` Fields

Every light, material, and object inherits from `BaseObj` (`baseobj.js`) and accepts these fields via `setPropsFromJson`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | `""` | Instance name. |
| `position` | point | `[0, 0, 0]` | Position in world space (`w = 1`). |
| `direction` | vec4 | `+Z` | Forward direction (`w = 0`). |
| `up` | vec4 | `+Y` | Up direction (`w = 0`). |
| `scale` | point | `[1, 1, 1, 1]` | Per-axis scale. |
| `castShadows` | boolean | `true` | Whether this object/light casts shadows. |
| `receiveShadows` | boolean | `true` | Whether this object receives shadows. |

## The `disabled` Flag

Every item in `lights`, `materials`, and `objects` accepts a top-level `disabled` field. An item is skipped at load time when `disabled` is exactly `true`; any other value (or omitting the key) includes it. This is the recommended way to comment out a scene element without deleting it.

The `fog` object uses the same flag with inverted presence semantics — see [Fog](#fog).

## Default Scene

This is the scene shipped in `src/default-scene.js` (exported as `DEFAULT_SCENE` and loaded into the editor's textarea by `src/main.js`) and the one rendered for `images/screenshot.png`.

```json
{
  "maxWorkers": 0,
  "width": 800,
  "height": 600,
  "antiAlias": 0,
  "aaThreshold": 0.001,
  "doReflect": true,
  "doRefract": true,
  "doShadows": true,
  "scene": {
    "bg_color": [0, 0, 0],
    "camera": {
      "position": [0, 0, -2.5],
      "fov": 90
    },
    "fog": {
      "disabled": true,
      "type": "linear",
      "near": 1,
      "far": 9
    },
    "lights": [
      {
        "disabled": false,
        "type": "point",
        "position": [5, 5, -3],
        "shader": "phong",
        "attenuationType": "squared",
        "fallOffRadius": 12
      }
    ],
    "materials": [
      { "name": "checker", "type": "checker",
        "scale": [0.1, 0.1, 0.05], "specular": [1, 1, 1], "shiny": 128 },
      { "name": "blue", "type": "basic", "diffuse": [0, 0, 1],
        "shiny": 16, "reflect": 0.95, "metallic": true },
      { "name": "red", "type": "basic", "diffuse": [0.9, 0, 0],
        "specular": [0.9, 0, 0], "shiny": 16, "reflect": 0.25 },
      { "name": "glass", "type": "basic", "diffuse": [1, 0, 0, 0.75],
        "refract": 1.2, "shiny": 128 },
      { "name": "checkermat", "type": "checkermat",
        "diffuse": [0, 1, 0], "diffuse1": "rainbow", "diffuse2": "green",
        "scale": [0.1, 0.1, 0.05] },
      { "name": "green", "type": "basic", "diffuse": [0, 1, 0] },
      { "name": "rainbow", "type": "rainbow", "offset": [2, -3, 3] }
    ],
    "objects": [
      { "name": "left Sphere", "type": "sphere", "material": "checker",
        "radius": 1, "position": [-1.25, 0, 0] },
      { "name": "right Sphere", "type": "sphere", "material": "blue",
        "radius": 1, "position": [1.25, 0, 0] },
      { "name": "glass Sphere", "type": "sphere", "material": "glass",
        "radius": 0.5, "position": [0.75, -0.5, -1.25] },
      { "name": "floor Plane", "type": "plane", "material": "checkermat",
        "position": [0, -1, 0] }
    ]
  }
}
```

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — two-realm design, module graph, worker message protocol.
- [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) — documentation conventions for this project.
