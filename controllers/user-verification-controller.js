const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const {GenFuncs} = require.main.require('./gen-funcs.js')

class UserVerificationController {
	constructor() {}

	async verifyUser(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var sqlUserData = [];
		var userMessage = "";
		var userEmailToken = "";
		var userdata = {};

		try {
			sco = await db.connect();

			var userEmailToken = req.body.token;

			//validate inputs
			if(!userEmailToken || userEmailToken.trim() == "")
			{
				bError = true;
				userMessage = "Invalid token.";
			}

			//see if there is a email token in the users table that is pending
			if(!bError)
			{
				sqlStr = `
				select uid, txt_email, txt_username
				from users
				where i_delete_flag is null
				and lower(txt_status) = 'pending'
				and DATE_PART('day', current_timestamp - ts_email_sent) < 1
				and txt_email_token = $(txt_email_token)
				`;

				sqlParams = {
					txt_email_token: userEmailToken
				};

				sqlUserData = await sco.any(sqlStr, sqlParams);
				
				//either there is no user with that token, or the token expired.
				if(sqlUserData.length == 0)
				{
					bError = true;
					userMessage = "There are no pending users associated with that link, or the link has expired.";
				}
			}

			//update the status to activated and send an email to the user telling them its activated
			if(!bError)
			{
				var uid = sqlUserData[0].uid;
				var email = sqlUserData[0].txt_email;
				var username = sqlUserData[0].txt_username

				sqlStr = `
				update users
				set txt_status = 'activated',
				ts_activated = current_timestamp, 
				txt_email_token = null,
				ts_last_updated = current_timestamp
				where uid = $(uid)
				`;
	
				sqlParams = {
					uid: uid
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				var emailText = `<div>Hello #username#,</div>
				<div></div>
				<div>Your account has been activated. You can now login.</div>`;

				emailText = emailText.replace("#username#", username);

				//send email
				var mailOptions = {
					from: cfg.email_from,
					to: email,
					subject: "Account Activated",
					html: emailText
				}

				var auditOptions = {
					txt_email_type: 'Account Activated',
					i_user_id: uid
				}

				try {
					var info = await GenFuncs.sendEmail(mailOptions, auditOptions);
					userMessage = "Your account has been activated. You can now login."
				}
				catch(ex)
				{
					userMessage = "Error sending email.";
					GenFuncs.logErrorGeneral(req.path, "Exception caught when sending email in verifyUser: " + ex, ex.stack, userdata.uid, userMessage);
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

exports.UserVerificationController = new UserVerificationController();