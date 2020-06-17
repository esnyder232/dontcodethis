import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserCreate {
	controllerName = "UserCreate";

	username = "esnyder";
	email = " esnyder232@gmail.com";
	password = "hello123!@#";
	passwordRepeat = "hello123!@#";
	registerMessage = "";

	isSaving = false;

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
	}

	createUser()
	{
		if(this.password !== this.passwordRepeat)
		{
			this.registerMessage = "Passwords do not match.";
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
			
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.registerMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}
}