const bcrypt = require('bcrypt');
const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const crypto = require('crypto');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class UserCreateController {

	constructor() {
		
	}

	async createUser(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var userEmailToken = "";
		var userdata = {};

		try {
			userdata = req.userdata;
			sco = await db.connect();
			
			var username = req.body.username;
			var password = req.body.password;
			var email = req.body.email;

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

			if(!bError)
			{
				userMessage = ValidFuncs.validatePassword(password);
				bError = userMessage != "success";
			}

			if(!bError)
			{
				userMessage = ValidFuncs.validateEmail(email);
				bError = userMessage != "success";
			}
			
			//check to see if an active user with that username already exists
			if(!bError)
			{
				sqlStr = `
				select uid
				from users
				where i_delete_flag is null
				and lower(txt_status) = 'activated'
				and lower(txt_username) = lower($(username))
				`;
	
				sqlParams = {
					username: username
				}
	
				sqlData = await sco.any(sqlStr, sqlParams);
				
				if(sqlData.length > 0)
				{
					bError = true;
					userMessage = "An active user with that username already exists.";
				}
			}

			//at this point, generate the email and send it to make sure it will ACTUALLY send out
			if(!bError)
			{
				//64byte token, idk seems okay to me
				userEmailToken = crypto.randomBytes(64).toString('hex');

				var emailText = `<div>Hello #username#,</div>
					<div></div>
					<div>Please click the link below to confirm your account for DontCodethis.com. This link is valid for 24 hours.</div>
					<div>If you haven't created a user, please ignore this email.</div>
					<div><a href='#link#'>#link#</a></div>`;

				var emailLink = cfg.website_base_url + "/#/user-verification?token=" + userEmailToken;

				emailText = emailText.replace("#username#", username).replace(/#link#/g, emailLink)

				var mailOptions = {
					from: cfg.email_from,
					to: email,
					subject: 'Account Activation',
					html: emailText
				}

				var auditOptions = {
					txt_email_type: 'Account Activation',
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



			//At this point, everything is correct and the email sent out. Lets insert the user into the database, and await the user click the link in the confirmation email.
			if(!bError)
			{
				var hash = await bcrypt.hash(password, cfg.pw_salt_rounds);
				
				sqlStr = `
				insert into users
				(txt_username, txt_password_hash, ts_last_updated, ts_created, txt_last_updated_user, txt_status, txt_email_token, ts_email_sent, txt_email)
				select $(txt_username), $(txt_password_hash), current_timestamp, current_timestamp, $(txt_last_updated_user), $(txt_status), $(txt_email_token), current_timestamp, $(txt_email)
				where not exists (
					select * 
					from users 
					where i_delete_flag is null 
					and txt_username = $(txt_username)
				);
				
				update users
				set txt_password_hash = $(txt_password_hash),
				ts_last_updated = current_timestamp,
				txt_last_updated_user = $(txt_last_updated_user),
				txt_status = $(txt_status),
				txt_email_token = $(txt_email_token),
				ts_email_sent = current_timestamp,
				txt_email = $(txt_email)
				where txt_username = $(txt_username);
				`

				sqlParams = {
					txt_username: username,
					txt_password_hash: hash,
					txt_last_updated_user: cfg.pg_user,
					txt_status: 'pending',
					txt_email_token: userEmailToken,
					txt_email: email
				}
				
				sqlData = await sco.any(sqlStr, sqlParams);
				
				userMessage = "An email confirmation has been sent. Please check your email and click the link to activate your account. The link is valid for 24 hours."
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

exports.UserCreateController = new UserCreateController();