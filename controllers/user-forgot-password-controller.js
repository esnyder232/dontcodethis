const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const crypto = require('crypto');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class UserForgotPasswordController {
	constructor() {}

	async forgotPassword(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var sqlEmailData = [];
		var userMessage = "";
		var userdata = {};
		var username = null;
		var userUid = null;
		var email = null;
		var forgotToken = "";

		try {
			userdata = req.userdata;
			sco = await db.connect();
			username = req.body.username;

			//check if they are already logged in
			if(!bError && userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are already logged in.";
			}

			//validate inputs
			if(!bError)
			{
				userMessage = ValidFuncs.validateUsername(username);
				bError = userMessage != "success";
				if(!bError)
				{
					username = username.trim();
				}
			}

			//find the email in the database with that username
			if(!bError)
			{
				sqlStr = `
					select uid, txt_email
					from users
					where i_delete_flag is null
					and lower(txt_username) = $(txt_username)
					and lower(txt_status) = 'activated'
				`;

				sqlParams = {
					txt_username: username
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				if(sqlData.length == 0)
				{
					bError = true;
					userMessage = "That username was found.";
				}				
				if(!bError)
				{
					email = sqlData[0].txt_email;
					userUid = sqlData[0].uid;

					//check also if an email is associated to that username
					if(!email)
					{
						bError = true;
						userMessage = "That username does not have an email associated with it."
					}
				}
			}

			//check if that email has been sent out recently for "forgot password". 
			//Only allow users to send to the same username within the "cfg.forgot_password_email_minutes_interval" minutes
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
					and lower(txt_email_type) = 'forgot password'
					and lower(txt_username) = $(txt_username)
				) a
				where minutesOld < $(forgot_password_email_minutes_interval)
				`;

				sqlParams = {
					txt_username: username,
					forgot_password_email_minutes_interval: cfg.forgot_password_email_minutes_interval
				};

				sqlEmailData = await sco.any(sqlStr, sqlParams);

				//if the ip hit the threashold, lock the account temporarily
				if(sqlEmailData[0].email_count >= cfg.forgot_password_email_per_interval)
				{
					userMessage = "Too many emails have been sent to that username already. Please wait " + cfg.forgot_password_email_minutes_interval + " minutes before trying again.";
					bError = true;
				}
			}

			//send the email
			if(!bError)
			{
				forgotToken = crypto.randomBytes(64).toString('hex');

				var emailText = `<div>Hello #username#,</div>
				<div></div>
				<div>This is an email generated because you clicked "Forgot Password" on DontCodeThis.com.</div>
				<div>If you didn't click on "Forgot Password", please ignore this email.</div>
				<div></div>
				<div>Please click the link below to reset your password for "#username#" on DontCodethis.com. This link is valid for 1 hour.</div>
				<div><a href='#link#'>#link#</a></div>`;

				var emailLink = cfg.website_base_url + "/#/user-reset-password?token=" + forgotToken;
				emailText = emailText.replace(/#username#/g, username).replace(/#link#/g, emailLink);

				var mailOptions = {
					from: cfg.email_from,
					to: email,
					subject: 'Forgot Password',
					html: emailText
				}

				var auditOptions = {
					txt_email_type: 'Forgot Password',
					txt_username: username
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
				}
				catch(ex){
					userMessage = "Error sending email.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught when sending email: " + ex, ex.stack, userdata.uid, userMessage);
					bError = true;
				}
			}


			//At this point, everything is correct and the email sent out. Lets update the user in the database.
			if(!bError)
			{
				sqlStr = `
				update users
				set ts_last_updated = current_timestamp,
				txt_last_updated_user = $(txt_last_updated_user),
				txt_forgot_password_token = $(txt_forgot_password_token),
				ts_forgot_password_token_created = current_timestamp
				where uid = $(uid);
				`

				sqlParams = {
					uid: userUid,
					txt_last_updated_user: cfg.pg_user,
					txt_forgot_password_token: forgotToken
				}
				
				sqlData = await sco.any(sqlStr, sqlParams);
				
				userMessage = "An email has been sent to that user's email. Please check your email and click the link to reset your password. The link is valid for 1 hour."
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

exports.UserForgotPasswordController = new UserForgotPasswordController();