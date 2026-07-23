# Audit Remediation Report

> **Project:** PARTrace JS (`/docker/pardev/data/raytrace`)
> **Audit Date:** 2026-07-22 (see `AUDIT.md`, baseline commit `9121836`)
> **Remediation Date:** 2026-07-22
> **Severity Filter Applied:** all (full remediation, including the audit's "optional, larger" structural work)
> **Branch:** `fix/audit-remediation` (base `f515ba4`)

---

## Execution Summary

| Phase | Status | Agent | Issues Targeted | Resolved | Partial | Manual |
|-------|--------|-------|-----------------|----------|---------|--------|
| 1 — Tooling foundation | ✅ | orchestrator (inline) | Tooling gap | 1 | 0 | 0 |
| 2 — Core JS correctness/security/quality | ✅ | fix-code-quality | C1–C13, Bug#5, S1, A5 + 2 latent | 18 | 0 | 0 |
| 3 — index.html security + dead code | ✅ | fix-architecture | S2, S3, S4, A3 | 6 | 0 | 0 |
| 4 — ES-module migration (structural) | ✅ | fix-architecture | A1, A4, A6, A7, C13-strict, A2, A5 | 8 | 0 | 0 |
| 5 — Documentation | ✅ | fix-documentation | D1–D5 + Medium + Low | 8 | 0 | 0 |
| 6 — Verification | ✅ | orchestrator (inline) | — | — | — | — |

**Overall:** 42 issues resolved, 0 partial, 0 deferred, 0 skipped.

**Commits** (on `fix/audit-remediation`):
- `b5da92f` build: add ESLint gate, Makefile, and headless test harness
- `5961671` fix(security): harden index.html and remove dead code (S2/S3/S4/A3)
- `d1f558e` fix: resolve core correctness, failure-mode, and quality bugs (C1-C13)
- `e493c2a` refactor: migrate to native ES modules (A4) + type registry (A1)
- `889ade4` docs: README, LICENSE, scene-format + architecture docs (D1-D5)
- (+ screenshot-at-native-size chore)

---

## Resolved Issues ✅

### Security
- **[S1]** (High) DOM-XSS via unescaped scene strings reaching `$("#log").prepend()` — `partrace.js` `Partrace.log` now prepends a `<br>` element + a text node (never builds HTML from data). The `FormatJSON` leaf-string escape path lived in `js/par.js`, which was deleted as dead code (zero callers — see A5); the sole live sink is now safe.
- **[S2]** (Medium) CDN assets lacked SRI — `integrity="sha384-…"` + `crossorigin="anonymous"` added to all three kept cdnjs tags (jQuery UI CSS, jQuery, jQuery UI). Hashes recomputed and independently verified.
- **[S3]** (Medium) No Content-Security-Policy — `_headers` (Cloudflare Pages / Netlify) now carries `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, and a real CSP. The CSP's `script-src 'self' https://cdnjs.cloudflare.com` has **no `unsafe-inline`** — feasible only after Phase 4 externalized the inline bootstrap to `js/main.js`.
- **[S4]** (Medium) Vendored PNaCl `core-extimator` with opaque binary — entire `js/core-extimator/` tree (incl. `cores.pexe`) deleted, its script tag and the `navigator.getHardwareConcurrency` branch removed. `navigator.hardwareConcurrency` is universal; the controller already falls back to `|| 2`.

### Architecture
- **[A1]** (Critical) String-keyed factory switches that shipped a crash (Bug #2) — replaced the three hand-typed `switch`/`new` blocks in `Scene.setPropsFromJson` with JSON-type registries (`Partrace.LIGHT_TYPES` / `MATERIAL_TYPES` / `OBJECT_TYPES`) built in one place (`js/registry.js`). The `new new Combiner` bug class is now structurally impossible; a smoke test instantiates every registered type.
- **[A2]** (High) Three classes all named `Partrace` — the dead `partrace-solo.js` was deleted; the remaining two (main controller `partrace.js`, worker renderer `partrace-threaded.js`) are realm-separated by the Worker boundary and now carry file-header comments documenting that invariant.
- **[A3]** (High) Dead code shipped/loaded — deleted `partrace-solo.js`, `js/core-extimator/`, the lodash CDN tag (zero call sites), and the dead `js/par.js` + `utils.js` (zero callers).
- **[A4]** (High) No module system; dependency graph hand-encoded twice — migrated to native ES modules. The browser resolves the import graph from `import` statements; no bundler, no second load list. Module worker (`new Worker(url,{type:'module'})`), externalized bootstrap (`js/main.js`).
- **[A5]** (High) Worker-imported `js/par.js` depended on jQuery — `js/par.js` was dead (zero callers) and deleted; the concern is moot.
- **[A6]** (Medium) gl-matrix globals shim — deleted `js/gl-matrix-globals.js`, `js/gl-matrix-min.js`, `parmath.js`. Math now flows through `js/vecmath.js` (imports gl-matrix ESM vendored at `js/lib/gl-matrix/`, shallow-copies the non-extensible namespaces, re-attaches the custom extensions). No global pollution.
- **[A7]** (Medium) One inconsistent relative path — worker is now root-relative (`/partrace-worker.js`), consistent with the rest of the app.
- **[Low]** `utils.js` misleading name — file deleted (obsolete console shim).

### Code Quality
- **[C1]** (Critical) Child rays aliased and corrupted the parent ray's `p`/`d` — child rays now constructed with `vec4.clone(ray.p)`/`vec4.clone(ray.d)` at the reflect + refract call sites in `scene.js`. Verified by the headless render's two-light reflective/refractive scene.
- **[C2]** (Critical) Combiner doubly broken — removed the duplicate `new` (`scene.js`) and appended `.d` in `Combiner.getAttrs` (`materials.js`). The smoke test (which instantiates a combiner) is now green.
- **[C3]** (Critical) Shadow-flag JSON plumbing dead — added `setCastShadows`/`setReceiveShadows` setters, corrected the JSON keys (`castShadows`/`receiveShadows`), and fixed the swapped receive branch (`baseobj.js`).
- **[C4]** (Critical) A worker error hung the render forever — `onError` now resolves the failing worker, terminates it, marks it done, and finalizes (copies the partial buffer, surfaces "Render aborted"). No more permanent freeze.
- **[C5]** (High) Per-miss `Intersection` allocation in the hottest loop — `Sphere`/`Plane.intersect` run the scalar miss test first and allocate the `Intersection` only on a confirmed hit. Semantics preserved (ray count unchanged at 35120).
- **[C6]** (High) Unguarded `lights`/`materials`/`objects` keys — each loop is now `if`-guarded so omitting a key no longer throws (and no longer cascades into the C4 hang).
- **[C7]** (High) Triplicated renderer with drifted constants — resolved via A2/A3 (solo deleted; epsilon drift gone with it).
- **[C8]** (Medium) `mat4.equals` used on two vec4s — swapped to `vec4.equals`.
- **[C9]** (Medium) `Intersection.clone` constructed a `Ray` — now constructs `Partrace.Intersection`.
- **[C10]** (Medium) `mergeStats` under-counted non-rays stats — scene-global counts (`objects`/`lights`) taken once; all other top-level stats accumulate.
- **[C11]** (Medium) Progress redraw rarely fired — replaced `p % 20 === 0` (float modulo) with a `Math.floor(p/20) > lastRedrawn` threshold.
- **[C12]** (Medium) Unconditional `String.prototype` monkey-patching — redundant native polyfills removed (the host files were later deleted entirely).
- **[C13]** (Medium) `arguments.callee` blocked strict mode — `Class.extend` is now a named function self-reference. Strict mode is now active app-wide (ES modules are strict by default), which surfaced and let us fix one more latent bug (below).
- **[Low]** Blocking `alert(e)` → routed through `Partrace.log`; commented-out debug lines removed. (Terse math-notation names in hot paths left as acceptable idiom.)

### Latent bugs discovered and fixed during remediation (not in the original audit)
- **`String.prototype.explode` was called (`partrace-threaded.js` `vToVec4`) but defined nowhere** — the string-form-vector path (`"position":"1,2,3"`) was silently broken. Replaced with native `split`, locked in with a regression assertion in the smoke test.
- **`att` implicit global in `lights.js`** — assigned without `var`; survived only because classic scripts are sloppy mode. Strict ESM (C13) surfaced it as `ReferenceError`; declared `var att;`.
- **[Bug #5]** `this.with` typo (`objects.js`) → `this.width` (plane width-bounding).

### Documentation
- **[D1]** (Critical) README placeholder — replaced with a full README (pitch, screenshot, browser reqs, mandatory serve-over-HTTP, quick-start, scene/architecture pointers, dev commands, license).
- **[D2]** (Critical) Scene JSON undocumented — `docs/SCENE_FORMAT.md` enumerates every type/field/enum/default, verified against the registry + `setPropsFromJson` sources, with the full default scene.
- **[D3]** (Critical) No LICENSE — MIT LICENSE added (Copyright (c) 2026 Paul Robello).
- **[D4]** (High) Worker protocol undocumented — protocol-reference docblock above `onMessage` + summary in `docs/ARCHITECTURE.md` (both directions; `onError` finalize behavior).
- **[D5]** (High) Math layer undocumented — formula/convention comments on the six custom `vecmath.js` helpers.
- **[Medium]** Architecture overview — `docs/ARCHITECTURE.md` (two-realm flow + module-graph Mermaid, namespace pattern, `Class.extend`, row partitioning, vecmath). *(UI/controls discovery is covered prose-style in the README rather than a dedicated doc.)*
- **[Low]** Empty `images/` — `images/screenshot.png` generated by rendering the default scene headlessly (`make screenshot`); Blinn-Phong docblock added to `lights.js`.

### Tooling (the cross-cutting gap)
ESLint gate, Makefile (`build`/`test`/`lint`/`fmt`/`typecheck`/`checkall`/`screenshot`/`serve`), and a dependency-free Node headless test harness: a smoke test that instantiates every registered scene type (catches A1/C2-class factory crashes) and a render test that drives a full two-light reflective/refractive render and asserts no throw + rays > 0 + `end` posted. `npm audit` clean.

---

## Requires Manual Intervention 🔧

### [A8] Hidden singleton coupling: `Partrace.scene` — RESOLVED
- **Change:** Removed the realm-global `Partrace.scene` singleton (the assignment in `partrace-threaded.js`). Named material references in `CheckerMat`, `Combiner`, and `MaterialObj` are now stored as raw name strings during `setPropsFromJson`, then resolved in a single linking pass at the end of `Scene.setPropsFromJson`, which calls a new `resolveRefs(scene)` hook (no-op on `BaseObj`, overridden where named refs exist) over every material and object once the full scene graph is registered.
- **Side fix:** The old parse-time lookup ran during reverse-order `i--` parsing, so a referrer that preceded its referent in the JSON array silently received a null reference (forward-reference bug). The post-parse pass resolves forward references correctly — verified by new `smoke-types` assertions on `m_checkermat`/`m_combiner`, whose refs were null under the old code.
- **No behavioral change to the default scene:** its `checkermat` refs already resolved under the old favorable ordering, so decoupling them is output-identical — the screenshot baseline holds at 977,513 rays.

### Browser-runtime verification gap — RECOMMENDED FOLLOW-UP
- **Why:** The Node harness + module-graph resolution checks verify the **worker render chain** (the majority of the code) and prove the import graph is a sound DAG. They do **not** exercise the browser's `<script type="module">` load, the module-Worker spawn, or CSP enforcement (no chromium available in this environment). The migration uses only standard, well-trodden module mechanics and the graph is proven to resolve, so risk is low — but headless browser confidence would be higher.
- **Recommended approach:** Add a Playwright smoke test (serve the dir, open the page, click **Render**, assert lit canvas pixels + zero console errors). The screenshot harness already proves the render path; this would close the browser-loading gap.
- **Estimated effort:** small.

---

## Verification Results

- **Build:** ✅ N/A — static assets, no build step (`make build` is a no-op echo).
- **Lint:** ✅ Pass — **0 errors**, 26 warnings (all pre-existing: unused interface params, intentional `var` re-declarations, the deliberate `stats→log` fallthrough, the Resig `xyz` fnTest trick).
- **Tests:** ✅ Pass — `smoke-types` (1 light, 5 materials, 2 objects, string-form vectors) + `headless-render` (90 rows, 35120 rays, `end` posted).
- **Type Check:** ✅ N/A — plain JavaScript, no type system (`make typecheck` echoes this).
- **Module graphs:** ✅ both `partrace-worker.js` and `partrace.js` resolve cleanly in Node (no bad paths, missing exports, or cycles).
- **Screenshot:** ✅ 800×600, 977,513 rays — matches the audit's original "977k rays" baseline (independent cross-check that the render path is intact end to end).
- **Security:** ✅ 3 SRI hashes (independently recomputed), CSP active, `npm audit` 0 vulnerabilities.
- **Residual audit-class issues:** ✅ none — grep sweep found no `importScripts`, no deleted-file references, no `new new`, no `this.with`, no `arguments.callee`, no `alert(`.

**Coverage caveat (honest):** the headless harness exercises the *worker render chain* and *module-graph resolution*, which covers the C1/C2/C3/C5/C6/C8/C9/A1 fixes functionally. The main-thread controller fixes (C4/C10/C11/S1 in `partrace.js`) and the browser bootstrap (`index.html` / `js/main.js` / module-Worker loading) are verified by **code inspection + lint + graph resolution**, not by an automated browser test (see follow-up above).

---

## Files Changed

55 files changed, +9924 / −1183 (net). The insertion count is dominated by the vendored gl-matrix ESM source (`js/lib/gl-matrix/`, ~7.7k lines) and `package-lock.json`; the application-logic delta is modest.

**Added:** `LICENSE`, `Makefile`, `package.json`, `package-lock.json`, `.eslintrc.json`, `.eslintignore`, `_headers`, `js/main.js`, `js/registry.js`, `js/vecmath.js` (renamed from `parmath.js`), `js/lib/gl-matrix/*` (vendored ESM), `docs/ARCHITECTURE.md`, `docs/SCENE_FORMAT.md`, `images/screenshot.png`, `tests/{loader,smoke-types,headless-render,render-screenshot}.js`.

**Modified:** `index.html`, `README.md`, `partrace.js`, `partrace-threaded.js`, `partrace-worker.js`, `scene.js`, `materials.js`, `objects.js`, `lights.js`, `baseobj.js`, `ray.js`, `camera.js`, `fog.js`, `js/class.js`, `.gitignore`.

**Deleted:** `partrace-solo.js`, `utils.js`, `js/par.js`, `parmath.js` (→ `js/vecmath.js`), `js/gl-matrix-min.js`, `js/gl-matrix-globals.js`, `js/core-extimator/` (entire tree, incl. the `cores.pexe` binary).

---

## Next Steps

1. **Review** the remaining `Requires Manual Intervention` item: the **Playwright browser smoke test** (A8 scene injection is now resolved).
2. **Merge** `fix/audit-remediation` to `main` after review (each phase is an independent rollback point).
3. **Re-run `/audit`** to regenerate `AUDIT.md` against the remediated state (expected: the verified bugs and tooling/documentation gaps cleared; no remaining Medium architecture items).
4. *(Optional)* tighten the ESLint `no-undef`/`no-unused-vars` rules from `warn` to `error` now that the codebase is module-structured — left at `warn` during remediation so the gate stayed green on the legacy style.
