//  1. Enter sheet name where data is to be written below
var SHEET_NAME = "Sheet1";
        
//  2. Run > setup
//
//  3. Publish > Deploy as web app 
//    - enter Project Version name and click 'Save New Version' 
//    - set security level and enable service (most likely execute as 'me' and access 'anyone, even anonymously) 
//
//  4. Copy the 'Current web app URL' and post this in your form/script action 
//
//  5. Insert column names on your destination sheet matching the parameter names of the data you are passing in (exactly matching case)

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

// If you don't want to expose either GET or POST methods you can comment out the appropriate function
function doGet(e) {
  return handleResponse(e, "get", e.queryString);
}

function doPost(e) {
  return handleResponse(e, "post");
}

function handleResponse(e, type, check) {
  /*e = {
    姓名: "崔家華",
    信箱: "st880221@gmail.com",
  Avatar: 123,
  Github: 321,
  Demopage: 123,
  Info: "test"
  };*/
  // shortly after my original solution Google announced the LockService[1]
  // this prevents concurrent access overwritting data
  // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
  // we want a public lock, one that locks for all invocations
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  type = type || "none";
  check = check || "bad";
  try {
    // next set where we write the data - you could write to multiple/alternate destinations
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(SHEET_NAME);
    
    // we'll assume header is in row 1 but you can override with header_row in GET/POST data
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
      var obj = e.parameter;
      var arr = [];
      if (CheckPostIsActualModify(obj) != -1) {
        var ret_row = CheckPostIsActualModify(obj);
        var email_column = getEmailColumn();
        if (checkInfoCorrespond(ret_row, email_column, obj["信箱"])) {
          for(var key in obj) {
            for(var i = 0; i < headers.length; i++) {
              if (key == headers[i]) {
                arr.push(i + 1);
                break;
              }
            }
          }
          var keys = Object.keys(obj);
          for(var i = 0; i < keys.length; i++) {
            var key = keys[i];
            sheet.getRange(temp_row, arr[i], 1, 1).setValue(obj[key]);
          }
          return (
            ContentService.createTextOutput(JSON.stringify({"result":"success", "type": "modify"}))
            .setMimeType(ContentService.MimeType.JSON)
          );
        }
        else {
          return (
            ContentService.createTextOutput(JSON.stringify({"result":"error", "type": "modify", "reason": "Authentication failed"}))
            .setMimeType(ContentService.MimeType.JSON)
          );
        }
      }
      else {   
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


function CheckPostIsActualModify(obj) {
  /*obj = {
    姓名: "崔家華",
    信箱: "st880221@gmail.com",
  Avatar: 123,
  Github: 321,
  Demopage: 123,
  Info: "test"
  };*/
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var rows = sheet.getLastRow();
  var columns = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var name_column = getNameColumn();
  
  for(var i = 2; i <= rows; i++) {
    var value = sheet.getRange(i, name_column, 1, 1).getValue();
    if (value == obj["姓名"]) {
      return i;
    }
  }
  return -1; // 找不到
}

function checkInfoCorrespond(row, email_column, email) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var true_email = sheet.getRange(row, email_column, 1, 1).getValue();
  if (true_email == email)
    return true;
  else
    return false;
}

function getNameColumn() {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for(var i = 0; i < headers.length; i++) {
    if (headers[i] == "姓名") return i + 1;
  }
  return -1;
}

function getEmailColumn() {
   var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for(var i = 0; i < headers.length; i++) {
    if (headers[i] == "信箱") return i + 1;
  }
  return -1;
}