# Google_Spreadsheet_RESTful
Easy and flexible to get data from spreadsheet and post data to it. Ajax only, no hidden iframe, no need a google form, the data explosure doGet() has been eliminated.

##**How To Build the environment**

1. Open a google spreadsheet, open the App Script editor, name your worksheet "Sheet1"(later you can modify it)

2. Open a project, then paste the appscript.js into a blank .gs file.

3. Save it, choose the function "setup" to run.

4. Publish > Deploy as web app > Enter Project Version name and click 'Save New Version'.

6. Set security level "anyone, even anonymously" and enable service.

7. Copy the application url, which is the url used by ajax.

##**Essential Settings
The global variable "SHEET_NAME" must correspond to an exist sheet; however, it can switch to another after using
the api.

##**APIs
The usage of **GET** with ajax

`$.get(api, {query: JSON.stringify(your_query)}, function(){});`

1. select all data at default sheet(just mentioned above)
   → 

2.

3.



##**Notice:**

When using ajax "get", you should add a querystring(any string) as parameter, this give you a authority to do get.
Otherwise, you will get nothing.
