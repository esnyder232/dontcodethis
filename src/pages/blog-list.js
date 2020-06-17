import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class BlogList {
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
		this.controllerName = "BlogList";
		this.list = [];

		this.bGetList = false;
	}

	activate(params) {
		this.params = params;
	}

	attached() {
		this.getList();
	}

	deactivate() {
		
	}

	getList()
	{
		var data = {
			pageNum: 0
		}

		this.bGetList = true;
		this.msgPageGeneral.clear();

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getList", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.list = responseData.data.list;
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgPageGeneral.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			this.bGetList = false;
		});
	}
}