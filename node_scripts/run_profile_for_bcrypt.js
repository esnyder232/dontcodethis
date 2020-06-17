/*
This node script is to run a profile check for bcrypt's hash runction.
Its purpose is to list out the "time in ms it takes to run a hash against a known password" vs "salt rounds".
This data is then used to configure the number of salt rounds that should be used when creating passwords.

This does not automatically set a "salt round" config value anywhere. 
It is up to the user to guage how many salt round they want based on the table in the results.
I read online somewhere that around 250ms is a nice goal.
*/


var cfg = require('./config_node_scripts.json');
var path = require('path');
var fs = require('fs');
var {Logger} = require('./Logger.js');
var moment = require('moment');
var bcrypt = require('bcrypt');

async function run_profile_for_bcrypt() {

	//create local objects from external files
	var log = new Logger();

	//other stuff
	var bError = false;	

	//setup the log file
	var dt = new moment();
	var logFileDir = path.join(__dirname, '/logs/run_profile_for_bcrypt');
	var logFileName = "run_profile_for_bcrypt__" + dt.format("YYYY-MM-DD_HH-mm-ss");
	var logFileFullPath = path.join(logFileDir, logFileName + ".txt");

	//create the log directories if it they don't exist
	await fs.mkdirSync(logFileDir, {recursive: true});
	log.setLogFile(logFileFullPath);

	//start the logfile
	bError = log.startLog();

	//if log isn't created, return immediately
	if(bError)
	{
		console.log('Log not created. A log file needs to be created before this script can run.');
		return;
	}


	try 
	{
		console.log("=== starting run_profile_for_bcrypt ===");
		
		//password to hash
		var passwordTest = "=H6_0cd\[yAX8gxJ"

		//results of time vs hashing is stored here
		var results = [];

		//perform hashes
		for(var i = 0; i < 20; i++)
		{
			var dateStart = new Date();
			var hash = await bcrypt.hash(passwordTest, i);
			var timeLength = new Date() -  dateStart;

			var dateStartCompare = new Date();
			var result = await bcrypt.compare(passwordTest, hash);
			var timeLengthCompare = new Date() -  dateStartCompare;

			results.push({
				salt_rounds: i,
				hash_time: timeLength,
				compare_time: timeLengthCompare
			})

			//only do a maximum number of rounds up to 1 seccond. So we're not waiting forever.
			if(timeLength > 1000)
			{
				break;
			}

		}

		console.table(results);
	}
	catch(ex)
	{
		console.log(ex);
	}

	console.log("=== ending run_profile_for_bcrypt ===");
};

run_profile_for_bcrypt();