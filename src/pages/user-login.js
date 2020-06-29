import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class UserLogin {
	username = "";
	password = "";
	controllerName = "UserLogin";
	bRememberMe = "";

	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
		this.isSaving = false;
		this.userdata = this.globalfuncs.userdata;
	}

	login()
	{
		var data = {
			username: this.username,
			password: this.password,
			bRememberMe: this.bRememberMe
		}

		this.msgPageGeneral.clear();
		this.isSaving = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/login", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.globalfuncs.refreshSite("home");
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

	gotoForgotUsername() {
		this.globalfuncs.appRouter.navigateToRoute('user-forgot-username')
	}

	gotoForgotPassword() {
		this.globalfuncs.appRouter.navigateToRoute('user-forgot-password')
	}

	gotoCreateUser() {
		this.globalfuncs.appRouter.navigateToRoute('user-create')
	}
}