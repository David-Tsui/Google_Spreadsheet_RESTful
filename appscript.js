var SCRIPT_PROP = PropertiesService.getScriptProperties(); 
var SHEET_NAME = "貨物進銷存";
var RECOGNIZE_COLUMN = {  /*驗證用欄位，可改成其他*/
  username: "姓名",
  password: "信箱"
};

var decodequery_obj = (function(d,x,params,pair,i) {
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
  return handleResponse(e, "get", e.parameter);
}

function doPost(e) {
  return handleResponse(e, "post");
}

function handleResponse(e, type, query_obj) {
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.

  try {
    if (Object.keys(query_obj).length > 0) {
      try {
        if (query_obj.query !== "" && query_obj.query !== [])
          query_obj = JSON.parse(query_obj.query);   
        else {
          return (
            ContentService
            .createTextOutput(JSON.stringify(
              {
                result: "error",
                type: type,
                reason: "Permission denied",
                event: e
              }
            ))
            .setMimeType(ContentService.MimeType.JSON)
          ); 
        }
      } catch(exception) { // query_obj.query == "text"
        query_obj = {};
      }
      Logger.log(query_obj);
      
      var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
      var sheet = doc.getSheetByName(SHEET_NAME);
      
      // we'll assume header is in row 1 but you can override with header_row in GET/POST data
      var start_row = e.parameter.start_row || 2; // if data has header, 2; if not, set 1.
      
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var lastRow = sheet.getLastRow();
      var nextRow = lastRow + 1; // get next row
      var ret = [];
      /******************************************************** GET ********************************************************/
      if (type == "get") {
        if (lastRow == 1) { // 試算表裡無內容，只有headers
          return (
            ContentService
            .createTextOutput(JSON.stringify(
              {
                result: "success",
                type: type,
                last_row: lastRow,
                output: ret,
                query: query_obj
              }
            ))
            .setMimeType(ContentService.MimeType.JSON)
          );
        }
        var row = sheet.getRange(start_row, 1, sheet.getLastRow() - 1, headers.length).getValues();
        
        if (isSelectSheet(query_obj)) {  // 抓取特定工作表，重抓當前資料內容
          SHEET_NAME = query_obj["SHEET_NAME"];
          sheet = doc.getSheetByName(SHEET_NAME);
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          lastRow = sheet.getLastRow();
          nextRow = lastRow + 1; // get next row
          row = sheet.getRange(start_row, 1, sheet.getLastRow() - 1, headers.length).getValues();   
        }
        if (isSelectColumn(query_obj) && isSelectData(query_obj)) {  // 指定欄位特定資料(return obj{} => specific rows and specific columns)
          var query_arr = query_obj["SELECT_DATA"];
          var column_arr = query_obj["SELECT_COLUMN"];
          var temp_arr = [];
          query_arr.forEach(function(query_obj) {
            var search_keys = [], search_columns = [];
            for(var key in query_obj) {        
              search_keys.push(query_obj[key]);
              search_columns.push(getThisColumn(key));
            }            
            temp_arr = getRowsByColumnValue(search_keys, search_columns);   
          });
          temp_arr.forEach(function(row_data_obj) {          
            var temp_obj = {};
            column_arr.forEach(function(col) {
              temp_obj[col] = row_data_obj[col];
            })            
            ret.push(temp_obj);
          })
        } else if (!isSelectColumn(query_obj) && isSelectData(query_obj)) {  // 特定資料(return obj{} => specific rows)
          var query_arr = query_obj["SELECT_DATA"];
          query_arr.forEach(function(query_obj) {
            var search_keys = [], search_columns = [];
            for(var key in query_obj) {        
              search_keys.push(query_obj[key]);
              search_columns.push(getThisColumn(key));
            }
            ret.push(getRowsByColumnValue(search_keys, search_columns));             
          });   
        } else if (isSelectColumn(query_obj) && !isSelectData(query_obj)) {  // 指定欄位全部資料(return array[] => all rows)         
          var column_arr = query_obj["SELECT_COLUMN"];
          var search_columns = [];
          column_arr.forEach(function(col) {        
            search_columns.push(getThisColumn(col));
          })
          ret = getValuesInColumns(search_columns);
        } else if (!isSelectColumn(query_obj) && !isSelectData(query_obj)) {  // 全部資料
          row.forEach(function(column) {
            var temp = {};
            column.forEach(function(element, index) {
              temp[headers[index]] = element
            })
            ret.push(temp);       
          })
        }   
        return (
          ContentService.createTextOutput(JSON.stringify(
            {
              result: "success", 
              type: type, 
              last_row: lastRow, 
              output: ret, 
              query: query_obj, 
              event: e      
            }
          ))
          .setMimeType(ContentService.MimeType.JSON)
        );
      }
      /****************************************************** POST ******************************************************/
      else if (type == "post") {
        var obj = e.parameter;
        var arr = [];
        var ret_row = isPostActualUpdate(obj); // 回傳是哪一row
        if (ret_row != -1) {
          var password_column = getThisColumn(RECOGNIZE_COLUMN.password);
          if (CheckInfoCorrespond(ret_row, password_column, obj[RECOGNIZE_COLUMN.password])) {
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
              .createTextOutput(JSON.stringify(
                {
                  result: "success",
                  type: "modify",
                  output: ret_obj
                }
              ))
              .setMimeType(ContentService.MimeType.JSON)
            );
          }
          else {
            return (
              ContentService
              .createTextOutput(JSON.stringify(
                {
                  result: "error",
                  type: "modify",
                  reason: "Authentication failed"
                }
              ))
              .setMimeType(ContentService.MimeType.JSON)
            );
          }
        }
        else {   
          headers.forEach(function(header) {
            if (header == "Timestamp" || header == "時間戳記"){ // 當要記錄操作時間，在後端生成date
              ret.push(new Date());
            } else { // 用各header找資料
              ret.push(e.parameter[header]);
            }
          })
          sheet.getRange(nextRow, 1, 1, ret.length).setValues([ret]); // insert the data
          return (
            ContentService
            .createTextOutput(JSON.stringify(
              {
                result: "success", 
                type: type, 
                last_row: lastRow, 
                insert: ret
              }
            ))
            .setMimeType(ContentService.MimeType.JSON)
          );
        }
      } 
    }
    return (
      ContentService
      .createTextOutput(JSON.stringify(
        {
          result: "error",
          type: type,
          reason: "Permission denied",
          event: e
        }
      ))
      .setMimeType(ContentService.MimeType.JSON)
    ); 
  } catch(e){
    return ContentService
          .createTextOutput(JSON.stringify(
            {
              result: "error",
              error: e
            }
          ))
          .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function isPostActualUpdate(obj) { // 以驗證欄位之「帳號」當作判斷，若POST之資料有同樣名稱則視為Update
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

function CheckInfoCorrespond(row, passswd_column, passwd) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var query_obj_passwd = sheet.getRange(row, passswd_column + 1, 1, 1).getValue(); // range座標以1開始
  if (query_obj_passwd == passwd)
    return true;
  else
    return false;
}

function getThisColumn(column_name) { // 回傳以0為首的column index
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for(var i = 0; i < headers.length; i++) {
    if (headers[i] == column_name) return i;
  }
  return -1;
}

/*function isQueryString(str) {
  if (str !== null) {
    var reg = new RegExp("(\\w+=[\\w\.]+)\&*", "gi");
    if (str.match(reg) !== null)
      return true;
  }
  return false;
}*/

function checkColumnValueCorrespond(vals, search_columns) {   // POST時使用，處理多項需要驗證的資料
  /*vals = ["2015/12/13"];
  search_columns = [3 - 1];*/
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row_datas = sheet.getDataRange().getValues();
  for(var i = 0; i < row_datas.length; i++) {
    var row_data = row_datas[i];
    var check = true; // 是否回傳的flag
    for(var j = 0; j < search_columns.length; j++) {
      var column = search_columns[j];
      if (row_data[column].toString() != vals[j].toString()) { // 若任一項不相符直接break
        check = false;
        break;
      }
    }
    if (check) {
      Logger.log(rowArrToObj(row_data));   
      return rowArrToObj(row_data); 
    }
  }
  return null;
}

function getRowObj(row_index) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var row_arr = sheet.getRange(row_index, 1, 1, sheet.getLastColumn()).getValues()[0];
  var ret_obj = rowArrToObj(row_arr);
  return ret_obj;
}

function rowArrToObj(row_arr) {
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var ret_obj = {};
  row_arr.forEach(function(ele, i) {
    ret_obj[headers[i]] = ele;
  })
  return ret_obj;
}

/* GET */
function isSelectSheet(query_obj) {  // 是否要選擇特定工作表
  for(var key in query_obj) {
    if (key == "SHEET_NAME")
      return true;
  }
  return false;
}

function isSelectColumn(query_obj) {  // 是否要選擇特定欄位
  for(var key in query_obj) {
    if (key == "SELECT_COLUMN")
      return true;
  }
  return false;
}

function isSelectData(query_obj) {  // 是否要選擇特定資料
  for(var key in query_obj) {
    if (key == "SELECT_DATA")
      return true;
  }
  return false;
}

function getRowsByColumnValue(vals, search_columns) {  // GET時使用
  /*vals = ["2015/12/13"];
  search_columns = [3 - 1];*/
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row_datas = sheet.getDataRange().getValues();
  var answers = [];
  for(var i = 0; i < row_datas.length; i++) {
    var row_data = row_datas[i];
    var check = true; // 是否回傳的flag
    for(var j = 0; j < search_columns.length; j++) {
      var column = search_columns[j];
      if (row_data[column].toString() != vals[j].toString()) { // 若任一項不相符直接break
        check = false;
        break;
      }
    }
    if (check) { // 全部符合才push
      answers.push(rowArrToObj(row_data)); 
    }
  }
  if (answers.length > 0) {
    return answers;
  }
  return null;
}

function getValuesInColumns(search_columns) { // 得到指定column的所有資料
  //search_columns = [6 - 1, 7 - 1];
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(SHEET_NAME);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var lastRow = sheet.getLastRow();
  var ret_obj = {}
  search_columns.forEach(function(col_index) { 
    var arr = [];
    for(var i = 2; i <= lastRow; i++) {
      var value = sheet.getRange(i, col_index + 1, 1, 1).getValue(); // 取各row的value
      arr.push(value);
    }
    var header = headers[col_index];
    ret_obj[header] = arr;
  })
  return ret_obj;
}

/* POST */

