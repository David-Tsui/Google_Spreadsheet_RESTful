var SHEET_NAME = "Sheet1";
var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

function doGet(e) {
  return handleResponse(e, "get", e.queryString);
}

function doPost(e) {
  return handleResponse(e, "post");
}

function handleResponse(e, type, check) {
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  type = type || "none";
  check = check || "bad";
  try {
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(SHEET_NAME);
    var start_row = e.parameter.start_row || 2; // if data has header, 2; if not, set 1.
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1; // get next row
    var ret = [];

    if (type == "get" && check != "bad") {      
      var row = sheet.getRange(start_row, 1, sheet.getLastRow() - 1, headers.length).getValues();
      row.forEach(function(column) {
        var temp = {};
        column.forEach(function(element, index) {
          temp[headers[index]] = element
        })
        ret.push(temp);       
      })
      return (
        ContentService.createTextOutput(JSON.stringify({"result":"success", "type": type, "row": nextRow, "output": ret}))
        .setMimeType(ContentService.MimeType.JSON)
      );
    }
    else if (type == "post") {
      // loop through the header columns
      headers.forEach(function(header) {
        if (header == "Timestamp"){ // special case if you include a 'Timestamp' column
          ret.push(new Date());
        } else { // else use header name to get data
          ret.push(e.parameter[header]);
        }
      })
      // more efficient to set values as [][] array than individually
      sheet.getRange(nextRow, 1, 1, ret.length).setValues([ret]); // insert the data
      // return json success results
      return (
        ContentService.createTextOutput(JSON.stringify({"result":"success", "type": type, "row": nextRow, "insert": ret}))
        .setMimeType(ContentService.MimeType.JSON)
      );
    }
    else {
      return (
        ContentService.createTextOutput(JSON.stringify({"result":"error", "type": type, "reason": "Permission denied"}))
        .setMimeType(ContentService.MimeType.JSON)
      ); 
    }
  } catch(e){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  SCRIPT_PROP.setProperty("key", doc.getId());
}