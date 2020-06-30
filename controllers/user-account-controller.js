const bcrypt = require('bcrypt');
const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const crypto = require('crypto');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class UserAccountController {

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
		var uid = "";
		var main = {};

		try {
			userdata = req.userdata;
			sco = await db.connect();
			
			//check if they are logged in
			if(!bError && !userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are not logged in.";
			}

			if(!bError)
			{
				sqlStr = `
				select txt_username, txt_email
				from users
				where i_delete_flag is null
				and lower(txt_status) = 'activated'
				and uid = $(uid)
				`;
	
				sqlParams = {
					uid: userdata.uid
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
		var userEmailToken = "";
		var userdata = {};
		var main = {};
		var action = "";
		var bChangePassword = false;
		var bChangeEmail = false;

		try {
			userdata = req.userdata;
			sco = await db.connect();
			
			main = JSON.parse(req.body.main);
			action = req.body.action;

			//check if they are logged in
			if(!bError && !userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are not logged in.";
			}

			//check if this is an update or delete
			if(action == "update")
			{
				//determine if the email was changed
				if(!bError && main.txt_email != userdata.email)
				{
					bChangeEmail = true;
				}

				//determine if the password was changed
				if(!bError && main.password)
				{
					bChangePassword = true;
				}

				//validate input for email
				if(!bError && bChangeEmail)
				{
					userMessage = ValidFuncs.validateEmail(main.txt_email);
					bError = userMessage != "success";
					if(!bError)
					{
						main.txt_email = main.txt_email.trim();
					}
				}

				//validate password
				if(!bError && bChangePassword)
				{
					userMessage = ValidFuncs.validatePassword(main.password);
					bError = userMessage != "success";
				}
				
				//clear out the userMessage if there hasn't been an error yet
				if(!bError)
				{
					userMessage = "";
				}
				
				//if no changes were detected, send a message back saying no changes were made.
				if(!bError && !bChangeEmail && !bChangePassword)
				{
					userMessage = "No changes were detected on server. Nothing was saved.";
				}

				//send an email out to the new account email to see if the email ACTUALLY sends out
				if(!bError && bChangeEmail)
				{
					var emailText = `<div>Hello #username#,</div>
					<div></div>
					<div>This email, "#newemail#", is now the new email associated with the username "#username#" for DontCodeThis.com.</div>`;

					emailText = emailText.replace(/#username#/g, userdata.username).replace(/#newemail#/g, main.txt_email);

					var mailOptions = {
						from: cfg.email_from,
						to: main.txt_email,
						subject: 'Account Email Changed',
						html: emailText
					}

					var auditOptions = {
						txt_email_type: 'Account Email Changed',
						i_user_id: userdata.uid
					}

					//catch this error specifically to tell the user if the email fails
					try {
						var info = await GenFuncs.sendEmail(mailOptions, auditOptions);
						if(info.accepted.length != 1)
						{
							userMessage += " An error occured when sending email to new email. Email was not accepted.";
							GenFuncs.logErrorGeneral(req.path, "Error when sending email. Email was not accepted.", null, userdata.uid, userMessage);
							bError = true;
						}
					}
					catch(ex){
						userMessage = " An error occured when sending email to new email.";
						GenFuncs.logErrorGeneral(req.path, "Exception caught when sending email: " + ex, ex.stack, userdata.uid, userMessage);
						bError = true;
					}
				}


				//if the new email was sent, update email in database
				if(!bError && bChangeEmail)
				{
					sqlStr = `
					update users
					set ts_last_updated = current_timestamp,
					txt_last_updated_user = $(txt_last_updated_user),
					txt_email = $(txt_email)
					where uid = $(uid);
					`
	
					sqlParams = {
						txt_last_updated_user: cfg.pg_user,
						txt_email: main.txt_email,
						uid: userdata.uid
					}
					
					sqlData = await sco.any(sqlStr, sqlParams);
					userMessage = "Email changes applied successfully.";
				}

				//try to send an email out to the OLD account email and let them know that this email is no longer associated
				if(!bError && bChangeEmail)
				{
					var emailText = `<div>Hello #username#,</div>
					<div></div>
					<div>This email, "#oldemail#", is no longer associated with the username "#username#" for DontCodeThis.com.</div>
					<div>The email, "#newemail#", is the new email associated with the username "#username#" for DontCodeThis.com.</div>`;

					emailText = emailText.replace(/#username#/g, userdata.username).replace(/#newemail#/g, main.txt_email).replace(/#oldemail#/g, userdata.email);

					var mailOptions = {
						from: cfg.email_from,
						to: userdata.email,
						subject: 'Account Email Changed',
						html: emailText
					}

					var auditOptions = {
						txt_email_type: 'Account Email Changed',
						i_user_id: userdata.uid
					}

					//catch this error specifically to tell the user if the email fails
					try {
						var info = await GenFuncs.sendEmail(mailOptions, auditOptions);

						//oh well...just log the error and move on
						if(info.accepted.length != 1)
						{
							GenFuncs.logErrorGeneral(req.path, "Error when sending to old email. Email was not accepted.", null, userdata.uid, "Old email was not accepted.");
						}
					}
					catch(ex){
						GenFuncs.logErrorGeneral(req.path, "Exception caught when sending to old email: " + ex, ex.stack, userdata.uid, "Exception sending to old email.");
					}
				}

					
				//also apply email changes to userdata for password change
				if(!bError && bChangeEmail)
				{
					userdata.email = main.txt_email;
				}			


				//update password
				if(!bError && bChangePassword)
				{
					var hash = await bcrypt.hash(main.password, cfg.pw_salt_rounds);
					
					sqlStr = `
					update users
					set txt_password_hash = $(txt_password_hash),
					ts_last_updated = current_timestamp,
					txt_last_updated_user = $(txt_last_updated_user)
					where uid = $(uid);
					`

					sqlParams = {
						txt_password_hash: hash,
						txt_last_updated_user: cfg.pg_user,
						uid: userdata.uid
					}
					
					sqlData = await sco.any(sqlStr, sqlParams);
					
					userMessage += " Password changes applied successfully.";
			

					//send an email out saying their password changed
					if(!bError)
					{
						var emailText = `<div>Hello #username#,</div>
						<div></div>
						<div>This is a notification generated to let you know your password for username "#username#" was changed for DontCodethis.com.</div>`;

						emailText = emailText.replace(/#username#/g, userdata.username);

						var mailOptions = {
							from: cfg.email_from,
							to: userdata.email,
							subject: 'Password Changed',
							html: emailText
						}

						var auditOptions = {
							txt_email_type: 'Password Changed',
							i_user_id: userdata.uid
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
							userMessage += " An error occured when sending email.";
							GenFuncs.logErrorGeneral(req.path, "Exception caught when sending email: " + ex, ex.stack, userdata.uid, userMessage);
							bError = true;
						}
					}
				}
			}
			else if(action == "delete")
			{
				//delete the account in the database
				if(!bError)
				{
					sqlStr = `
					update users
					set ts_last_updated = current_timestamp,
					txt_last_updated_user = $(txt_last_updated_user),
					txt_session_cookie = null,
					txt_status = 'deactivated'
					where uid = $(uid);
					`
	
					sqlParams = {
						txt_last_updated_user: cfg.pg_user,
						uid: userdata.uid
					}
					
					sqlData = await sco.any(sqlStr, sqlParams);
					res.clearCookie("session");
					userMessage = "Account was deleted.";
				}

				//try to send an email out and let them know that this account is deleted
				if(!bError)
				{
					var emailText = `<div>Hello #username#,</div>
					<div></div>
					<div>This account for username "#username#" for DontCodeThis.com has been deleted.</div>`;

					emailText = emailText.replace(/#username#/g, userdata.username);

					var mailOptions = {
						from: cfg.email_from,
						to: userdata.email,
						subject: 'Account Deleted',
						html: emailText
					}

					var auditOptions = {
						txt_email_type: 'Account Deleted',
						i_user_id: userdata.uid
					}

					//catch this error specifically to tell the user if the email fails
					try {
						var info = await GenFuncs.sendEmail(mailOptions, auditOptions);

						//oh well...just log the error and move on
						if(info.accepted.length != 1)
						{
							GenFuncs.logErrorGeneral(req.path, "Error when sending to old email. Email was not accepted.", null, userdata.uid, "Old email was not accepted.");
						}
					}
					catch(ex){
						GenFuncs.logErrorGeneral(req.path, "Exception caught when sending to old email: " + ex, ex.stack, userdata.uid, "Exception sending to old email.");
					}
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

exports.UserAccountController = new UserAccountController();