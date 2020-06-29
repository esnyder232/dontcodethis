import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserVerification {
	controllerName = "UserVerification";
	isSaving = false;

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}

	activate(params) {
		this.params = params;
	}

	attached() {
		this.verifyUser();
	}

	verifyUser()
	{
		this.msgPageGeneral.messageSuccess("Verifying user account...");
		var data = {
			token: this.params.token
		}

		this.isSaving = true;
		
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/verifyUser", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.msgPageGeneral.messageSuccess(responseData.userMessage);
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
}