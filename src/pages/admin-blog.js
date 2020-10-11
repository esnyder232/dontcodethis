import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';
import {activationStrategy} from 'aurelia-router';

@inject(GlobalFuncs)
export class AdminBlog {
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
		this.controllerName = "AdminBlog";
		this.adminMessage = "";
		
		this.list = [];
		this.details = [];
		this.main = {};
		this.action = "insert";

		this.editor_id = '#tinyBody';
		this.key = "";
		this.isAttached = false;

		this.pageSize = 20;
	}

	activate(params) {
		this.params = params;
		this.main = {};

		this.key = this.params.id;

		if(this.isAttached)
		{
			tinymce.init({
				selector: '#tinyBody',
				plugins: ['paste', 'link', 'image', 'table']
			}).then((editor) => {
				this.mytiny = editor;
			});

			this.getList();
			this.getDetails();
		}
	}
	
	attached() {
		this.isAttached = true;

		tinymce.init({
			selector: '#tinyBody',
			plugins: ['paste', 'link', 'image', 'table']
		}).then((editor) => {
			this.mytiny = editor;
		});

		this.getList();
		this.getDetails();
	}

	deactivate() {
		tinymce.remove('#tinyBody');
	}

	detached() {
		tinymce.remove('#tinyBody');
	}

	getList()
	{
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getList", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			this.list = this.globalfuncs.getDataArray(responseData.data.list);
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.adminMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}


	getDetails()
	{
		var data = {
			uid: this.key
		};
		
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getDetails", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.main = this.globalfuncs.getDataObject(responseData.data.main, 0);
			this.setTinyBody();
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.adminMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}

	listClicked(record) {
		this.globalfuncs.appRouter.navigateToRoute("admin-blog", {id: record.uid});
	}

	newRecord() {
		if(this.key)
		{
			this.globalfuncs.appRouter.navigateToRoute("admin-blog", {id: ""});
		}
		else
		{
			this.getDetails();
		}
		
	}

	saveRecord() {
		this.getTinyBody();

		//calculate the action
		if(this.main.uid)
		{
			this.action = "update";
		}
		else
		{
			this.action = "insert";
		}

		var data = {
			main: JSON.stringify(this.main),
			action: this.action
		};

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/saveDetails", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.key = responseData.data.key;
			this.getList();
			this.getDetails();
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.adminMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}

	deleteRecord() {
		this.getTinyBody();

		this.action = "delete";

		var data = {
			main: JSON.stringify(this.main),
			action: this.action
		};

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/saveDetails", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.key = "";
			this.getList();
			this.getDetails();
		})
		.fail((xhr) => {

		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;
			this.adminMessage = responseData.userMessage;
			this.isSaving = false;
		});
	}

	setTinyBody() {
		window.setTimeout(() => {
			var temp = tinymce.get('tinyBody')
			temp.setContent(this.main.txt_body);
		}, 100)
	}

	getTinyBody(){
		var temp = tinymce.get('tinyBody').getContent();
		this.main.txt_body = temp;
		this.previewDiv.innerHTML = temp;
	}
}