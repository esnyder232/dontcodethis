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
				select sch.uid, sch.txt_schema_name, coalesce(sch.b_public, false) as b_public, coalesce(u.txt_username, 'none') txt_username
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
					, true as is_dirty
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
					)
					order by se.txt_event_name;
					
					
					select sed.uid
					, sed.i_event_link_id
					, sed.txt_notes
					, sed.i_order
					, sed.txt_param_name
					, sed.txt_data_type
					, 'U' as record_action
					, true as is_dirty
					from stockheimer_event_schema sch
					inner join stockheimer_events se on sch.uid = se.i_schema_id and se.i_delete_flag is null
					inner join stockheimer_event_details sed on se.uid = sed.i_event_link_id and sed.i_delete_flag is null
					where sch.i_delete_flag is null
					and sch.uid = $(uid)
					and (
						$(bAdmin) = true --admin can see everything
						OR
						coalesce(sch.i_user, $(userId)) = $(userId) --owner can see only theirs
						OR
						coalesce(sch.b_public, false) = true --anyone can see public
					)
					order by sed.i_order;
					
					
					select sep.uid
					, sep.i_schema_id
					, sep.i_bit_length
					, sep.txt_data_type
					, sep.txt_notes
					, 'U' as record_action
					, true as is_dirty
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
					)
					order by sep.txt_data_type;
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
					is_update_allowed: true,
					txt_username: userdata.username ? userdata.username : 'none'
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
		var details = [];
		var parameters = [];
		var action = "";
		var is_update_allowed = false;

		var key = "";

		try {
			userdata = req.userdata;
			sco = await db.connect();

			main = JSON.parse(req.body.main);
			details = JSON.parse(req.body.details);
			parameters = JSON.parse(req.body.parameters);
			action = req.body.action;

			//main - insert
			if(!bError && action == "insert")
			{
				sqlStr = `
				insert into stockheimer_event_schema
				(txt_schema_name, txt_notes, i_user, b_public, ts_last_updated, txt_last_updated_user, ts_created)
				select $(txt_schema_name), $(txt_notes), $(i_user), $(b_public), current_timestamp, $(txt_last_updated_user), current_timestamp
				RETURNING uid;
				`;
	
				sqlParams = {
					txt_schema_name: main.txt_schema_name,
					txt_notes: main.txt_notes,
					i_user: userdata.uid,
					b_public: GenFuncs.parseBool(main.b_public),
					txt_last_updated_user: userdata.username
				};

				try {
					sqlData = await sco.any(sqlStr, sqlParams);
					key = sqlData[0].uid;
					is_update_allowed = true;
				}
				catch(ex) {
					userMessage = "Error when inserting details.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught in insert main try catch: " + ex, ex.stack, userdata.uid, userMessage);
					bError = true;
				}
			}
			//main - update/delete
			else if(!bError && (action == "update" || action == "delete"))
			{
				//first check to see if they are allowed to update the record
				sqlStr = `
				select ($(bAdmin) = true OR coalesce(i_user, $(userId)) = $(userId)) as is_update_allowed
				from stockheimer_event_schema
				where i_delete_flag is null
				and uid = $(uid);
				`;
	
				sqlParams = {
					uid: main.uid,
					bAdmin: userdata.bAdmin,
					userId: userdata.uid ? userdata.uid : '0'
				};

				try {
					sqlData = await sco.any(sqlStr, sqlParams);
					if(sqlData.length > 0) {
						is_update_allowed = sqlData[0]["is_update_allowed"];
	
						if(!is_update_allowed)
						{
							bError = true;
							userMessage = "You are now allowed to update this record. To update the record, you must be logged in as the user who created it, or the record must be public with no owner.";
						}
					}
					else {
						bError = true;
						userMessage = "Error occurred when updating the record.";
					}
				}
				catch(ex) {
					userMessage = "Error when updating record.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught in update try catch: " + ex, ex.stack, userdata.uid, userMessage);
					bError = true;
				}

				if(!bError && is_update_allowed)
				{
					//update main
					if(action == "update")
					{
						sqlStr = `
						update stockheimer_event_schema
						set txt_schema_name = $(txt_schema_name),
						txt_notes = $(txt_notes),
						b_public = $(b_public),
						ts_last_updated = current_timestamp,
						txt_last_updated_user = $(txt_last_updated_user)
						where uid = $(uid);
						`;
						key = main.uid;
					}
					//delete main
					else if(action == "delete")
					{
						sqlStr = `
						update stockheimer_event_schema
						set i_delete_flag = -1,
						ts_last_updated = current_timestamp,
						txt_last_updated_user = $(txt_last_updated_user)
						where uid = $(uid);`;
						key = main.uid;
					}

					sqlParams = {
						txt_schema_name: main.txt_schema_name,
						txt_notes: main.txt_notes,
						b_public: GenFuncs.parseBool(main.b_public),
						txt_last_updated_user: userdata.username,
						uid: key
					};

					try {
						await sco.any(sqlStr, sqlParams);
					}
					catch(ex) {
						userMessage = "Error when deleting record.";
						GenFuncs.logErrorGeneral(req.path, "Exception caught in delete try catch: " + ex, ex.stack, userdata.uid, userMessage);
						bError = true;
					}
				}
			}
			

			//insert/update details
			if(!bError && (action == "insert" || action == "update") && is_update_allowed)
			{
				for(var i = 0; i < details.length; i++)
				{
					var currentDetails = details[i];
					var currentDetailsUid = ''

					if(!bError && currentDetails.is_dirty)
					{
						var sqlDetailStr = '';

						//insert
						if(currentDetails.record_action == "I")
						{
							sqlDetailStr = `insert into stockheimer_events
							(i_schema_id, txt_event_name, txt_notes, ts_last_updated, txt_last_updated_user, ts_created)
							select $(i_schema_id), $(txt_event_name), $(txt_notes), current_timestamp, $(txt_last_updated_user), current_timestamp
							RETURNING uid;
							`;
						}
						//update
						else if(currentDetails.record_action == "U")
						{
							sqlDetailStr = `update stockheimer_events
							set txt_event_name = $(txt_event_name),
							txt_notes = $(txt_notes),
							ts_last_updated = current_timestamp,
							txt_last_updated_user = $(txt_last_updated_user)
							where uid = $(uid);`;
							currentDetailsUid = currentDetails.uid;
						}
						//delete
						else if(currentDetails.record_action == "D")
						{
							sqlDetailStr = `update stockheimer_events
							set i_delete_flag = -1,
							ts_last_updated = current_timestamp,
							txt_last_updated_user = $(txt_last_updated_user)
							where uid = $(uid);`;
							currentDetailsUid = currentDetails.uid;
						}

						sqlParams = {
							i_schema_id: key,
							txt_event_name: currentDetails.txt_event_name,
							txt_notes: currentDetails.txt_notes,
							txt_last_updated_user: userdata.username,
							uid: currentDetailsUid
						};

						try {
							sqlData = await sco.any(sqlDetailStr, sqlParams);
							
							if(currentDetails.record_action == "I")
							{
								currentDetailsUid = sqlData[0].uid;
							}
						}
						catch(ex) {
							userMessage = "Error when inserting details record.";
							GenFuncs.logErrorGeneral(req.path, "Exception caught in insert details try catch: " + ex, ex.stack, userdata.uid, userMessage);
							bError = true;
						}

						//detailParameters
						if(!bError)
						{
							for(var j = 0; j < currentDetails.parameters.length; j++)
							{
								var currentDetailsParameter = currentDetails.parameters[j];
								var currentDetailsParameterUid = ''
			
								if(!bError && currentDetailsParameter.is_dirty)
								{
									var sqlDetailParametersStr = '';
			
									//insert
									if(currentDetailsParameter.record_action == "I")
									{
										sqlDetailParametersStr = `insert into stockheimer_event_details
										(i_event_link_id, txt_notes, i_order, ts_last_updated, txt_last_updated_user, ts_created, txt_param_name, txt_data_type)
										select $(i_event_link_id), $(txt_notes), $(i_order), current_timestamp, $(txt_last_updated_user), current_timestamp, $(txt_param_name), $(txt_data_type);`;
									}
									//update
									else if(currentDetailsParameter.record_action == "U")
									{
										sqlDetailParametersStr = `update stockheimer_event_details
										set txt_notes = $(txt_notes),
										i_order = $(i_order),
										ts_last_updated = current_timestamp,
										txt_last_updated_user = $(txt_last_updated_user),
										txt_param_name = $(txt_param_name),
										txt_data_type = $(txt_data_type)
										where uid = $(uid)`;
										currentDetailsParameterUid = currentDetailsParameter.uid;
									}
									//delete
									else if(currentDetailsParameter.record_action == "D")
									{
										sqlDetailParametersStr = `update stockheimer_event_details
										set i_delete_flag = -1,
										ts_last_updated = current_timestamp,
										txt_last_updated_user = $(txt_last_updated_user)
										where uid = $(uid)`;
										currentDetailsParameterUid = currentDetailsParameter.uid;
									}
			
									sqlParams = {
										i_event_link_id: currentDetailsUid,
										txt_notes: currentDetailsParameter.txt_notes,
										i_order: currentDetailsParameter.i_order,
										txt_last_updated_user: userdata.username,
										txt_param_name: currentDetailsParameter.txt_param_name,
										txt_data_type: currentDetailsParameter.txt_data_type,
										uid: currentDetailsParameterUid
									};
			
									try {
										sqlData = await sco.any(sqlDetailParametersStr, sqlParams);
									}
									catch(ex) {
										userMessage = "Error when inserting details parameters record.";
										GenFuncs.logErrorGeneral(req.path, "Exception caught in insert details parameters try catch: " + ex, ex.stack, userdata.uid, userMessage);
										bError = true;
									}
								}
							}
						}
					}
				}
			}

			//parameters
			if(!bError && (action == "insert" || action == "update") && is_update_allowed)
			{
				for(var i = 0; i < parameters.length; i++)
				{
					var currentParameter = parameters[i];
					var currentParameterUid = '';

					if(!bError && currentParameter.is_dirty)
					{
						var sqlParameterStr = '';

						//insert
						if(currentParameter.record_action == "I")
						{
							sqlParameterStr = `insert into stockheimer_event_parameters
							(i_schema_id, i_bit_length, ts_last_updated, txt_last_updated_user, ts_created, txt_data_type, txt_notes)
							select $(i_schema_id), $(i_bit_length), current_timestamp, $(txt_last_updated_user), current_timestamp, $(txt_data_type), $(txt_notes);`;
						}
						//update
						else if(currentParameter.record_action == "U")
						{
							sqlParameterStr = `update stockheimer_event_parameters
							set i_bit_length = $(i_bit_length),
							ts_last_updated = current_timestamp,
							txt_last_updated_user = $(txt_last_updated_user),
							txt_data_type = $(txt_data_type),
							txt_notes = $(txt_notes)
							where uid = $(uid);`;
							currentParameterUid = currentParameter.uid;
						}
						//delete
						else if(currentParameter.record_action == "D")
						{
							sqlParameterStr = `update stockheimer_event_parameters
							set i_delete_flag = -1,
							ts_last_updated = current_timestamp,
							txt_last_updated_user = $(txt_last_updated_user)
							where uid = $(uid);`;
							currentParameterUid = currentParameter.uid;
						}

						sqlParams = {
							i_schema_id: key,
							i_bit_length: currentParameter.i_bit_length,
							txt_data_type: currentParameter.txt_data_type,
							txt_notes: currentParameter.txt_notes,
							txt_last_updated_user: userdata.username,
							uid: currentParameterUid
						};

						try {
							await sco.any(sqlParameterStr, sqlParams);
						}
						catch(ex) {
							userMessage = "Error when inserting parameters record.";
							GenFuncs.logErrorGeneral(req.path, "Exception caught in insert parameters try catch: " + ex, ex.stack, userdata.uid, userMessage);
							bError = true;
						}
					}
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

		if(!bError && action == "insert")
		{
			userMessage = "Successfully inserted the record.";
		}
		else if(!bError && action == "update")
		{
			userMessage = "Successfully updated the record.";
		}
		else if(!bError && action == "delete")
		{
			userMessage = "Successfully deleted the record.";
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