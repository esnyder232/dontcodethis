import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserVerification {
	controllerName = "UserVerification";
	verifyMessage = "Verifying user account...";
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
		var data = {
			token: this.params.token
		}

		this.isSaving = true;
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/verifyUser", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.verifyMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}
}