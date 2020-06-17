const bcrypt = require('bcrypt');
const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const crypto = require('crypto');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class AppController {

	constructor() {
		
	}

	async initializeApp(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var clientUserdata = {};

		try {
			userdata = req.userdata;
			sco = await db.connect();
			
			//get aurelia app routes and nav bar so the site will load
			if(!bError)
			{
				sqlStr = `
				select r.uid, r.txt_module_name, r.txt_module_dir || '/' || r.txt_module_name as module_full_path, coalesce(u.txt_route_url, r.txt_module_name) as txt_route_url
				from (
					select *
					from route 
					where i_delete_flag is null
					and coalesce(b_admin, false) = false
				
					union all
				
					select *
					from route
					where i_delete_flag is null
					and b_admin = true
					and $(b_is_admin) = true
				) r
				left join route_urls u on r.txt_module_name = u.txt_module_name
				order by r.uid, u.uid;

				select r.uid, r.txt_module_name, n.txt_display_name, n.i_order
				from (
					select *
					from route 
					where i_delete_flag is null
					and coalesce(b_admin, false) = false
					
					union all
					
					select *
					from route
					where i_delete_flag is null
					and b_admin = true
					and $(b_is_admin) = true
				) r
				inner join navbar n on r.txt_module_name = n.txt_module_name and n.i_delete_flag is null
				order by n.i_order;
				`;
	
				sqlParams = {
					b_is_admin: userdata.bAdmin
				}
	
				sqlData = await sco.multi(sqlStr, sqlParams);

				if(sqlData.length > 0)
				{
					data.routes = sqlData[0];
					data.navbar = sqlData[1];
				}
				else
				{
					bError = true;
					userMessage = "Error when initializing app. Could not get app routes.";
				}
			}

			//return userdata as well
			if(!bError)
			{
				if(userdata.bLoggedIn)
				{
					clientUserdata = {
						username: userdata.username,
						bAdmin: userdata.bAdmin,
						bLoggedIn: userdata.bLoggedIn
					};
				}

				data.userdata = clientUserdata;				
			}

		}
		catch(ex) {
			userMessage = "Internal server error.";
			GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			var bError = true;
		}
		finally{
			if(sco)
			{
				sco.done();
			}
		}

		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}


	async logout(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";

		try {
			var userdata = req.userdata;

			if(!userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are already logged out.";
			}

			if(!bError)
			{
				sco = await db.connect();

				//find the user in the db
				sqlStr = `
					update users
					set txt_session_cookie = null,
					ts_last_updated = current_timestamp,
					txt_last_updated_user = $(txt_last_updated_user)
					where uid = $(uid)
				`;

				sqlParams = {
					txt_last_updated_user: cfg.pg_user,
					uid: userdata.uid
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				res.clearCookie("session");

				userMessage = "Logged out.";
			}
		}
		catch(ex) {
			userMessage = "Internal server error.";
			GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			var bError = true;
		}
		finally{
			if(sco)
			{
				sco.done();
			}
		}

		//send the response
		var statusResponse = 200;
		if(bError)
			statusResponse = 500;
		
		res.status(statusResponse).json({userMessage: userMessage});
	}
	
}

exports.AppController = new AppController();