const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class UserLoginController {
	constructor() {}

	async login(req, res) {
		var bError = false;
		var bLoginAttempt = false;
		var bLoginResult = false;
		var loginReason = null;
		var bLockAccount = false;
		var lockReason = null;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var userdata = {};
		var uid = 0;		
		var clientUsername = null;
		var clientPassword  = null;
		var clientRememberMe = null;

		try {
			userdata = req.userdata;
			sco = await db.connect();

			clientUsername = req.body.username;
			clientPassword = req.body.password;
			clientRememberMe = req.body.bRememberMe == 'true';

			//check if they are already logged in
			if(!bError && userdata.bLoggedIn)
			{
				bError = true;
				userMessage = "You are already logged in.";
			}

			//validate body
			if(!bError && !clientUsername)
			{
				bError = true;
				userMessage = "Username cannot be blank.";
			}
			
			if(!bError && !clientPassword)
			{
				bError = true;
				userMessage = "Password cannot be blank.";
			}


			//find out if the account is locked for their ip
			if(!bError)
			{
				sqlStr = `
					select max(coalesce(ts_end, '1/1/2020')) as ts_end
					from account_ip_blacklist
					where i_delete_flag is null
					and lower(txt_username) = lower($(txt_username))
					and txt_ip = $(txt_ip)
					and coalesce(ts_end, '1/1/2020') > current_timestamp
				`;

				sqlParams = {
					txt_ip: req.ip,
					txt_username: clientUsername
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				var tsEnd = sqlData[0].ts_end;
				if(tsEnd)
				{
					bError = true;
					userMessage = "This account is temporarily locked.";
				}
			}

			if(!bError)
			{
				//find the user in the db
				sqlStr = `
				select uid, txt_username, txt_password_hash
				from users
				where i_delete_flag is null
				and lower(txt_status) = 'activated'
				and lower(txt_username) = lower($(txt_username))
				`;

				sqlParams = {
					txt_username: clientUsername
				};

				sqlData = await sco.any(sqlStr, sqlParams);

				if(sqlData.length > 0)
				{
					uid = sqlData[0].uid;
					var passwordHash = sqlData[0].txt_password_hash;

					//compare passwords
					var results = await bcrypt.compare(clientPassword, passwordHash);

					if(!results)
					{
						userMessage = "Invalid username/password.";
						bError = true;
						bLoginAttempt = true;
						bLoginResult = false;
						loginReason = "Incorrect password";
					}
				}
				else
				{
					userMessage = "Invalid username/password.";
					bError = true;
					bLoginAttempt = true;
					bLoginResult = false;
					loginReason = "Username not found";
				}
			}

			//log the user in
			if(!bError)
			{
				//create cookie for the user and save it to the database
				//16byte token, idk seems okay to me
				var sessionCookie = crypto.randomBytes(16).toString('hex');
				
				//find the user in the db
				sqlStr = `
					update users
					set txt_session_cookie = $(txt_session_cookie),
					ts_last_login = current_timestamp,
					ts_last_updated = current_timestamp,
					txt_last_updated_user = $(txt_last_updated_user)
					where uid = $(uid)
				`;

				sqlParams = {
					txt_session_cookie: sessionCookie,
					txt_last_updated_user: cfg.pg_user,
					uid: uid
				};

				await sco.any(sqlStr, sqlParams);

				var expireDays = cfg.login_cookie_expiration_days;

				if(clientRememberMe)
				{
					expireDays = cfg.login_cookie_expiration_days_remember_me;
				}

				if(!expireDays)
				{
					expireDays = 1;
				}

				var cookieOptions = {
					signed: true,
					maxAge: 60000 * 60 * 24 * expireDays,
					httpOnly: true,
					sameSite: "strict",
					secure: cfg.https_enabled
				};
				
				res.cookie("session", sessionCookie, cookieOptions);
				userMessage = "Logged in.";
				bLoginAttempt = true;
				bLoginResult = true;
			}

			//if an login attempt was made, log it
			if(bLoginAttempt)
			{
				sqlStr = `
					insert into audit_login
					(txt_ip, txt_username, b_result, txt_reason, ts_last_updated, txt_last_updated_user, ts_created)
					values ($(txt_ip), $(txt_username), $(b_result), $(txt_reason), current_timestamp, $(txt_last_updated_user), current_timestamp)
				`;

				sqlParams = {
					txt_ip: req.ip,
					txt_username: clientUsername,
					b_result: bLoginResult,
					txt_reason: loginReason,
					txt_last_updated_user: cfg.pg_user
				};

				await sco.any(sqlStr, sqlParams);

				//if it was an invalid login result, check to see if we need to temporarily lock the account
				if(!bLoginResult)
				{
					//count how many times the ip has failed to login because of an incorrect password.
					//only look back as far as the login_attempts_allowed_interval_minutes in the cfg file.
					sqlStr = `
					select count(*) invalid_password_count
					from (
						select *, 
						DATE_PART('day', current_timestamp-ts_created::timestamp) * 24 * 60 + 
						DATE_PART('hour', current_timestamp-ts_created::timestamp) * 60 +
						DATE_PART('minute', current_timestamp-ts_created::timestamp) as minutesOld
						from audit_login
						where i_delete_flag is null
						and txt_ip = $(txt_ip)
						and lower(txt_username) = lower($(txt_username))
						and lower(txt_reason) = 'incorrect password'
						and b_result = false
					) a
					where minutesOld < $(login_attempts_allowed_interval_minutes)
					`;

					sqlParams = {
						txt_ip: req.ip,
						login_attempts_allowed_interval_minutes: cfg.login_attempts_allowed_interval_minutes,
						txt_username: clientUsername
					};
	
					sqlData = await sco.any(sqlStr, sqlParams);

					var invalidPasswordCount = sqlData[0].invalid_password_count;

					//if the ip hit the threashold, lock the account temporarily
					if(invalidPasswordCount >= cfg.login_attempts_allowed_per_interval)
					{
						bLockAccount = true;
						lockReason = "Too many invalid password attempts"
					}
				}
			}

			//lock the account if necessary
			if(bLockAccount)
			{
				sqlStr = `
				insert into account_ip_blacklist
				(txt_ip, txt_username, txt_reason, ts_start, ts_end, ts_last_updated, txt_last_updated_user, ts_created)
				values ($(txt_ip), $(txt_username), $(txt_reason), current_timestamp, current_timestamp + interval'$(login_account_lock_minutes) minute', current_timestamp, $(txt_last_updated_user), current_timestamp)
				`;

				sqlParams = {
					txt_ip: req.ip,
					txt_username: clientUsername,
					txt_reason: lockReason,
					login_account_lock_minutes: cfg.login_account_lock_minutes,
					txt_last_updated_user: cfg.pg_user
				};

				await sco.any(sqlStr, sqlParams);

				userMessage = "Invalid username/password. Too many attempts have been tried. This account now locked for " + cfg.login_account_lock_minutes + " minutes.";
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


	async secureApi(req, res) {
		console.log('inside secure api');
		var userMessage = "";
		var data = [];
		var userdata = req.userdata;

		if(userdata.bLoggedIn)
		{
			userMessage = "success";
			data = [
				{
					user_uid: 1,
					txt_username: "User1",
					txt_email: "User1@gmail.com"
				},
				{
					user_uid: 2,
					txt_username: "User2",
					txt_email: "User2@gmail.com"
				}
			];
		}


		var responseData = {
			userMessage: userMessage,
			data: data
		};		

		res.json(responseData);
	}
	

	async publicApi(req, res) {
		console.log('inside public api');
		var responseData = [
			{
				uid: 1,
				txt_title: "First Blog"
			},
			{
				uid: 2,
				txt_title: "I Wish this was Fucking Done"
			}
		];

		res.json(responseData)
	}
}

exports.UserLoginController = new UserLoginController();