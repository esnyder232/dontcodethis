import {inject} from 'aurelia-framework';
import {GlobalFuncs} from 'global-funcs';
import moment from 'moment';

@inject(GlobalFuncs)
export class BlogDetails {
	constructor(GlobalFuncs) {
		this.globalfuncs = GlobalFuncs;
		this.controllerName = "BlogDetails"
		
		this.key = "";

		this.main = {};
		this.comments = [];
		this.clientComment = {};
		this.userdata = {};

		this.bGetBlog = false;
		this.bGetComments = false;
		this.bSaveComment = false;

		this.msgGetBlog = null;
		this.msgGetComments = null;
		this.msgSaveComment = null;
	}
	
	activate(params)
	{
		this.params = params;
		this.key = this.params.id;
		this.userdata = this.globalfuncs.getUserdataCopy();
		
		//prefill in stuff in submit comment
		this.initializeSubmitComment();
	}

	attached()
	{
		//if there isn't an id, just renavigate back to the blog list
		if(!this.key)
		{
			this.globalfuncs.appRouter.navigateToRoute("blog-list");
		}
		else
		{
			this.getDetails();
			this.getComments();
		}
	}


	getDetails()
	{
		var data = {
			key: this.key
		};

		this.msgGetBlog.clear();
		this.bGetBlog = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getDetails", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.main = this.globalfuncs.getDataObjectFromArray(responseData.data.main, 0);
			this.blogBodyDivRef.innerHTML = this.main.txt_body;
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgGetBlog.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			this.bGetBlog = false;
		});
	}

	getComments() {
		var data = {
			key: this.key
		};
		
		this.msgGetComments.clear();
		this.bGetComments = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/getComments", method: "GET", data: data})
		.done((responseData, textStatus, xhr) => {
			this.comments = this.globalfuncs.getDataArray(responseData.data.comments, 0);
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgGetComments.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			this.bGetComments = false;
		});
	}


	saveComment() {
		this.clientComment.commentBody = this.clientComment.commentBody;

		var data = {
			key: this.key,
			clientComment: JSON.stringify(this.clientComment)
		};

		this.msgSaveComment.clear();
		this.bSaveComment = true;

		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/saveComment", method: "POST", data: data})
		.done((responseData, textStatus, xhr) => {
			this.msgSaveComment.messageSuccess(responseData.userMessage);
			this.initializeSubmitComment();
			this.getComments();
		})
		.fail((xhr) => {
			var responseData = this.globalfuncs.getDataObject(xhr.responseJSON);
			this.msgSaveComment.messageError(responseData.userMessage);
		})
		.always((a, textStatus, c) => {
			this.bSaveComment = false;
		});
	}

	initializeSubmitComment() {
		this.clientComment = {};
		if(this.userdata.bLoggedIn)
		{
			this.clientComment.commentUsername = this.userdata.username;
		}
	}

	appendSuccessMessage(divRef, msg) {

	}

}