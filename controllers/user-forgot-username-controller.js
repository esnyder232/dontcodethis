const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class UserForgotUsernameController {
	constructor() {}

	async forgotUsername(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var sqlEmailData = [];
		var userMessage = "";
		var userdata = {};
		var email = null;

		try {
			userdata = req.userdata;
			sco = await db.connect();
			email = req.body.email;

			//check if they are already logged in
			if(!bError && userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are already logged in.";
			}

			//validate inputs
			if(!bError)
			{
				userMessage = ValidFuncs.validateEmail(email);
				bError = userMessage != "success";
			}
			
			//find the list of usernames in the database with that email and email it to them
			if(!bError)
			{
				sqlStr = `
					select txt_username
					from users
					where i_delete_flag is null
					and lower(txt_email) = $(txt_email)
					and lower(txt_status) = 'activated'
				`;

				sqlParams = {
					txt_email: email
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				if(sqlData.length == 0)
				{
					bError = true;
					userMessage = "No usernames were found with that email.";
				}
			}

			//check if that email has been sent out recently for "forgot password". 
			//Only allow users to send to the same email within the "cfg.forgot_username_email_minutes_interval" minutes
			if(!bError)
			{
				sqlStr =`
				select count(*) email_count
				from (
					select *,
					DATE_PART('day', current_timestamp-ts_created::timestamp) * 24 * 60 + 
					DATE_PART('hour', current_timestamp-ts_created::timestamp) * 60 +
					DATE_PART('minute', current_timestamp-ts_created::timestamp) as minutesOld
					from audit_email
					where i_delete_flag is null
					and lower(txt_email_type) = 'forgot username'
					and lower(txt_to) = $(txt_to)
				) a
				where minutesOld < $(forgot_username_email_interval_minutes)
				`;

				sqlParams = {
					txt_to: email,
					forgot_username_email_interval_minutes: cfg.forgot_username_email_interval_minutes
				};

				sqlEmailData = await sco.any(sqlStr, sqlParams);

				//if the ip hit the threashold, lock the account temporarily
				if(sqlEmailData[0].email_count >= cfg.forgot_username_email_per_interval)
				{
					userMessage = "Too many emails have been sent to that email already. Please wait " + cfg.forgot_username_email_interval_minutes + " minutes before trying again.";
					bError = true;
				}
			}

			//send the email
			if(!bError)
			{
				var emailText = "Hello,\n\n" + 
				"This is an email generated because you clicked \"forgot username\" on DontCodeThis.com\n" +
				"If you didn't click on \"forgot username\", please ignore this email.\n\n" + 
				"Below is the list of usernames for this email:\n" +
				"#userlist#\n";

				var userlist = [];
				for(var i = 0; i < sqlData.length; i++)
				{
					var temp = sqlData[i].txt_username;
					userlist.push(temp);
				}

				emailText = emailText.replace("#userlist#", userlist.join("\n"));

				var mailOptions = {
					from: cfg.email_from,
					to: email,
					subject: 'Forgot Username',
					text: emailText
				}

				var auditOptions = {
					txt_email_type: 'Forgot Username'
				}

				//catch this error specifically to tell the user if the email fails
				try {
					var info = await GenFuncs.sendEmail(mailOptions, auditOptions);
					if(info.accepted.length != 1)
					{
						userMessage = "Error sending email.";
						GenFuncs.logErrorGeneral(req.path, "Error when sending email. Email was not accepted.", null, userdata.uid, userMessage);
						bError = true;
					}
					else
					{
						userMessage = "An email has been sent containing the usernames for " + email + ".";
					}
				}
				catch(ex){
					userMessage = "Error sending email.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught when sending email: " + ex, ex.stack, userdata.uid, userMessage);
					bError = true;
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
		
		res.status(statusResponse).json({userMessage: userMessage});
	}
}

exports.UserForgotUsernameController = new UserForgotUsernameController();