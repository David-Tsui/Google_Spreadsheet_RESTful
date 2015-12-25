# Google_Spreadsheet_RESTful
Easy and flexible to get data from spreadsheet and post data to it. Ajax only, no hidden iframe, no need a google form, the data explosure doGet() has been eliminated.

##Build the Environment

1. Open a google spreadsheet, open the App Script editor, name your worksheet "Sheet1"(later you can modify it)

2. Open a project, then paste the appscript.js into a blank .gs file.

3. Save it, choose the function "setup" to run.

4. Publish > Deploy as web app > Enter Project Version name and click 'Save New Version'.

6. Set security level "anyone, even anonymously" and enable service.

7. Copy the application url, which is the url used by ajax.

##Essential Settings
The global variable "SHEET_NAME" must correspond to an exist sheet; however, it can switch to another after using
the api.

##APIs provided
Use the file "appscript.js"
The usage of **GET** with ajax

```javascript
$.get(api, {query: JSON.stringify(query_obj)}, function(response){ /*stmt*/ });
```

```javascript
var query_obj = {
  SHEET_NAME: "sheetname",
  SELECT_DATA: [
    {
      header1: "something",
      header2: value
    },
    {
      header1: "something",
      header2: value
    },
    {
      header1: "something",
      header2: value
    }
  ],
  SELECT_COLUMN: [
    "header1", "header2", "header3"
  ]
}
```

#####1. select all data at default sheet(just as mentioned above)

  ```javascript
  var query_obj = {} | [] | "string";
  ```

   _Well, just pass something which is not null :D_

   

  ```javascript
  // If ajax success, it returns
  [
    {
      header1: "aaa",
      header2: 1
    },
    {
      header1: "bbb",
      header2: 2
    },
    {
      header1: "ccc",
      header2: 3
    }
    // and so on
  ]
  ```

#####2. select some row by specific column
 
  ```javascript
  var query_obj = {
    SELECT_COLUMN: [
      "name", "age" 
    ]
  };

  // If ajax success, it returns
  [
    {
      name: "David",
      age: 22
    },
    {
      name: "Lisa",
      age: 17
    },
    {
      name: "Peter",
      age: 38
    }
    // and so on
  ]
  ``` 

#####3. select some row by specific data
 
  ```javascript
  var query_obj = {
    SELECT_DATA: [
      {
        date: "2015/12/25",
        payment: "7-11"
      }
    ]
  };

  // If ajax success, it returns
  [
    {
      date: "2015/12/25",
      customer: "John",
      post_num: "11008",
      address: "臺北市信義區市府路1號",
      phone: "0227208889",
      payment: "7-11"
    },
    {
      date: "2015/12/25",
      customer: "Hugo",
      post_num: "40701",
      address: "臺中市西屯區臺灣大道三段99號",
      phone: "0910289111",
      payment: "7-11"
    },
    {
      date: "2015/12/25",
      customer: "Michael",
      post_num: "80203",
      address: "高雄市苓雅區四維三路2號",
      phone: "886-7-3368333",
      payment: "7-11"
    }
    // and so on
  ]
  ``` 

#####4. select some row by specific data and specific column
 
  ```javascript
  var query_obj = {
    SELECT_DATA: [
      {
        date: "2015/12/25",
        payment: "7-11"
      }
    ],
    SELECT_COLUMN: ["customer", "phone"]
  };

  // If ajax success, it returns
  [
    {
      customer: "John",
      phone: "0227208889",
    },
    {
      customer: "Hugo",
      phone: "0910289111",
    },
    {
      customer: "Michael",
      phone: "886-7-3368333",
    }
    // and so on
  ]
  ``` 

#####5. Switch sheet

  ```javascript
  var query_obj = {
    SHEET_NAME: "anotherSheet"
  };
  ```

#####6. Combination

  ```javascript
  var query_obj = {
    SHEET_NAME: "anotherSheet",
    SELECT_DATA: [
      {
        height: 165,
        weight: 80
      }
    ],
    SELECT_COLUMN: ["name", "id", "parents"]
  };
  ```