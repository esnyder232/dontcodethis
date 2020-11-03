const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class StockheimerEventToolController {

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
			
			//get list
			if(!bError)
			{
				sqlStr = `
				select sch.uid, sch.txt_schema_name, sch.b_public, coalesce(u.txt_username, 'none') txt_username
				from stockheimer_event_schema sch
				left join users u on sch.i_user = u.uid and u.i_delete_flag is null
				where sch.i_delete_flag is null
				and (
					$(b_admin) = true --admin can see everything
					OR
					sch.i_user = $(userId) --owner can see only theirs
					OR
					coalesce(sch.b_public, false) = true --anyone can see public
				)
				`;

				sqlParams = {
					b_admin: userdata.bAdmin,
					userId: userdata.uid
				};
	
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
		var details = [];
		var parameters = []

		try {
			userdata = req.userdata;
			sco = await db.connect();

			uid = req.query.uid;
			
			//retrieve an existing record
			if(uid) 
			{
				//validate inputs
				userMessage = ValidFuncs.validateInt(uid);
				bError = userMessage != "success";
				if(bError)
				{
					userMessage = "Invalid parameter: uid is not an integer.";
				}
				else
				{
					uid = Number.parseInt(uid);
				}

				//get aurelia app routes and nav bar so the site will load
				if(!bError)
				{
					sqlStr = `
					select sch.uid
					, sch.txt_schema_name
					, sch.txt_notes
					, sch.b_public
					, sch.ts_last_updated
					, sch.ts_created
					, coalesce(u.txt_username, 'none') txt_username
					, 'U' as record_action
					, ($(bAdmin) = true OR coalesce(sch.i_user, $(userId)) = $(userId)) as is_update_allowed
					from stockheimer_event_schema sch
					left join users u on sch.i_user = u.uid
					where sch.i_delete_flag is null
					and sch.uid = $(uid)
					and (
						$(bAdmin) = true --admin can see everything
						OR
						coalesce(sch.i_user, $(userId)) = $(userId) --owner can see only theirs
						OR
						coalesce(sch.b_public, false) = true --anyone can see public
					);
					
					select se.uid
					, se.txt_event_name
					, se.txt_notes
					, 'U' as record_action
					from stockheimer_event_schema sch
					inner join stockheimer_events se on sch.uid = se.i_schema_id and se.i_delete_flag is null
					where sch.i_delete_flag is null
					and sch.uid = $(uid)
					and (
						$(bAdmin) = true --admin can see everything
						OR
						coalesce(sch.i_user, $(userId)) = $(userId) --owner can see only theirs
						OR
						coalesce(sch.b_public, false) = true --anyone can see public
					);
					
					
					select sed.uid
					, sed.i_event_link_id
					, sed.txt_notes
					, sed.i_order
					, sed.txt_param_name
					, sed.txt_data_type
					, 'U' as record_action
					from stockheimer_event_schema sch
					inner join stockheimer_events se on sch.uid = se.i_schema_id and se.i_delete_flag is null
					inner join stockheimer_event_details sed on sed.uid = sed.i_event_link_id and se.i_delete_flag is null
					where sch.i_delete_flag is null
					and sch.uid = $(uid)
					and (
						$(bAdmin) = true --admin can see everything
						OR
						coalesce(sch.i_user, $(userId)) = $(userId) --owner can see only theirs
						OR
						coalesce(sch.b_public, false) = true --anyone can see public
					);
					
					
					select sep.uid
					, sep.i_schema_id
					, sep.i_bit_length
					, sep.txt_data_type
					from stockheimer_event_schema sch
					inner join stockheimer_event_parameters sep on sch.uid = sep.i_schema_id and sep.i_delete_flag is null
					where sch.i_delete_flag is null
					and sch.uid = $(uid)
					and (
						$(bAdmin) = true --admin can see everything
						OR
						coalesce(sch.i_user, $(userId)) = $(userId) --owner can see only theirs
						OR
						coalesce(sch.b_public, false) = true --anyone can see public
					);
					
					`;

					sqlParams = {
						uid: uid,
						bAdmin: userdata.bAdmin,
						userId: userdata.uid ? userdata.uid : '0'
					};

					sqlData = await sco.multi(sqlStr, sqlParams);

					if(sqlData.length > 0)
					{
						main = GenFuncs.getNullObjectFromArray(sqlData[0], 0);
						var eventParent = GenFuncs.getNullArray(sqlData, 1);
						var eventChildren = GenFuncs.getNullArray(sqlData, 2);
						parameters = GenFuncs.getNullArray(sqlData, 3);

						details = GenFuncs.joinTables(eventParent, eventChildren, 'uid', 'i_event_link_id', 'parameters');
					}
					else
					{
						bError = true;
						userMessage = "Error occurred when getting details.";
					}
				}

				
			}
			//new record
			else 
			{
				main = {
					is_update_allowed: true
				};
				details = [];
				parameters = [];
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
		data.details = details;
		data.parameters = parameters;

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
			// userdata = req.userdata;
			// sco = await db.connect();

			// main = JSON.parse(req.body.main);
			// action = req.body.action;
			
			// //check if they are already logged in
			// if(!bError && !userdata.bLoggedIn)
			// {
			// 	bError = true;
			// 	userMessage = "You are not logged in.";
			// }

			// //check if they are admin
			// if(!bError && !userdata.bAdmin)
			// {
			// 	bError = true;
			// 	userMessage = "You are not admin.";
			// }

			// //create the record
			// if(!bError && action == "insert")
			// {
			// 	sqlStr = `
			// 	insert into blog
			// 	(txt_title, txt_body, txt_url_slug, b_publish, ts_publish_date, ts_last_updated, txt_last_updated_user, ts_created)
			// 	values ($(txt_title), $(txt_body), $(txt_url_slug), $(b_publish), $(ts_publish_date), current_timestamp, $(txt_last_updated_user), current_timestamp) RETURNING uid
			// 	`;
	
			// 	sqlParams = {
			// 		txt_title: main.txt_title,
			// 		txt_body: main.txt_body,
			// 		txt_url_slug: main.txt_url_slug,
			// 		b_publish: GenFuncs.parseBool(main.b_publish),
			// 		ts_publish_date: GenFuncs.parseDatetime(main.ts_publish_date),
			// 		txt_last_updated_user: 'dct_admin'
			// 	};

			// 	try {
			// 		sqlData = await sco.any(sqlStr, sqlParams);
			// 		key = sqlData[0].uid;
			// 		userMessage = "Successfully inserted the record.";
			// 	}
			// 	catch(ex) {
			// 		userMessage = "Error when inserting details.";
			// 		GenFuncs.logErrorGeneral(req.path, "Exception caught in insert try catch: " + ex, ex.stack, userdata.uid, userMessage);
			// 		bError = true;
			// 	}


			// }

			// //update the record
			// if(!bError && action == "update")
			// {
			// 	sqlStr = `
			// 	update blog
			// 	set txt_title = $(txt_title),
			// 	txt_body = $(txt_body),
			// 	txt_url_slug = $(txt_url_slug),
			// 	b_publish = $(b_publish),
			// 	ts_publish_date = $(ts_publish_date),
			// 	txt_last_updated_user = $(txt_last_updated_user),
			// 	ts_last_updated = current_timestamp
			// 	where uid = $(uid)
			// 	`;
	
			// 	sqlParams = {
			// 		txt_title: main.txt_title,
			// 		txt_body: main.txt_body,
			// 		txt_url_slug: main.txt_url_slug,
			// 		b_publish: GenFuncs.parseBool(main.b_publish),
			// 		ts_publish_date: GenFuncs.parseDatetime(main.ts_publish_date),
			// 		txt_last_updated_user: 'dct_admin',
			// 		uid: main.uid
			// 	};

			// 	try {
			// 		await sco.any(sqlStr, sqlParams);
			// 		userMessage = "Successfully updated the record.";
			// 		key = main.uid;
			// 	}
			// 	catch(ex) {
			// 		userMessage = "Error when updating record.";
			// 		GenFuncs.logErrorGeneral(req.path, "Exception caught in update try catch: " + ex, ex.stack, userdata.uid, userMessage);
			// 		bError = true;
			// 	}
			// }

			// //delete the record
			// if(!bError && action == "delete")
			// {
			// 	sqlStr = `
			// 	update blog
			// 	set i_delete_flag = -1,
			// 	txt_last_updated_user = $(txt_last_updated_user),
			// 	ts_last_updated = current_timestamp
			// 	where uid = $(uid)
			// 	`;
	
			// 	sqlParams = {
			// 		uid: main.uid,
			// 		txt_last_updated_user: 'dct_admin'
			// 	};

			// 	try {
			// 		await sco.any(sqlStr, sqlParams);
			// 		userMessage = "Successfully deleted the record.";
			// 		key = main.uid;
			// 	}
			// 	catch(ex) {
			// 		userMessage = "Error when deleting record.";
			// 		GenFuncs.logErrorGeneral(req.path, "Exception caught in delete try catch: " + ex, ex.stack, userdata.uid, userMessage);
			// 		bError = true;
			// 	}
			// }
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

exports.StockheimerEventToolController = new StockheimerEventToolController();