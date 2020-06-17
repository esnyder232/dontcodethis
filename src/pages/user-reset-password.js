import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserResetPassword {
	controllerName = "UserResetPassword";

	username = "";
	password = "hello123!@#";
	passwordRepeat = "hello123!@#";
	resetMessage = "Verifying link...";
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
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/verifyResetPasswordToken", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.bVerified = true;
			this.username = responseData.data.username;
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.resetMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}

	resetPassword()
	{
		if(this.password !== this.passwordRepeat)
		{
			this.resetMessage = "Passwords do not match.";
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
			
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.resetMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}
}