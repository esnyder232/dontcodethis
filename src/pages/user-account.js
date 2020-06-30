import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserAccount {
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
		this.controllerName = "UserAccount";
		this.isSaving = false;
		this.isDirty = false;
		this.main = {};

		this.userdata = this.globalfuncs.userdata;
	}

	activate(params) {
		this.params = params;
		this.main = {};
	}
	
	attached() {
		this.getDetails();
	}

	getDetails()
	{
		this.isSaving = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getDetails", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.isDirty = false;
			this.main = this.globalfuncs.getDataObject(responseData.data.main, 0);
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgPageGeneral.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.isSaving = false;
		});
	}


	saveDetails() {
		//calculate the action
		this.action = "update";
		
		if(this.main.password && this.main.password != this.main.passwordRepeat)
		{
			this.msgPageGeneral.messageError("Passwords do not match.");
			return;
		}

		var data = {
			main: JSON.stringify(this.main),
			action: this.action
		};

		this.isSaving = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/saveDetails", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.msgPageGeneral.messageSuccess(responseData.userMessage);
			this.getDetails();
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgPageGeneral.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.isSaving = false;
		});
	}

	deleteDetails() {

		this.action = "delete";

		var data = {
			main: JSON.stringify(this.main),
			action: this.action
		};

		this.isSaving = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/saveDetails", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.globalfuncs.refreshSite("user-deleted");
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgPageGeneral.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.isSaving = false;
		});
	}

	detailsChanged() {
		this.isDirty = true;
		this.msgPageGeneral.messageSuccess('Changes detected. Click "Save Changes" to apply.')
	}

	checkForEnter(e) {
		if (e.keyCode == 13) {//enter key
			this.saveDetails();
			return false;
		}
		return true;
	}
}