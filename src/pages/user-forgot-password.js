import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserForgotPassword {
	username = "esnyder";
	controllerName = "UserForgotPassword";
	forgotMessage = "";

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}

	forgotPassword()
	{
		var data = {
			username: this.username
		}

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/forgotPassword", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.forgotMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}
}