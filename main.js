$(document).ready(function() {
	var api = "https://script.google.com/macros/s/AKfycbzhD3DQW2KHNs0Uy7N1XWAxVYbzoWrlCCL9whxbZKGB_t-iicI/exec"
	$("#mysubmit").click(function() {
		var getFieldValue = function(fieldName) { 
	    return $('.ui.form').form('get value', fieldName);
	  };
		var formData = {
	    姓名: getFieldValue('姓名'),
	    尺寸: getFieldValue('尺寸'),
	    金額: getFieldValue('金額')
	  };
		$.post(api, formData).done(function(ret) {
			console.log(ret);
		},'json')
	});
	$("#myGet").click(function() {
		$.get(api, "get", function(data) {
			console.log(data);
		})
	})
})