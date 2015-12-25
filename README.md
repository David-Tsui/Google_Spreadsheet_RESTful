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

1. select all data at default sheet(just mentioned above)

  ```javascript
  var query_obj = {} | [] | "string";
  ```

   Well, just pass something which is not null :D

	 If ajax success, it returns: 

  ```javascript
  [
    {
      header1: "something",
      header2: 123
    },
    {
      header1: "something",
      header2: 123
    },
    /*
    .
    .
    .
    */
    {
			header1: "something",
			header2: 123
		}
  ]
  ```

2. select some row by specific column
 
	 ```javascript
	 var query_obj = {
		 SELECT_COLUMN: [
			 "name", "age" 
		 ]
	 };
	 ``` 

3.
