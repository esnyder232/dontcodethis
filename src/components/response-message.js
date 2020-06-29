import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class ResponseMessageCustomElement {
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
		this.message = "";
		this.messageClass = "hide";
	}
	
	messageSuccess(msg) {
		if(msg == "" || !msg)
		{
			msg = "Success";
		}
		this.message = msg;
		this.messageClass = "messageSuccess";
	}

	messageError(msg) {
		if(msg == "" || !msg)
		{
			msg = "Error";
		}
		this.message = msg;
		this.messageClass = "messageError";
	}

	clear() {
		this.message = "";
		this.messageClass = "hide";
	}

}