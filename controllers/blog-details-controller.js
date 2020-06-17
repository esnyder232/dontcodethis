const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class BlogDetailsController {

	constructor() {
		
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
		var key = "";
		var main = [];
		var comments = [];

		try {
			userdata = req.userdata;
			sco = await db.connect();

			key = req.query.key;
			
			//see if this is for getting a new record
			if(!bError)
			{
				//validate inputs
				userMessage = ValidFuncs.validateInt(key);
				bError = userMessage != "success";
				if(bError)
				{
					userMessage = "Key is not an integer.";
				}
				else
				{
					key = Number.parseInt(key);
				}
			}

			if(!bError)
			{
				sqlStr = `
				select uid, txt_title, txt_body, ts_publish_date
				from blog
				where i_delete_flag is null
				and b_publish = true
				and ts_publish_date <= current_timestamp
				and uid = $(uid);
				`;
	
				sqlParams = {
					uid: key
				};

				sqlData = await sco.multi(sqlStr, sqlParams);
				
				if(sqlData.length > 0)
				{
					main = sqlData[0];
				}
				else
				{
					bError = true;
					userMessage = "Error when getting blog details, or a blog with that id doesn't exist.";
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


	async getComments(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var key = "";
		var comments = [];

		try {
			userdata = req.userdata;
			sco = await db.connect();

			key = req.query.key;
			
			//see if this is for getting a new record
			if(!bError)
			{
				//validate inputs
				userMessage = ValidFuncs.validateInt(key);
				bError = userMessage != "success";
				if(bError)
				{
					userMessage = "Key is not an integer.";
				}
				else
				{
					key = Number.parseInt(key);
				}
			}

			if(!bError)
			{
				sqlStr = `
				select bc.uid, bc.ts_posted, bc.txt_body, coalesce(u.txt_username, txt_anonymous_name) as txt_username,
				case
					when i_user_id is null
						then true
					else false
				end as b_anonymous
				from blog b
				inner join blog_comments bc on b.uid = bc.i_blog_id and bc.i_delete_flag is null
				left join users u on bc.i_user_id = u.uid
				where b.i_delete_flag is null
				and b_publish = true
				and b.ts_publish_date <= current_timestamp
				and b.uid = $(uid)
				order by bc.ts_posted asc;
				`;
	
				sqlParams = {
					uid: key
				};

				sqlData = await sco.multi(sqlStr, sqlParams);
				
				if(sqlData.length > 0)
				{
					comments = sqlData[0];
				}
				else
				{
					bError = true;
					userMessage = "Error when getting comments.";
				}
			}
		}
		catch(ex) {
			userMessage = "Internal server error when getting comments.";
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

		data.comments = comments;

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}




	async saveComment(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var body = {};

		var key = null;
		var clientComment = {};
		var commentUsername = null;
		var commentBody = null;
		var userId = null; 
		var username = null;
		var txt_last_updated_user = null;
		var anonymousName = null;

		try {
			userdata = req.userdata;
			sco = await db.connect();

			key = req.body.key;
			clientComment = JSON.parse(req.body.clientComment);
			commentBody = clientComment.commentBody;
			commentUsername = clientComment.commentUsername;

			//if they are logged in, use the username from the database
			if(!bError && userdata.bLoggedIn)
			{
				userId = userdata.uid;
				anonymousName = null;
				username = userdata.username;
			}
			//otherwise, use the username they supplied in the field
			else if(!bError && !userdata.bLoggedIn)
			{
				userId = null;
				anonymousName = commentUsername;
				username = commentUsername;
			}

			//validate inputs
			if(!bError)
			{
				userMessage = ValidFuncs.validateInt(key);
				bError = userMessage != "success";
				if(!bError)
				{
					key = Number.parseInt(key);
				}
				else
				{
					userMessage = "Key is not an integer.";
				}
			}

			if(!bError)
			{
				userMessage = ValidFuncs.validateUsername(username);
				bError = userMessage != "success";
				if(!bError)
				{
					username = username.trim();
				}
			}

			
			if(!bError)
			{
				userMessage = ValidFuncs.validateStringNotBlank(commentBody);
				bError = userMessage != "success";
				if(!bError)
				{
					commentBody = commentBody.trim();
				}
				else
				{
					userMessage = "Comment cannot be blank.";
				}
			}

			//validate the anonymousName if they are not logged in
			if(!bError && !userdata.bLoggedIn)
			{
				userMessage = ValidFuncs.validateUsername(anonymousName);
				bError = userMessage != "success";
				if(!bError)
				{
					anonymousName = anonymousName.trim();
				}
			}



			//create the record
			if(!bError)
			{
				sqlStr = `
				insert into blog_comments
				(i_blog_id, ts_posted, txt_body, i_user_id, txt_anonymous_name, ts_last_updated, txt_last_updated_user, ts_created)
				values ($(i_blog_id), current_timestamp, $(txt_body), $(i_user_id), $(txt_anonymous_name), current_timestamp, $(txt_last_updated_user), current_timestamp)
				`;
	
				sqlParams = {
					i_blog_id: key,
					txt_body: commentBody,
					i_user_id: userId,
					txt_anonymous_name: anonymousName,
					txt_last_updated_user: username
				};

				try {
					sqlData = await sco.any(sqlStr, sqlParams);
					userMessage = "Successfully submitted the comment.";
				}
				catch(ex) {
					userMessage = "Error when inserting comment.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught in insert try catch: " + ex, ex.stack, userdata.uid, userMessage);
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

		res.status(statusResponse).json({userMessage: userMessage});

	}

}

exports.BlogDetailsController = new BlogDetailsController();