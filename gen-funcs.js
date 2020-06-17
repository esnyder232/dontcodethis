const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const nodemailer = require('nodemailer');
const moment = require('moment');

class GenFuncs {
	constructor() {}

	async sendEmail(mailOptions, auditOptions) {
		if(!auditOptions)
		{
			auditOptions = {};
		}

		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		
		var mta = nodemailer.createTransport({
			host: cfg.email_host,
			port: cfg.email_port,
			secure: cfg.email_isSecure,
			auth: {
				type: "OAuth2",
				user: cfg.email_user,
				clientId: cfg.email_clientId,
				clientSecret: cfg.email_clientSecret,
				refreshToken: cfg.email_refreshToken
			}
		});

		var info = await mta.sendMail(mailOptions);

		if(info.accepted.length != 0)
		{
			//log the email in audit_email table
			try {
				sco = await db.connect();

				sqlStr = `
				insert into audit_email
				(txt_email_type, txt_to, txt_subject, i_user_id, txt_username, ts_last_updated, txt_last_updated_user, ts_created)
				values ($(txt_email_type), $(txt_to), $(txt_subject), $(i_user_id), $(txt_username), current_timestamp, $(txt_last_updated_user), current_timestamp)
				`;

				sqlParams = {
					txt_email_type: auditOptions.txt_email_type,
					txt_to: mailOptions.to,
					txt_subject: mailOptions.subject,
					i_user_id: auditOptions.i_user_id,
					txt_username: auditOptions.txt_username,
					txt_last_updated_user: cfg.pg_user
				};

				await sco.any(sqlStr, sqlParams);
			}
			catch(ex) {
				GenFuncs.logErrorGeneral("genFuncs.sendEmail", "Exception caught in when logging to audit_email table: " + ex, ex.stack, userdata.uid, userMessage);
			}
			finally{
				if(sco)
				{
					sco.done();
				}
			}
		}

		return info;
	}


	//GenFuncs.logErrorGeneral(this.location, "Exception caught in try catch: " + ex, ex.stack, userdata.uid);
	//this logs the error to both the txt file and the audit_error table.
	async logErrorGeneral(txt_location, txt_msg, txt_msg_details, i_user_id, userMessage) {
		
		//log to text file first
		this.logErrorTextfile(txt_location, txt_msg, txt_msg_details, i_user_id, userMessage)
		
		//log to audit error table second
		this.logErrorAuditErrorTable(txt_location, txt_msg, txt_msg_details, i_user_id, userMessage);
	}


	//this logs the error to the txt file
	async logErrorTextfile(location, msg, msgDetails, userId, userMessage) {
		//temporarily just console logging
		var dt = new moment();
		var errorMessage = dt.format("YYYY-MM-DD_HH-mm-ss") + ": " + msg + "\n" +
		"location: " + location + "\n" +
		"details: " + msgDetails + "\n" + 
		"userId: " + userId + "\n" + 
		"userMessage: " + userMessage;

		console.log(errorMessage);
	}


	//this logs the error to the audit_error table
	logErrorAuditErrorTable(txt_location, txt_msg, txt_msg_details, i_user_id, txt_user_message) {

		//don't have to do async here. No reason to wait, just fire and forget the error to the database.
		var sco = null;
		var sqlStr = `
		insert into audit_error
		(txt_location, txt_msg, txt_msg_details, i_user_id, ts_last_updated, txt_last_updated_user, ts_created, txt_user_message)
		values ($(txt_location), $(txt_msg), $(txt_msg_details), $(i_user_id), current_timestamp, $(txt_last_updated_user), current_timestamp, $(txt_user_message))
		`;
		var sqlParams = {
			txt_location: txt_location,
			txt_msg: txt_msg,
			txt_msg_details: txt_msg_details,
			i_user_id: i_user_id,
			txt_last_updated_user: cfg.pg_user,
			txt_user_message: txt_user_message
		};

		
		return db.connect()		
		.then((scoInner) => {
			sco = scoInner;
			return sco.any(sqlStr, sqlParams);
		})
		.catch((ex) => {
			//log THIS error to the txt file so atleast we can track it somehow.
			this.logErrorTextfile("logErrorAuditErrorTable", "Exception Caught: " + ex, "sqlStr: " + sqlStr + ". sqlParams: " + JSON.stringify(sqlParams), i_user_id);
		})
		.finally(() => {
			if(sco)
			{
				sco.done();
			}
		});
	}

	//parses booleans so they can be inserted into the database
	parseBool(b)
	{
		var result = null;

		if(typeof b === 'boolean')
		{
			result = b;
		}
		else if(typeof b === 'string')
		{
			if(b.trim().toLowerCase() === 'true')
			{
				result = true;
			}
			else if(b.trim().toLowerCase() === 'false')
			{
				result = false;
			}
		}

		return result;
	}

	parseDatetime(dt)
	{
		var result = null;
		if(typeof dt === 'string' && dt.trim() !== "")
		{
			var m = new moment(dt.trim());
			if(m.isValid())
			{
				result = m.format();
			}
			
			var stophere = true;
		}

		return result;
	}

}

exports.GenFuncs = new GenFuncs();