import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserCreate {
	controllerName = "UserCreate";

	username = "";
	email = "";
	password = "";
	passwordRepeat = "";
	isSaving = false;

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}

	createUser()
	{
		this.msgPageGeneral.clear();
		if(this.password !== this.passwordRepeat)
		{
			this.msgPageGeneral.messageError("Passwords do not match.");
			return;
		}

		var data = {
			email: this.email,
			username: this.username,
			password: this.password
		}

		this.isSaving = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/createUser", method: "POST", data: data})
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

	checkForEnter(e) {
		if (e.keyCode == 13) {//enter key
			this.createUser();
			return false;
		}
		return true;
	}
}