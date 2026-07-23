// Main-realm entry. Loaded via <script type="module" src="/js/main.js">.
// Externalized from index.html's inline bootstrap so a strict script-src CSP
// (no 'unsafe-inline') is feasible (audit S3). jQuery ($) stays a global loaded
// via CDN <script> in index.html; it is available before this module runs
// because module scripts are deferred and execute after the parsed <script> tags.
import { Partrace } from '../partrace.js';
var partrace = null;
function saveContent(dataurl, fileName) {
  var link = document.createElement('a');
  link.download = fileName;
  link.href = dataurl;
  link.click();
}
$(document).ready(function () {
  $("#render").button().button("disable");
  console.log("Native Cores", navigator.hardwareConcurrency);
  $("#render").button("enable");
  partrace = new Partrace("canvas");
  $("#progress").progressbar();
  $("#reset").button().click(function () {
    $('#form')[0].reset();
  });
  $("#save").button().click(function () {
    saveContent($("#canvas")[0].toDataURL(), 'img.png');
  });
  $("#render").click(function () {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem('scene', $('#script').val());
    }
    $("#log").empty();
    try {
      partrace.render(JSON.parse($("#script").val().replace(/(\#.*)/g, '')));
    } catch (e) {
      if (Partrace.log) {
        Partrace.log('Render error: ' + (e && e.message ? e.message : e));
      } else {
        console.error(e);
      }
    }
  });
  $(".buffer").click(function () {
    if ($(this).val() === 'color') {
      partrace.copyColorToScreen();
    } else {
      partrace.copyZToScreen();
    }
  });
  if (typeof localStorage !== "undefined") {
    var scn = localStorage.getItem('scene');
    if (scn) $('#script').val(scn);
  }
});
