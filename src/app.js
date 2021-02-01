import {inject} from 'aurelia-framework';
import {PLATFORM} from 'aurelia-pal';
import {GlobalFuncs} from 'global-funcs';

@inject(GlobalFuncs)
export class App {
	constructor(GlobalFuncs){
		this.globalfuncs = GlobalFuncs;
		
		this.controllerName = "App"
		this.routes = [];
		this.currentPage = 1;
		this.pageSize = 2;
		this.totalItems = 1;
		this.navbar = [];
		this.isMobile = false;
		this.siteHeaderRef = null;
		this.showHamburgerMenu = false;
		this.hamburgerMenuContainerRef = null;
	}

	activate() {
	}

	attached() {
		window.addEventListener('resize', () => {return this.checkIfMobile();});
		this.checkIfMobile();
	}

	detached() {
		window.removeEventListener('resize', () => {return this.checkIfMobile();});
	}

	checkIfMobile()
	{
		if(window.innerWidth <= 600)
		{
			this.isMobile = true;
		}
		else
		{
			this.isMobile = false;
		}
	}

	configureRouter(config, router) {
		config.title = "Dont Code This";

		this.config = config;
		this.router = router;
		this.globalfuncs.appRouter = this.router;

		return $.ajax({url: "./api/" + this.controllerName + "/initializeApp", method: "GET"})
		.done((responseData, textStatus, xhr) => {
			
		})
		.fail((xhr) => {
			
		})
		.always((a, textStatus, c) => {
			var xhr = this.globalfuncs.alwaysGetXhr(a, textStatus, c);
			var responseData = xhr.responseJSON;

			this.routes = this.globalfuncs.getDataArray(responseData.data.routes);
			this.navbar = this.globalfuncs.getDataArray(responseData.data.navbar);
			this.userdata = this.globalfuncs.getDataObject(responseData.data.userdata);
			
			//store userdata in global funcs so other pages can use it
			this.globalfuncs.userdata = this.userdata;

			this.fillAppRouter();
		});
	}

	//this should be called after the routes are grabbed from the database. This fills in the app router's routes
	fillAppRouter() {
		try {
			for(var i = 0; i < this.routes.length; i++)
			{
				var temp = {
					route: this.routes[i].txt_route_url,
					moduleId: PLATFORM.moduleName(this.routes[i].module_full_path),
					name: this.routes[i].txt_module_name
				};
				this.router.addRoute(temp);
			}
		}
		catch(ex) {
			console.log('Very bad error occured in addRoutes(): ' + ex);
			console.log(ex.stack);
		}
	}

	logout()
	{
		//send the api request
		$.ajax({url: "./api/" + this.controllerName + "/logout", method: "POST"})
		.done((responseData, textStatus, xhr) => {
			this.globalfuncs.refreshSite("user-login");
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

	toggleHamburgerMenu() {
		this.showHamburgerMenu = !this.showHamburgerMenu;

		//calculate hamburger menu position
		if(this.showHamburgerMenu)
		{
			this.hamburgerMenuContainerRef.style.top = this.siteHeaderRef.offsetHeight + "px";
			this.hamburgerMenuContainerRef.style.left = 0 + "px";
		}
	}

	closeHamburgerMenu() {
		this.showHamburgerMenu = false;
	}

	navbarItemClicked(navbarItem)
	{
		//navigate to internal module
		if(!navbarItem.b_external)
		{
			this.router.navigateToRoute(navbarItem.txt_module_name);
		}
		//navigate to external link in new window
		else
		{
			window.open(navbarItem.txt_ext_url);
		}
	}

	navbarItemClickedMobile(navbarItem)
	{
		//navigate to internal module
		if(!navbarItem.b_external)
		{
			this.router.navigateToRoute(navbarItem.txt_module_name);
		}
		//navigate to external link in new window
		else
		{
			window.open(navbarItem.txt_ext_url);
		}
		
		this.showHamburgerMenu = false;
	}
}
