import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserResetPassword {
	controllerName = "UserResetPassword";

	username = "";
	password = "";
	passwordRepeat = "";
	bVerified = false;
	isSaving = false;

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}

	activate(params) {
		this.params = params;
	}

	attached() {
		this.verifyResetPasswordToken();
	}

	verifyResetPasswordToken() {
		var data = {
			token: this.params.token
		}

		this.isSaving = true;
		this.msgPageGeneral.messageSuccess("Verifying link...");

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/verifyResetPasswordToken", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.bVerified = true;
			this.username = responseData.data.username;
			this.msgPageGeneral.clear();
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

	resetPassword()
	{
		this.msgPageGeneral.clear();
		if(this.password !== this.passwordRepeat)
		{
			this.msgPageGeneral.messageError("Passwords do not match.");
			return;
		}

		var data = {
			username: this.username,
			password: this.password,
			token: this.params.token
		}

		this.isSaving = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/resetPassword", method: "POST", data: data})
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
			this.resetPassword();
			return false;
		}
		return true;
	}
}