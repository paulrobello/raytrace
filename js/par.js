//trimming space from both side of the string
String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g,"");
}
 
//trimming space from left side of the string
String.prototype.ltrim = function() {
  return this.replace(/^\s+/,"");
}
 
//trimming space from right side of the string
String.prototype.rtrim = function() {
  return this.replace(/\s+$/,"");
}

//pads left
String.prototype.lpad = function(padString, length) {
  var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}
 
//pads right
String.prototype.rpad = function(padString, length) {
  var str = this;
    while (str.length < length)
        str = str + padString;
    return str;
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
        var iCount = 0;
        $.each(oData, function() {
            iCount++;
            return;
        });
        if (iCount == 0) { // object is empty
            return "{}";
        }
        var sHTML = "{";
    }

    // loop through items
    var iCount = 0;
    $.each(oData, function(sKey, vValue) {
      try{
        if (iCount > 0) {
            sHTML += ",";
        }
        if (sDataType == "array") {
            sHTML += ("\n" + sIndent + sIndentStyle);
        } else {
            sHTML += ("\n" + sIndent + sIndentStyle + "\"" + sKey + "\"" + ": ");
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
                sHTML += ("\"" + vValue + "\"");
                break;
            default:
                sHTML += ("TYPEOF: " + typeof(vValue));
        }

        // loop
        iCount++;
        }catch(e){}
    });

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
    $.each(oData, function(sKey) {
        aSortArray.push(sKey);
    });
    aSortArray.sort(SortLowerCase);

    // create new data object
    $.each(aSortArray, function(i) {
        if (RealTypeOf(oData[(aSortArray[i])]) == "object" ) {
            oData[(aSortArray[i])] = SortObject(oData[(aSortArray[i])]);
        }
        oNewData[(aSortArray[i])] = oData[(aSortArray[i])];
    });

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
