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
		this.isUpdateAllowed = true;		
		this.action = "insert";

		this.key = "";
		this.isAttached = false;

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
		this.isUpdateAllowed = true;
		
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getDetails", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.isDirty = false;
			this.main = this.globalfuncs.getDataObject(responseData.data.main);
			this.details = this.globalfuncs.getDataObject(responseData.data.details);
			this.parameters = this.globalfuncs.getDataObject(responseData.data.parameters);

			console.log('details came back successful');
			console.log(this.main);
			console.log(this.details);
			console.log(this.parameters);

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

	saveRecord() {
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
			action: this.action
		};

		$.ajax({url: "./api/" + this.controllerName + "/getDetails", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.key = responseData.data.key;
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

	deleteRecord() {
		//warn the user
		var answer = window.confirm("Are you sure you want to delete this record?");

		this.action = "delete";

		var data = {
			main: JSON.stringify(this.main),
			action: this.action
		};

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/saveDetails", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.key = "";
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