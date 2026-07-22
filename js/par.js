function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function logIt(msg){
  if (typeof console === 'undefined') return;
  console.log(msg);
}

function logJSON(obj){
  logIt(FormatJSON(obj,"  ",0, 2));
}

function FormatJSON(oData, sIndent, depth, maxDepth) {
    if (depth>=maxDepth) return "";
    if (arguments.length < 2) {
        var sIndent = "";
    }
    var sIndentStyle = "    ";
    var sDataType = RealTypeOf(oData);

    // open object
    if (sDataType == "array") {
        if (oData.length == 0) {
            return "[]";
        }
        var sHTML = "[";
    } else {
        if (Object.keys(oData).length === 0) { // object is empty
            return "{}";
        }
        var sHTML = "{";
    }

    // loop through items
    var iCount = 0;
    var keys = (sDataType == "array") ? null : (function () {
        var arr = [];
        for (var k in oData) arr.push(k);
        return arr;
    })();
    var keysLen = keys ? keys.length : oData.length;
    for (var ki = 0; ki < keysLen; ki++) {
        var sKey = keys ? keys[ki] : ki;
        var vValue = oData[sKey];
      try{
        if (iCount > 0) {
            sHTML += ",";
        }
        if (sDataType == "array") {
            sHTML += ("\n" + sIndent + sIndentStyle);
        } else {
            sHTML += ("\n" + sIndent + sIndentStyle + "\"" + escapeHTML(sKey) + "\"" + ": ");
        }

        // display relevant data type
        switch (RealTypeOf(vValue)) {
            case "array":
            case "object":
                sHTML += FormatJSON(vValue, (sIndent + sIndentStyle), depth+1, maxDepth);
                break;
            case "boolean":
            case "number":
                sHTML += vValue.toString();
                break;
            case "null":
                sHTML += "null";
                break;
            case "string":
                sHTML += ("\"" + escapeHTML(vValue) + "\"");
                break;
            default:
                sHTML += ("TYPEOF: " + typeof(vValue));
        }

        // loop
        iCount++;
        }catch(e){}
    }

    // close object
    if (sDataType == "array") {
        sHTML += ("\n" + sIndent + "]");
    } else {
        sHTML += ("\n" + sIndent + "}");
    }

    // return
    return sHTML;
}

function SortObject(oData) {
    var oNewData = {};
    var aSortArray = [];

    // sort keys
    for (var sk in oData) {
        aSortArray.push(sk);
    }
    aSortArray.sort(SortLowerCase);

    // create new data object
    for (var i = 0; i < aSortArray.length; i++) {
        if (RealTypeOf(oData[(aSortArray[i])]) == "object" ) {
            oData[(aSortArray[i])] = SortObject(oData[(aSortArray[i])]);
        }
        oNewData[(aSortArray[i])] = oData[(aSortArray[i])];
    }

    return oNewData;

    function SortLowerCase(a,b) {
        a = a.toLowerCase();
        b = b.toLowerCase();
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    }
}

function RealTypeOf(v) {
  if (typeof(v) == "object") {
    if (v === null) return "null";
    if (v.constructor == (new Array).constructor) return "array";
    if (v.constructor == (new Date).constructor) return "date";
    if (v.constructor == (new RegExp).constructor) return "regex";
    return "object";
  }
  return typeof(v);
}
