const bcrypt = require('bcrypt');
const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const crypto = require('crypto');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class UserResetPasswordController {

	constructor() {
		
	}

	async verifyResetPasswordToken(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var token = "";

		try {
			userdata = req.userdata;
			sco = await db.connect();

			token = req.body.token;

			//check if they are already logged in
			if(!bError && userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are already logged in.";
			}

			//validate input
			if(!token || token.trim() == "")
			{
				bError = true;
				userMessage = "Invalid token.";
			}

			//see if there is a user with the forgot password token that isn't expired
			if(!bError)
			{
				sqlStr = `
				select txt_username
				from (
					select txt_username,
					DATE_PART('day', current_timestamp - ts_forgot_password_token_created) * 24 * 60 + 
					DATE_PART('hour', current_timestamp - ts_forgot_password_token_created) * 60 +
					DATE_PART('minute', current_timestamp - ts_forgot_password_token_created) as minutesOld
					from users
					where i_delete_flag is null
					and lower(txt_status) = 'activated'
					and txt_forgot_password_token = $(txt_email_token)
				) a
				where minutesOld < 60
				`;

				sqlParams = {
					txt_email_token: token
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				if(sqlData.length == 0)
				{
					bError = true;
					userMessage = "The link is invalid, or the link has expired.";
				}
				else
				{
					data.username = sqlData[0].txt_username;
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

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}



	async resetPassword(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var userUid = "";
		var userdata = {};
		var password = "";
		var token = "";
		var username = "";
		var email = "";

		try {
			userdata = req.userdata;
			sco = await db.connect();

			password = req.body.password;
			token = req.body.token;

			//check if they are already logged in
			if(!bError && userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are already logged in.";
			}

			//validate inputs
			if(!bError)
			{
				userMessage = ValidFuncs.validatePassword(password);
				bError = userMessage != "success";
			}
			if(!token || token.trim() == "")
			{
				bError = true;
				userMessage = "Invalid token.";
			}

			//see if there is a user with the forgot password token that isn't expired
			if(!bError)
			{
				sqlStr = `
				select uid, txt_username, txt_email
				from (
					select uid, txt_username, txt_email,
					DATE_PART('day', current_timestamp - ts_forgot_password_token_created) * 24 * 60 + 
					DATE_PART('hour', current_timestamp - ts_forgot_password_token_created) * 60 +
					DATE_PART('minute', current_timestamp - ts_forgot_password_token_created) as minutesOld
					from users
					where i_delete_flag is null
					and lower(txt_status) = 'activated'
					and txt_forgot_password_token = $(txt_email_token)
				) a
				where minutesOld < 60
				`;

				sqlParams = {
					txt_email_token: token
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				if(sqlData.length == 0)
				{
					bError = true;
					userMessage = "The link is invalid, or the link has expired.";
				}
				else
				{
					userUid = sqlData[0].uid;
					username = sqlData[0].txt_username;
					email = sqlData[0].txt_email
				}
			}

			//at this point, everything is good. Reset the password hash in the database, null out the token, and send out an email saying the password has changed
			if(!bError)
			{
				var hash = await bcrypt.hash(password, cfg.pw_salt_rounds);
				
				sqlStr = `
				update users
				set txt_password_hash = $(txt_password_hash),
				ts_last_updated = current_timestamp,
				txt_last_updated_user = $(txt_last_updated_user),
				txt_forgot_password_token = null
				where uid = $(uid);
				`

				sqlParams = {
					txt_password_hash: hash,
					txt_last_updated_user: cfg.pg_user,
					uid: userUid
				}
				
				sqlData = await sco.any(sqlStr, sqlParams);
				
				userMessage = "Your password has been changed successfully.";
			}

			//send an email out saying their password changed
			if(!bError)
			{
				var emailText = `<div>Hello #username#,</div>
				<div></div>
				<div>This is a notification generated to let you know your password for username "#username#" was changed for DontCodethis.com.</div>`;

				emailText = emailText.replace(/#username#/g, username);

				var mailOptions = {
					from: cfg.email_from,
					to: email,
					subject: 'Password Reset',
					html: emailText
				}

				var auditOptions = {
					txt_email_type: 'Password Reset',
					txt_username: username
				}

				//catch this error specifically to tell the user if the email fails
				try {
					var info = await GenFuncs.sendEmail(mailOptions, auditOptions);
					if(info.accepted.length != 1)
					{
						userMessage += " An error occured when sending email.";
						GenFuncs.logErrorGeneral(req.path, "Error when sending email. Email was not accepted.", null, userdata.uid, userMessage);
						bError = true;
					}
				}
				catch(ex){
					userMessage = " An error occured when sending email.";
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

exports.UserResetPasswordController = new UserResetPasswordController();