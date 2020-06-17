import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserForgotUsername {
	email = "esnyder232@gmail.com";
	controllerName = "UserForgotUsername";
	forgotMessage = "";

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}

	forgotUsername()
	{
		var data = {
			email: this.email
		}

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/forgotUsername", method: "POST", data: data})
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