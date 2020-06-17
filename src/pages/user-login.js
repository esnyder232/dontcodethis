import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserLogin {
	username = "esnyder";
	password = "hello123!@#";
	controllerName = "UserLogin";
	loginMessage = "";
	apiMessage = "";
	bRememberMe = "";

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;

		this.userdata = this.globalfuncs.userdata;
	}

	login()
	{
		var data = {
			username: this.username,
			password: this.password,
			bRememberMe: this.bRememberMe
		}

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/login", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.globalfuncs.refreshSite();
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.loginMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}




	getPublicApi()
	{
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/publicApi", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.apiMessage = JSON.stringify(responseData.data);
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.loginMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}

	
	getPrivateApi()
	{
		var data = {};
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/secureApi", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.apiMessage = JSON.stringify(responseData.data);
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.loginMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}
}