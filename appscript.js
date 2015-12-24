var SCRIPT_PROP = PropertiesService.getScriptProperties(); 
var SHEET_NAME = "Sheet1";
var RECOGNIZE_COLUMN = {  /*驗證用欄位，可改成其他*/
  username: "name",
  password: "email"
};

var decodeQueryString = (function(d,x,params,pair,i) {
  return function (qs) {
    params = {};
    qs = qs.substring(qs.indexOf('?')+1).replace(x,' ').split('&');
    for (i = qs.length; i > 0;) {
      pair = qs[--i].split('=');
      params[d(pair[0])] = d(pair[1]);
    }
    return params;
  };
})(decodeURIComponent, /\+/g);

function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  SCRIPT_PROP.setProperty("key", doc.getId());
}

function doGet(e) {
  return handleResponse(e, "get", e.queryString);
}

function doPost(e) {
  return handleResponse(e, "post");
}

function handleResponse(e, type, check) {
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  check = check || "Authentication failed";
  
  try {
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(SHEET_NAME);
    
    // we'll assume header is in row 1 but you can override with header_row in GET/POST data
    var start_row = e.parameter.start_row || 2; // if data has header, 2; if not, set 1.
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1; // get next row
    var ret = [];

    if (type == "get" && check != "Authentication failed") {
      if (lastRow == 1) // 只有headers
        return (
          ContentService
          .createTextOutput(JSON.stringify({"result":"success", "type": type, "row": lastRow, "output": ret, "query": decode_obj}))
          .setMimeType(ContentService.MimeType.JSON)
        );
      var row = sheet.getRange(start_row, 1, sheet.getLastRow() - 1, headers.length).getValues();
      var testString = e.queryString;    
      if (isQueryString(testString)) { /* 有querystring代表是查詢指令，轉換為obj後搜索試算表 */
        var decode_obj = decodeQueryString(testString);
        var obj_keys = Object.keys(decode_obj);
        if (obj_keys.length == 1 && obj_keys[0] == "SHEET_NAME") {
          /* 只是要抓不同sheet的所有data */
          SHEET_NAME = decode_obj[obj_keys[0]];
          sheet = doc.getSheetByName(SHEET_NAME);
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          lastRow = sheet.getLastRow();
          nextRow = lastRow + 1; // get next row
          row = sheet.getRange(start_row, 1, sheet.getLastRow() - 1, headers.length).getValues();   
        } else {
          var search_keys = [], search_columns = [];
          var check = false;
          for(var key in decode_obj) {        
            search_keys.push(decode_obj[key]);
            search_columns.push(getThisColumn(key));
          }
          ret.push(searchValue(search_keys, search_columns));
          return (
            ContentService
            .createTextOutput(JSON.stringify({"result":"success", "type": type, "row": lastRow, "output": ret, "query": decode_obj}))
            .setMimeType(ContentService.MimeType.JSON)
          );
        }
      }
      row.forEach(function(column) {
        var temp = {};
        column.forEach(function(element, index) {
          temp[headers[index]] = element
        })
        ret.push(temp);       
      })
      return (
        ContentService
        .createTextOutput(JSON.stringify({"result":"success", "type": type, "row": lastRow, "output": ret}))
        .setMimeType(ContentService.MimeType.JSON)
      );
    }
    else if (type == "post") {
      var obj = e.parameter;
      var arr = [];
      var ret_row = CheckPostIsActualModify(obj); // 回傳是哪一row
      if (ret_row != -1) {
        var password_column = getThisColumn(RECOGNIZE_COLUMN.password);
        if (checkInfoCorrespond(ret_row, password_column, obj[RECOGNIZE_COLUMN.password])) {
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
            sheet.getRange(ret_row, arr[i], 1, 1).setValue(obj[key]);
          }
          var ret_obj = getRowObj(ret_row);
          return (
            ContentService
            .createTextOutput(JSON.stringify({"result":"success", "type": "modify", "output": ret_obj}))
            .setMimeType(ContentService.MimeType.JSON)
          );
        }
        else {
          return (
            ContentService
            .createTextOutput(JSON.stringify({"result":"error", "type": "modify", "reason": "Authentication failed"}))
            .setMimeType(ContentService.MimeType.JSON)
          );
        }
      }
      else {   
        headers.forEach(function(header) {
          if (header == "Timestamp"){ // special case if you include a 'Timestamp' column
            ret.push(new Date());
          } else {                    // else use header name to get data
            ret.push(e.parameter[header]);
          }
        })
        // more efficient to set values as [][] array than individually
        sheet.getRange(nextRow, 1, 1, ret.length).setValues([ret]); // insert the data
        return (
          ContentService
          .createTextOutput(JSON.stringify({"result":"success", "type": type, "row": nextRow, "insert": ret}))
          .setMimeType(ContentService.MimeType.JSON)
        );
      }
    }
    return (
      ContentService
      .createTextOutput(JSON.stringify({"result":"error", "type": type, "reason": "Permission denied", "event": e}))
      .setMimeType(ContentService.MimeType.JSON)
    ); 
  } catch(e){
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function CheckPostIsActualModify(obj) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var rows = sheet.getLastRow();
  var columns = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var name_column = getThisColumn(RECOGNIZE_COLUMN.username);
  if (name_column != -1) {
    for(var i = 1; i <= rows; i++) {
      var value = sheet.getRange(i, name_column + 1, 1, 1).getValue(); // range的座標從1開始
      if (value == obj[RECOGNIZE_COLUMN.username]) {
        return i; // 回傳該row
      }
    }
  }
  return -1; // 找不到
}

function checkInfoCorrespond(row, passswd_column, passwd) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var check_passwd = sheet.getRange(row, passswd_column + 1, 1, 1).getValue(); // range座標以1開始
  if (check_passwd == passwd)
    return true;
  else
    return false;
}

function getThisColumn(column_name) { // 回傳以0為首的column index
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for(var i = 0; i < headers.length; i++) {
    if (headers[i] == column_name) {
      return i;
    }
  }
  return -1;
}

function isQueryString(str) {
  if (str !== null) {
    var reg = new RegExp("(\\w+=[\\w\.]+)\&*", "gi");
    if (str.match(reg) !== null)
      return true;
  }
  return false;
}

function searchValue(vals, search_columns) { // 處理多項需要驗證的資料
  //vals = ["崔家華", "st88021@gmail.com"];
  //search_columns = [1, 2];
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getDataRange().getValues();
  for(var i = 0; i < values.length; i++) {
    var rowData = values[i]; // 一次抓一列
    var check = false; // 是否回傳的flag
    search_columns.forEach(function(col, j) { // 全部符合才是true
      if (rowData[col] == vals[j]) {
        check = true;
        //Logger.log(row);    
      } else {
        check = false;
      }
    })
    if (check) {
      return rowToObj(rowData); 
    }
  }
  return null;
}

function getRowObj(row) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var row_arr = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var ret_obj = rowToObj(row_arr);
  return ret_obj;
}

function rowToObj(row_arr) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var ret_obj = {};
  row_arr.forEach(function(ele, i) {
    ret_obj[headers[i]] = ele;
  })
  return ret_obj;
}