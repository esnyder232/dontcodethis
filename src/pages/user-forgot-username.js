import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserForgotUsername {
	email = "";
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

		this.isSaving = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/forgotUsername", method: "POST", data: data})
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
			console.log('response data:')
			console.log(responseData);
			this.isSaving = false;
		});
	}

	checkForEnter(e) {
		if (e.keyCode == 13) {//enter key
			this.forgotUsername();
			return false;
		}
		return true;
	}
}