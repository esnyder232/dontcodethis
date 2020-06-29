export class GlobalFuncs {
	appRouter = null;
	constructor(){};

	navToBlog(id, slug) {
		this.appRouter.navigateToRoute("blog-details", {id: id, slug: slug});
	}

	//This is for the jquery.ajax.always() function.
	//If the ajax call is "done" (meaning the ajax response is 200), then the a = responseJSON, textStatus = "success" and the c = xhr.
	//If the ajax call is "fail" (meaning the ajax response is 400 or 500), then the a = xhr, textStatus = "error" and the c = errorDetails (usually "Internal Server Error").
	//Not sure why they decided to that in Jquery, but whatever.
	alwaysGetXhr(a, textStatus, c) {
		var xhr = null;
		if(textStatus == "success")
		{
			xhr = c;
		}
		else
		{
			xhr = a;
		}
		return xhr
	}

	//if the object is an array, it returns it. Otherwise, it returns a blank array.
	getDataArray(arr) {
		return Array.isArray(arr) ? arr : [];
	}

	//if the object is a json object, it returns it. Otherwise it returns a blank object.
	getDataObject(obj) {
		return typeof obj === 'object' ? obj : {};
	}

	//this gets the specific object from the data array. Returns a blank object otherwise.
	getDataObjectFromArray(arr, i) {
		var result = {};

		if(Array.isArray(arr) && arr.length > i)
		{
			result = arr[i];
		}

		return result;
	}


	//called usually after a person logs in/out
	refreshSite(route) {
		if(route)
		{
			this.appRouter.navigateToRoute(route);
		}
		else
		{
			window.location = "./";
		}
		
		location.reload();
	}

	//returns a copy of the userdata (so we don't bind everything to the globalfunc's userdata object)
	getUserdataCopy(){
		return JSON.parse(JSON.stringify(this.userdata));
	}
	
}