# PARTrace Audit Report

**Date:** 2026-07-22
**Scope:** Architecture, code quality, security, documentation. Report-only — no code was changed.
**Method:** Four parallel specialist audits; every Critical/High code finding below was independently spot-verified against source by the orchestrator.
**Baseline:** commit `9121836` (post dependency upgrade: jQuery 4.0.0, jQuery UI 1.14.2, lodash 4.17.21, gl-matrix 3.4.4 + globals shim). Threaded render path verified working headless (977k rays, 6 workers, no console errors).

---

## Executive Summary

The core architecture is sound for its purpose: a clean main-thread coordinator + row-partitioned Web Worker pool with a simple message protocol, a consistent `Class.extend`-based scene-graph object model, and data-driven scene JSON. The default scene renders correctly.

However, the codebase has **zero automated verification** (no lint, types, tests, or Makefile), and the audit found **five confirmed correctness bugs** in code paths off the default scene — including one silent rendering-correctness bug in the core shading loop — plus a **real DOM-XSS sink**, a permanently-hanging failure mode when a worker throws, and a substantial amount of actively-loaded dead code. All confirmed bugs are of the exact class a basic ESLint pass or a tiny smoke test would have caught.

**Verified bugs (fix first):**

| # | Bug | Location | Effect |
|---|-----|----------|--------|
| 1 | Child rays alias parent's `p`/`d` vectors and mutate them in place | `scene.js:125,155` + `ray.js:3-5` | Wrong reflection/refraction for every light after the first on multi-light scenes |
| 2 | `new new Partrace.Materials.Combiner()` | `scene.js:254` | Any `"type":"combiner"` material throws; render hangs silently |
| 3 | `Combiner.getAttrs` copies a Material object into a vec4 (missing `.d`) | `materials.js:175-176` | Combiner colors are garbage even after #2 is fixed |
| 4 | `this.setCastShadow(...)` called but never defined; JSON keys typo'd (`castShadow`/`castShadows`, `recieveShadow`) | `baseobj.js:306-307` | Per-object shadow flags unusable; throws if triggered |
| 5 | `this.with` (typo for `this.width`) | `objects.js:85` | Plane width-bounding opt-out broken |

---

## Security

### High

**S1. DOM-based XSS via scene JSON strings reaching `$("#log").prepend()` unescaped** — *verified*
`partrace.js:244-251` (`Partrace.log`), `partrace.js:169-171` ('log' message), `partrace.js:198-199` (`onError`), `js/par.js:41-114` (`FormatJSON` — no HTML escaping), `scene.js:227,257,278` (`'Unknown ... type: ' + obj.type`).
Scene JSON is parsed safely with `JSON.parse`, but any string value in the scene (a `name`, or an invalid `type`) later flows into jQuery `.prepend()`, which parses strings as HTML. `js/par.js:121` logs the entire setup JSON on every worker start, so payloads fire on every Render click, not just error paths. A shared "try this scene" snippet is a realistic delivery vector, and the scene auto-persists via `localStorage`.
**Remedy:** never build HTML from data — use `.text()` / `document.createTextNode` plus element nodes, or HTML-escape every string before insertion (including `FormatJSON` leaf strings at `js/par.js:94`).

### Medium

**S2. CDN assets lack Subresource Integrity** — `index.html:7,9,10,11`. All four cdnjs tags (jQuery UI CSS, jQuery, jQuery UI, lodash) are version-pinned but carry no `integrity`/`crossorigin` attributes. A compromised CDN edge executes with full page privileges. **Remedy:** add cdnjs-published SRI hashes + `crossorigin="anonymous"` to all four tags. *(Flagged by 3 of 4 audits.)*

**S3. No Content-Security-Policy** — `index.html`. Even a modest meta CSP (`script-src 'self' https://cdnjs.cloudflare.com; object-src 'none'; base-uri 'self'`) would have neutralized S1's execution. Requires externalizing (or hashing/nonce-ing) the inline `<script>`/`<style>` blocks. If deployed behind Cloudflare Pages, prefer a `_headers` file, which can also add `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.

**S4. Vendored, unmaintained core-estimator with opaque NaCl binary** — `js/core-extimator/` (~2014 upstream, includes a 75KB compiled `cores.pexe` that cannot be reviewed), loaded on every page at `index.html:16`. PNaCl was removed from Chrome years ago and `navigator.hardwareConcurrency` is universal, so the entire library is functionally dead weight with supply-chain surface. **Remedy:** delete the tree, the script tag, and the `navigator.getHardwareConcurrency` branch (`index.html:222-227`); use `navigator.hardwareConcurrency || 2` (as `partrace.js:121` already does).

### Strengths
`JSON.parse` (never `eval`) for scene input; no secrets in tree or full git history; no server-side surface at all; `importScripts` paths are hardcoded same-origin (no injection); current pinned versions (jQuery 4.0.0 / jQuery UI 1.14.2 / lodash 4.17.21) have no outstanding published CVEs.

---

## Architecture

### Critical

**A1. String-keyed factory switches with zero tooling produced a shipping crash** — *verified* (Bug #2 above, `scene.js:254`). Four parallel hand-typed `switch`/`new` blocks in `scene.js` (~lines 220-285) are the only bridge from user JSON to constructors. **Remedy:** fix the typo, then replace the switches with one shared type-registry object (`{point: Partrace.Lights.Point, combiner: Partrace.Materials.Combiner, ...}`), and add a smoke test that instantiates every registered type from its JSON name.

### High

**A2. Three incompatible classes all named `Partrace`** — `partrace.js:1` (main-thread controller), `partrace-threaded.js:1` (worker renderer), `partrace-solo.js:1` (dead solo variant). Collision is avoided only by the worker realm boundary — an undocumented deployment invariant. They also duplicate buffer/pixel/stats/log logic that has **already drifted**: `Partrace.epsilon` is `0.001` in `partrace-threaded.js:176` vs `0.000001` in `partrace-solo.js:182`. **Remedy:** distinct names (or shared base module) + delete the solo variant (A3).

**A3. Dead code is shipped and loaded** — *verified*
- `partrace-solo.js` (185 lines): referenced nowhere, and internally broken (`setup.width` at line 58 — `setup` is undefined in scope). Delete or intentionally wire up as a no-worker fallback.
- `js/core-extimator/`: see S4 — loaded synchronously in `<head>` on every visit for zero modern-browser benefit.
- lodash (`index.html:11`): loaded from CDN, **zero call sites** in the repo. Remove the tag. *(Flagged by 3 of 4 audits.)*

**A4. No module system: the dependency graph is hand-encoded twice** — `index.html:7-22` vs `partrace-worker.js:2-22`, two independently ordered load lists with different syntaxes. Git history already contains two incidents of this class (`7703bbd` "updated script path worker", `bea0569` "fixed typo in script tag"). Load-order constraints (gl-matrix → globals shim → parmath) are documented nowhere. **Remedy:** migrate to native ES modules (`<script type="module">` + `new Worker(url, {type:'module'})`) — browsers resolve the graph from `import` statements, no bundler needed. This also supersedes the globals shim (A6).

**A5. Worker-imported `js/par.js` depends on main-thread-only jQuery** — *verified* (`js/par.js:57,69,121,127` call `$.each`; jQuery only loads in `index.html`). Dormant today (only dead code calls those functions from workers), but any future worker-side debug logging throws `ReferenceError: $ is not defined`. **Remedy:** replace `$.each` with plain loops (trivial) or split the file into worker-safe and main-thread halves.

### Medium

**A6. The gl-matrix globals shim is a sound stopgap, not an endpoint** — `js/gl-matrix-globals.js` + `parmath.js` monkey-patching. Well-contained and correct for a zero-build upgrade, but it: tolerates silent upstream API drift (missing method → runtime `undefined is not a function`, not load error), permanently claims `vec2/vec3/vec4/mat*` on the global object, and re-copies per worker spawn. The ES-module migration (A4) removes it entirely (`import { vec4, mat4 } from ...` with parmath extensions applied to the imported namespaces).

**A7. One relative path among ~20 root-relative ones** — `partrace.js:127` `new Worker('partrace-worker.js')` vs `/`-prefixed everywhere else. Works only because the app is served at domain root; a sub-path deploy breaks worker creation specifically. Make it consistent (both audits also note root-relative paths hard-code root deployment generally — pick one convention deliberately).

**A8. Hidden singleton coupling: `Partrace.scene`** — set at `partrace-threaded.js:8`, consumed by `materials.js:161-162,189-190` (`materialByName` lookups). Assumes exactly one scene per realm; blocks multi-scene features (thumbnails/previews) and isolated testing. **Remedy:** pass the owning scene through `setPropsFromJson(json, scene)`, or resolve named material refs in one linking pass in `Scene.setPropsFromJson`.

### Low
Misleading module naming (`utils.js` = 7-line console shim; the actual utils live in `js/par.js`); no lint/test/Makefile (see Tooling below).

### Strengths
Clean minimal worker message protocol (`init`/`setPixel`/`setRow`/`stats`/`log`/`progress`/`end`) with row-range partitioning; jQuery correctly confined to main-thread UI files — the render core is framework-free (exactly right for worker code); uniform `BaseObj`/`setPropsFromJson` scene-graph interface; exact version pins on all CDN URLs.

---

## Code Quality

### Critical

**C1. Child rays alias and corrupt the parent ray's vectors** — *verified* (Bug #1 above).
`ray.js:3-5` stores constructor args by reference. `scene.js:125` (`new Partrace.Ray('reflect', ray.p, ray.d)`) then mutates in place: `vec4.reflect(rRay.d, ray.d, ip.n)` writes through `rRay.d === ray.d`, and `vec4.project(rRay.p, ...)` through `rRay.p === ray.p`. The enclosing `while (i--)` light loop reuses the now-corrupted `ray` for subsequent lights; the refraction branch (`scene.js:155`) repeats the pattern. Silent wrong-image bug on any multi-light scene with reflect/refract enabled. **Remedy:** clone at the call sites (`vec4.clone(ray.p)`, `vec4.clone(ray.d)`) or make `Ray.init` copy defensively.

**C2. Combiner material is doubly broken** — Bugs #2 and #3 above (`scene.js:254`, `materials.js:175-176`). Mirror the correct `CheckerMat.getAttrs` pattern (`materials.js:145,147`: `.getAttrs(ray).d`).

**C3. Shadow-flag JSON plumbing is dead on arrival** — Bug #4 above (`baseobj.js:306-307`): guards on never-present keys (`castShadow` singular, `recieveShadow` misspelled), calls nonexistent `this.setCastShadow`, and the receive branch sets the cast flag. **Remedy:** add both setters, fix key names, fix the second branch.

**C4. A worker error hangs the render forever** — `partrace.js:198-200` (`onError` only logs; never terminates/marks done), so `workersDone === workers.length` (`partrace.js:181`) can never be reached after any worker throw; the `try/catch` at `index.html:245-249` cannot catch async worker errors. Every worker-side crash (C2, malformed scene, missing keys) presents as a frozen progress bar. **Remedy:** on error, terminate the worker, finalize/abort the render, and surface the failure visibly in the UI.

### High

**C5. Per-miss `Intersection` allocation in the hottest loop** — `objects.js:12,69`: both `intersect()` methods allocate `new Partrace.Intersection(ray, this)` — six `vec4.create()` typed arrays — *before* the early miss test. Cost is O(objects × rays) including all shadow/reflect/refract rays; the single biggest GC-pressure source in the renderer. **Remedy:** run the scalar miss test first (working vars `this.wdst`/`this.wsp` already exist for this), allocate only on hit. Contrast with `camera.js` `makeCameraRay`, which already reuses pre-allocated vectors correctly.

**C6. Missing guards on `lights`/`materials`/`objects` in scene parsing** — `scene.js:215,234,264` read `.length` unconditionally while `camera`/`bg_color`/`fog` are all `if`-guarded. A user omitting any of the three keys in the textarea gets a worker `TypeError` → permanent hang (C4). **Remedy:** guard all three; validate scene shape before dispatching to workers.

**C7. Triplicated renderer class with drifted constants** — same finding as A2/A3; the epsilon drift (`0.001` vs `0.000001`) is the concrete cost already paid.

### Medium

**C8. `mat4.equals` used on two vec4s** — *verified* (`baseobj.js:217`): compares indices 0-15 on 4-element arrays; passes only because `undefined === undefined`. Use `vec4.equals` (exists at `parmath.js:82-84`).

**C9. `Intersection.clone()` constructs a `Ray`** — `ray.js:86-90`, copy-paste of `Ray.clone`. Currently unreferenced (latent). Fix to construct `Partrace.Intersection`.

**C10. `mergeStats` under-counts non-`rays` stats** — `partrace.js:226-242`: sets each key once from the first worker instead of accumulating (`rays` sub-object correctly uses `+=`). Aggregate stats panel shows one worker's value.

**C11. Progress redraw condition rarely fires** — `partrace.js:201-210`: `p % 20 === 0` on a float accumulated across workers is true only by coincidence; live preview redraw effectively depends on per-worker `'end'` events. Track a last-redrawn threshold (`Math.floor(p/20) > last`) instead.

**C12. Unconditional `String.prototype` monkey-patching** — `utils.js` unconditionally overwrites `trim` (etc.) that `parmath.js:32-44` had already guarded; all of `trim`/`startsWith`/`endsWith` have been native for a decade. Remove the redundant polyfills; keep only genuinely non-native helpers (`lpad`/`rpad`) if used.

**C13. No `'use strict'` anywhere + `arguments.callee` in `js/class.js:59`** — strict mode cannot be adopted incrementally without first replacing the Resig inheritance helper (it throws under strict mode). Relevant precondition for any ES-module migration (A4), since module code is automatically strict.

### Low
Blocking `alert(e)` as the only user-facing error UI (`index.html:247-249`) — route through `#log` instead; scattered commented-out debug lines (`partrace.js:73`, `scene.js:143`, `partrace-threaded.js:160`, `partrace-solo.js` various); terse math-notation variable names in `lights.js`/`scene.js` hot paths (acceptable idiom, lowest priority).

### Strengths
Consistent inheritance/object model across the whole scene graph; good pre-allocation discipline in the camera ray path; sensible worker parallelization design; clean data-driven scene configuration; `parmath.js` extensions are focused domain helpers, not a grab-bag.

---

## Documentation

### Critical

**D1. README is a one-line placeholder** (`# This is my README`, 20 bytes). Needs: what PARTrace is, browser requirements, the mandatory serve-over-HTTP instruction (workers + `importScripts` fail on `file://`), quick-start (`python3 -m http.server`), screenshot, scene-format pointer, license section.

**D2. Scene JSON format is undocumented** — the only reference is the commented example inside the `index.html` textarea (lines 83-204). It omits the `combiner` material, camera `focusBlurLevels`/`focusDist`, and gives no types/ranges/defaults/enums. The authoritative registry is the `setPropsFromJson` switches in `scene.js` (~220-285) plus `materials.js`/`lights.js`/`objects.js`/`camera.js`/`fog.js`. **Remedy:** `docs/SCENE_FORMAT.md` enumerating every type and field.

**D3. No LICENSE file** — despite vendored MIT code (`js/class.js`; `core-estimator.js` even cites a `LICENSE.md` that doesn't exist here). Add MIT `LICENSE` (user default) and reference it in the README.

### High

**D4. Worker protocol and `importScripts` load order undocumented** — the message contract (`partrace.js:104-197`) and the order-sensitive worker script list (`partrace-worker.js:2-22`; gl-matrix → shim → parmath must hold) have no written spec; both are change-landmines. Add a header comment in `partrace-worker.js` and a protocol docblock above `render`/`onMessage`.

**D5. Undocumented math layer** — `parmath.js` (246 lines, ~2 comments): custom `reflect`/`project`/`combine`/`anglePreservingMatrixInvert`/`createRotate` carry no formula/units/convention notes. Also worth one file-level line explaining its role atop the globals shim.

### Medium
No UI/controls doc (Z-buffer toggle, `localStorage` scene persistence are discoverable only by clicking); no architecture overview distinguishing solo/threaded/worker files (moot for `partrace-solo.js` if deleted per A3); one sentence needed somewhere on the Resig `Class.extend`/`_super` convention.

### Low
`images/` directory is empty — render the default scene for a README screenshot; a short docblock atop `intensityBlinnPhong` (`lights.js`) naming the algorithm stages; one-line comment on the `utils.js` console shim's purpose. Note: the `core-extimator` directory name is a consistent misspelling (works, but worth a line — or deletion per S4/A3).

### Strengths
`js/gl-matrix-globals.js` has a model header comment; `lights.js`/`ray.js` inline comments genuinely aid the shading math; the embedded example scene is a well-chosen runnable seed for real docs; vendored code retains upstream attribution.

---

## Tooling & Verification Gap (cross-cutting)

Zero automated checks exist: no `package.json`, ESLint, Prettier, type checking, tests, or Makefile (project standard requires `build`/`test`/`lint`/`fmt`/`typecheck`/`checkall` targets). Every confirmed bug in this report (`new new`, `this.with`, missing `setCastShadow`, `mat4.equals` misuse, undefined `setup`) is in the class that `no-undef`-grade linting or a trivial constructor smoke test catches mechanically. Minimum viable gate:

1. `package.json` + ESLint (browser + worker envs, `no-undef`, `no-dupe-keys`) — would flag most of the above.
2. A zero-dependency Node smoke test instantiating every registered scene type from its JSON name (catches A1-class bugs).
3. A Playwright render test (the harness already exists from the dependency-upgrade verification): click Render, assert lit pixels and zero console errors.
4. Makefile wiring these as `lint` / `test` / `checkall`; `npm audit`/`osv-scanner` in CI for the pinned CDN deps (S6 note: no tooling currently tracks future CVEs in the hand-pinned versions).

---

## Recommended Remediation Order

1. **Correctness bugs (verified, small diffs):** C1 ray aliasing → C2 Combiner double-fix → C3 shadow setters → C8 `vec4.equals` → `this.with` typo (Bug #5) → C10 mergeStats.
2. **Failure-mode + security fixes:** C4 worker-error recovery + C6 scene-key guards (turns hangs into visible errors); S1 XSS-safe logging; S2 SRI attributes; S3 CSP.
3. **Dead-weight removal:** A3/S4 — delete `partrace-solo.js`, `js/core-extimator/`, lodash tag (each a trivial, independent commit).
4. **Tooling:** the four-step minimum gate above — do this before any larger refactor.
5. **Structural (optional, larger):** A4 ES-module migration (supersedes A5, A6, A7, C12/C13 preconditions) → A1 type registry → A2 class dedup → A8 scene injection → C5 intersection allocation.
6. **Documentation:** D1 README + D3 LICENSE first; D2 scene format; D4/D5 protocol + math comments alongside whichever code they touch.
