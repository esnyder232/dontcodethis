import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';
import {activationStrategy} from 'aurelia-router';

@inject(GlobalFuncs)
export class StockheimerEventTool {
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
		this.controllerName = "StockheimerEventTool";
		
		this.list = [];
		this.main = {};
		this.details = [];
		this.parameters = [];
		this.parameterCodes = [];
		this.isUpdateAllowed = true;		
		this.action = "insert";

		this.key = "";
		this.isAttached = false;
		this.isSaving = false;
		this.isExporting = false;
		this.exportedData = "";

		this.pageSize = 20;
	}

	activate(params) {
		this.params = params;
		this.key = this.params.id;

		if(this.isAttached)
		{
			this.getList();
			this.getDetails();
		}
	}
	
	attached() {
		this.isAttached = true;

		this.getList();
		this.getDetails();
	}

	deactivate() {
	}

	detached() {
	}

	getList()
	{
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getList", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.list = this.globalfuncs.getDataArray(responseData.data.list);
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgPageList.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			this.isSaving = false;
		});
	}


	getDetails()
	{
		var data = {
			uid: this.key
		};

		console.log('getting details...')
		this.main = {};
		this.details = [];
		this.parameters = [];
		this.parameterCodes = [];
		this.isUpdateAllowed = true;
		
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getDetails", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.isDirty = false;
			this.main = this.globalfuncs.getDataObject(responseData.data.main);
			this.details = this.globalfuncs.getDataObject(responseData.data.details);
			this.parameters = this.globalfuncs.getDataObject(responseData.data.parameters);
			this.parameterCodes = this.globalfuncs.getDataArray(responseData.data.parameterCodes);

			console.log('details came back successful');
			console.log(this.main);
			console.log(this.details);
			console.log(this.parameters);
			console.log(this.parameterCodes);

			this.isUpdateAllowed = this.main.is_update_allowed;
			console.log(this.isUpdateAllowed)
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgPageDetails.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			this.isSaving = false;
		});


	}

	listClicked(record) {
		this.globalfuncs.appRouter.navigateToRoute("stockheimer-event-tool", {id: record.uid});
		this.key = record.uid;
		this.getDetails();
	}

	newRecord() {
		this.globalfuncs.appRouter.navigateToRoute("stockheimer-event-tool", {id: ""});
		this.key = "";
		this.getDetails();
	}

	parameterCodeActualDataTypeChanged(parameter) {
		var code = this.parameterCodes.find((x) => {return x.txt_actual_data_type == parameter.txt_actual_data_type;});
		if(code)
		{
			parameter.min_value = code.min_value;
			parameter.max_value = code.max_value;
			parameter.i_bits = code.i_bits;
		}
		else
		{
			parameter.min_value = null;
			parameter.max_value = null;
			parameter.i_bits = null;
		}
	}

	saveRecord() {		
		//check for required fields
		var result = this.checkRequired();

		if(result && !this.isSaving)
		{
			console.log('now saving...');
			this.msgPageDetails.messageSuccess("Saving...");
			this.isSaving = true;

			//calculate the action
			if(this.main.uid)
			{
				this.action = "update";
			}
			else
			{
				this.action = "insert";
			}

			var data = {
				main: JSON.stringify(this.main),
				details: JSON.stringify(this.details),
				parameters: JSON.stringify(this.parameters),
				action: this.action
			};

			$.ajax({url: "./api/" + this.controllerName + "/saveDetails", method: "POST", data: data})
			.done((responseData, textStatus, xhr) => {
				this.key = responseData.data.key;
				this.msgPageDetails.messageSuccess(responseData.userMessage);

				this.globalfuncs.appRouter.navigateToRoute("stockheimer-event-tool", {id: this.key});

				this.getList();
				this.getDetails();
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
				this.msgPageDetails.messageError(responseData.userMessage);
			})
			.always((a, textStatus, c) => {
				this.isSaving = false;
			});

		}
	}

	checkRequired() {
		var result = true;

		var allRequiredFields = $("input[required]");
		for(var i = 0; i < allRequiredFields.length; i++)
		{
			if(!allRequiredFields[i].value)
			{
				$(allRequiredFields[i]).focus();
				result = false;
				break;
			}
		}

		return result;
	}

	deleteRecord() {
		//warn the user
		var answer = window.confirm("Are you sure you want to delete this record?");

		if(answer && !this.isSaving)
		{
			this.action = "delete";

			this.msgPageDetails.messageSuccess("Deleting...");
			this.isSaving = true;

			var data = {
				main: JSON.stringify(this.main),
				details: JSON.stringify(this.details),
				parameters: JSON.stringify(this.parameters),
				action: this.action
			};

			//send the api request
			$.ajax({url: "./api/" + this.controllerName + "/saveDetails", method: "POST", data: data})
			.done((responseData, textStatus, xhr) => {
				this.key = "";
				this.msgPageDetails.messageSuccess(responseData.userMessage);

				this.globalfuncs.appRouter.navigateToRoute("stockheimer-event-tool", {id: ""});
				
				this.getList();
				this.getDetails();
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
				this.msgPageDetails.messageError(responseData.userMessage);
			})
			.always((a, textStatus, c) => {
				var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
				var responseData = xhr.responseJSON;
				this.isSaving = false;
			});
		}
	}

	addDetailsRow(parent, customJson) {
		var r = {
			is_dirty: true,
			uid: null,
			record_action: 'I'
		}

		if(customJson)
		{
			for (var key in customJson) {
				if (customJson.hasOwnProperty(key)) {
					r[key] = customJson[key];
				}
			}
		}
		parent.push(r);

		return r;
	}

	deleteDetailsRow(parent, r) {
		r.is_dirty = true;
		if(r.uid)
		{
			if(r.record_action == "U")
			{
				r.record_action = "D";
			}
			else if(r.record_action == "D")
			{
				r.record_action = "U";
			}
		}
		else 
		{
			var index = parent.indexOf(r);
			if(index >= 0)
			{
				parent.splice(index, 1);
			}
		}
	}

	deleteDetailsRowGrandchild(grandParent, parent, r)
	{
		this.deleteDetailsRow(parent, r);
		grandParent.is_dirty = true;
	}


	dirtyRecord(n) {
		n.is_dirty = true;
	}

	dirtyRecordGrandchild(parent, child) {
		child.is_dirty = true;
		parent.is_dirty = true;
	}

	addEventParametersDetailsRow(event) {
		this.addDetailsRow(event.parameters);
		event.is_dirty = true;
	}

	addParametersDetailsRow() {
		var customJson = {
			min_value: null,
			max_value: null,
			i_bits: null
		}

		if(this.parameterCodes.length > 0)
		{
			customJson.min_value = this.parameterCodes[0].min_value;
			customJson.max_value = this.parameterCodes[0].max_value;
			customJson.i_bits = this.parameterCodes[0].i_bits;
		}

		this.addDetailsRow(this.parameters, customJson);
	}

	exportRecord() {

		if(!this.isExporting)
		{
			var data = {
				main: JSON.stringify(this.main)
			};

			this.isExporting = true;

			this.msgPageExport.messageSuccess("Exporting...");

			$.ajax({url: "./api/" + this.controllerName + "/exportDetails", method: "POST", data: data})
			.done((responseData, textStatus, xhr) => {
				console.log('esxport returned');
				console.log(responseData.data.main)

				this.exportedData = JSON.stringify(responseData.data.main);
				this.msgPageExport.messageSuccess(responseData.userMessage);
			})
			.fail((xhr) => {
				var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
				this.msgPageExport.messageError(responseData.userMessage);
			})
			.always((a, textStatus, c) => {
				this.isExporting = false;			
			});
		}
	}
}