const bcrypt = require('bcrypt');
const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const crypto = require('crypto');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class AdminBlogController {

	constructor() {
		
	}

	async getList(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var list = [];

		try {
			userdata = req.userdata;
			sco = await db.connect();
			
			//check if they are already logged in
			if(!bError && !userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are not logged in.";
			}

			//check if they are admin
			if(!bError && !userdata.bAdmin)
			{
				bError = true;
				userMessage = "You are not admin.";
			}

			//get aurelia app routes and nav bar so the site will load
			if(!bError)
			{
				sqlStr = `
				select uid, txt_title, txt_url_slug, b_publish, ts_publish_date
				from blog
				where i_delete_flag is null
				order by uid desc
				`;
	
				sqlData = await sco.multi(sqlStr, sqlParams);

				if(sqlData.length > 0)
				{
					list = sqlData[0];
				}
				else
				{
					bError = true;
					userMessage = "Error when getting list.";
				}
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

		data.list = list;

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}

	async getDetails(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var uid = "";
		var main = {};

		try {
			userdata = req.userdata;
			sco = await db.connect();

			uid = req.query.uid;
			
			//check if they are already logged in
			if(!bError && !userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are not logged in.";
			}

			//check if they are admin
			if(!bError && !userdata.bAdmin)
			{
				bError = true;
				userMessage = "You are not admin.";
			}

			//see if this is for getting a new record
			if(!bError)
			{
				//validate inputs
				if(uid)
				{
					userMessage = ValidFuncs.validateInt(uid);
					bError = userMessage != "success";
					if(bError)
					{
						userMessage = "Uid is not an integer.";
					}
					else
					{
						uid = Number.parseInt(uid);
					}

					//get aurelia app routes and nav bar so the site will load
					if(!bError)
					{
						sqlStr = `
						select uid, txt_title, coalesce(txt_body, '') as txt_body, txt_url_slug, b_publish, ts_publish_date, ts_last_updated, txt_last_updated_user, ts_created
						from blog
						where i_delete_flag is null
						and uid = $(uid)
						`;
			
						sqlParams = {
							uid: uid
						};

						sqlData = await sco.any(sqlStr, sqlParams);

						
						if(sqlData.length > 0)
						{
							main = sqlData[0];
						}
						else
						{
							bError = true;
							userMessage = "Error when getting details.";
						}
					}
				}
				else
				{
					main = {
						txt_body: ""
					};
				}
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

		data.main = main;

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}


	async saveDetails(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var main = {};
		var action = "";
		var key = "";

		try {
			userdata = req.userdata;
			sco = await db.connect();

			main = JSON.parse(req.body.main);
			action = req.body.action;
			
			//check if they are already logged in
			if(!bError && !userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are not logged in.";
			}

			//check if they are admin
			if(!bError && !userdata.bAdmin)
			{
				bError = true;
				userMessage = "You are not admin.";
			}

			//create the record
			if(!bError && action == "insert")
			{
				sqlStr = `
				insert into blog
				(txt_title, txt_body, txt_url_slug, b_publish, ts_publish_date, ts_last_updated, txt_last_updated_user, ts_created)
				values ($(txt_title), $(txt_body), $(txt_url_slug), $(b_publish), $(ts_publish_date), current_timestamp, $(txt_last_updated_user), current_timestamp) RETURNING uid
				`;
	
				sqlParams = {
					txt_title: main.txt_title,
					txt_body: main.txt_body,
					txt_url_slug: main.txt_url_slug,
					b_publish: GenFuncs.parseBool(main.b_publish),
					ts_publish_date: GenFuncs.parseDatetime(main.ts_publish_date),
					txt_last_updated_user: 'dct_admin'
				};

				try {
					sqlData = await sco.any(sqlStr, sqlParams);
					key = sqlData[0].uid;
					userMessage = "Successfully inserted the record.";
				}
				catch(ex) {
					userMessage = "Error when inserting details.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught in insert try catch: " + ex, ex.stack, userdata.uid, userMessage);
					bError = true;
				}


			}

			//update the record
			if(!bError && action == "update")
			{
				sqlStr = `
				update blog
				set txt_title = $(txt_title),
				txt_body = $(txt_body),
				txt_url_slug = $(txt_url_slug),
				b_publish = $(b_publish),
				ts_publish_date = $(ts_publish_date),
				txt_last_updated_user = $(txt_last_updated_user),
				ts_last_updated = current_timestamp
				where uid = $(uid)
				`;
	
				sqlParams = {
					txt_title: main.txt_title,
					txt_body: main.txt_body,
					txt_url_slug: main.txt_url_slug,
					b_publish: GenFuncs.parseBool(main.b_publish),
					ts_publish_date: GenFuncs.parseDatetime(main.ts_publish_date),
					txt_last_updated_user: 'dct_admin',
					uid: main.uid
				};

				try {
					await sco.any(sqlStr, sqlParams);
					userMessage = "Successfully updated the record.";
					key = main.uid;
				}
				catch(ex) {
					userMessage = "Error when updating record.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught in update try catch: " + ex, ex.stack, userdata.uid, userMessage);
					bError = true;
				}
			}

			//delete the record
			if(!bError && action == "delete")
			{
				sqlStr = `
				update blog
				set i_delete_flag = -1,
				txt_last_updated_user = $(txt_last_updated_user),
				ts_last_updated = current_timestamp
				where uid = $(uid)
				`;
	
				sqlParams = {
					uid: main.uid,
					txt_last_updated_user: 'dct_admin'
				};

				try {
					await sco.any(sqlStr, sqlParams);
					userMessage = "Successfully deleted the record.";
					key = main.uid;
				}
				catch(ex) {
					userMessage = "Error when deleting record.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught in delete try catch: " + ex, ex.stack, userdata.uid, userMessage);
					bError = true;
				}
			}
		}
		catch(ex) {
			userMessage = "Internal server error.";
			GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			bError = true;
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

		data.key = key;		

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}



}

exports.AdminBlogController = new AdminBlogController();