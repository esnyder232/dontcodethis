const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const nodemailer = require('nodemailer');
const moment = require('moment');

class ValidFuncs {
	constructor() {}

	//check to see if the email meets the requirements
	//not supre good, but I got tired of trying the other huge regexes
	validateEmail(email) 
	{
		var bError = false;
		var results = "";
		var regex = /a/;

		if(!email || email.trim() == "")
		{
			bError = true;
		}
		else
		{
			email = email.trim();
		}

		regex = /\s/g; //cannot contain spaces
		if(!bError && regex.test(email))
		{
			bError = true;
		}

		//check if only 1 email exists
		regex = /(.@.)/g;
		if(!bError)
		{
			var matches = email.match(regex);

			if(!matches || matches.length != 1)
			{
				bError = true;
			}
		}

		if(bError)
		{
			results = `Email is invalid: it cannot be blank, cannot contain spaces, and must contain the '@' symbol.`;
		}
		else
		{
			results = "success";
		}
		
		return results;
	}

	validateUsername(username) 
	{
		var bError = false;
		var results = "";
		var regex = /a/;

		if(!username || username.trim() == "")
		{
			username = "";
			bError = true;
		}

		//check the username length
		if(!bError && username.length < 4 || username.length > 32)
		{
			bError = true;
		}

		//specific check for the work "null"
		if(!bError && username.toLowerCase() === "null")
		{
			bError = true;
		}

		//check for invalid characters in the username
		regex = /[^A-Za-z0-9\-\_]/;
		if(!bError && regex.test(username))
		{
			bError = true;
		}

		//if the username did not meet the requirements, return the error response
		if(bError)
		{
			if(username.toLowerCase() !== "null")
			{
				results = `The username did not meet the requirements: the length must be between 4-32 characters, and contain only letters, numbers, and no spaces. The following symbols are allowed: "-", "_"`;
			}
			else
			{
				results = "No.";
			}
		}
		else
		{
			results = "success";
		}

		return results;
	}

	validatePassword(password)
	{
		var bError = false;
		var results = "";
		var regex = /a/;
		
		if(!password || password.trim() == "")
		{
			bError = true;
		}

		//check the password length
		if(!bError && password.length < 8 || password.length > 32)
		{
			bError = true;
		}

		//check if atleast 1 letter is in the password
		regex = /[[A-Za-z]/;
		if(!bError && !regex.test(password))
		{
			bError = true;
		}

		//check if atleast 1 number is in the password
		regex = /[0-9]/;
		if(!bError && !regex.test(password))
		{
			bError = true;
		}

		//check if atleast 1 symbol is in the password
		regex = /[^A-Za-z0-9\s]/;
		if(!bError && !regex.test(password))
		{
			bError = true;
		}

		//if the password did not meet the requirements, return the error response
		if(bError)
		{
			results = "The password did not meet the requirements: the length must be between 8-32 characters, contains atleast 1 letter, contains atleast 1 number, and atleast 1 symbol.";
		}
		else
		{
			results = "success";
		}

		return results;
	}

	validateInt(i) {
		var bError = false;
		var results = "";

		var num = Number.parseInt(i, 10);
		bError = !Number.isInteger(num);

		if(bError)
		{
			results = "Error: not an integer.";
		}
		else
		{
			results = "success";
		}

		return results;

	}


	validateString(s) {
		var bError = false;
		var results = "";
		if(typeof s != "string") {
			bError = true;
		}

		if(berror)
		{
			results = "Error: string is either not a string or is blank.";
		}
		else
		{
			results = "success";
		}

		return results;
	}

	validateStringNotBlank(s) {
		var bError = false;
		var results = "";
		if(typeof s != "string" || s.trim() == "") {
			bError = true;
		}

		if(bError)
		{
			results = "Error: string is either not a string or is blank.";
		}
		else
		{
			results = "success";
		}

		return results;
	}

}

exports.ValidFuncs = new ValidFuncs();