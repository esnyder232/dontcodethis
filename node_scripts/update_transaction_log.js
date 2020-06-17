/*
This node script purpose is to read the post gres .csv log files, and import them into a postgres table called "transaction_log".
When this script runs, it runs using the connection information in the file "./config_node_scripts.json".
It does these things in order:
	2) Imports the log files into the "transaction_log" table.

It does some checking via sql statements to make sure that all log file entries that end up in "transaction_log" are unique.
So this script should guarantee that every statement in the log files shows up exactly once in the "transaction_log" table.
Logs for this script are in ./node_scripts/logs/update_transaction_log.
The "staging_transaction_log" is used so we can leverage the "COPY" command.
*/


var cfg = require('./config_node_scripts.json');
var {Pool, Client} = require('pg');
var path = require('path');
var fs = require('fs');
var {Logger} = require('./Logger.js');
var moment = require('moment');

async function import_schema() {

	//create local objects from external files
	var log = new Logger();

	//other stuff
	var bError = false;
	var pgLogFilesDir = cfg.postgres_logfiles_dir;
	var sqlStr = "";
	var sqlValues = [];
	

	//setup the log file
	var dt = new moment();
	var logFileDir = path.join(__dirname, '/logs/update_transaction_log');
	var logFileName = "update_transaction_log__" + dt.format("YYYY-MM-DD_HH-mm-ss");
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

	//create postgres client
	var pgClient = new Client({	
		user: cfg.pg_user,
		host: cfg.pg_host,
		database: cfg.pg_database,
		password: cfg.pg_password,
		port: cfg.pg_port
	});

	try 
	{
		console.log("=== starting update_ph_log ===");
		
		console.log('Connecting postgres client...');
		pgClient.connect();
		console.log('Done.');


		//1) get the last known entry's timestamp. If nothing is there, choose 1/1/2020 as the date
		res = await pgClient.query(`
		select coalesce(max(ts_log_time), '1/1/2020') as ts_max
		from transaction_log;
		`);
		
		var tsMax = moment(res.rows[0].ts_max);
		console.log("Most recent log entry in transaction_log: " + tsMax.format());




		//2) Get the list of log file names and parse out the dates.
		console.log("Looking for postgres csv logs in '" + pgLogFilesDir + "'...")
		var allFileNamelist = await fs.readdirSync(pgLogFilesDir);
		var csvFileNameList = allFileNamelist.filter((x) => {return x.indexOf(".csv") >= 0;});
		console.log("Done.");

		if(csvFileNameList.length == 0)
		{
			bError = true;
			console.log("No postgres csv logs found in '" + pgLogFilesDir + "'. Cannot continue with script.");
		}




		//3) Determine the list of log files to load, starting with the most recent prior record
		var sortedLogList = [];		
		if(!bError)
		{
			var logList = [];
			for(var i = 0; i < csvFileNameList.length; i++)
			{
				var dtString = csvFileNameList[i].replace("postgresql-", "").replace(".csv", "");
				var dt = moment(dtString, "YYYY-MM-DD-HHmmss");
				var temp = {
					filename: csvFileNameList[i],
					dt: dt
				};

				logList.push(temp);
			}

			sortedLogList = logList.sort((a,b) => {return a.dt.diff(b.dt, 'seconds');});
			var priorLogs = sortedLogList.filter((x) => {return x.dt.diff(tsMax, 'seconds') <= 0});
			var mostRecentPriorLogIndex = 0;
			var mostRecentPriorLogFilename = sortedLogList[0].filename;

			if(priorLogs.length > 0)
			{
				//since they are already sorted from least to greatest on date, just grab the first one in the list
				mostRecentPriorLogFilename = priorLogs[priorLogs.length-1].filename;
				mostRecentPriorLogIndex = sortedLogList.findIndex((x) => {return x.filename == mostRecentPriorLogFilename;});
			}
			
			console.log('Most recent prior log file found: ' + mostRecentPriorLogFilename + "'. Loading will begin with that file.");

			//splice off log files so that the only ones remaining are the most recent prior log and onward
			sortedLogList.splice(0, mostRecentPriorLogIndex);
		}




		//4) start loading from the most recent prior logfile onward
		if(!bError)
		{
			//load the log files
			for(var i = 0; i < sortedLogList.length; i++)
			{
				console.log("--- Now Loading '" + sortedLogList[i].filename + "' ---");

				//first truncate the staging table
				console.log('Truncating staging_transaction_log to prepare for loading...');
				sqlStr = `truncate table staging_transaction_log;`;

				res = await pgClient.query(sqlStr);
				console.log('Done.');

				//load into staging table
				console.log('Loading into staging table...');
				sqlStr = `select fn_copy_into_transaction_log($1);`;

				sqlValues.length = 0;
				sqlValues.push(sortedLogList[i].filename);
	
				res = await pgClient.query(sqlStr, sqlValues);
				console.log('Done.')

				//load into transaction table if the records don't already exist
				console.log('Loading into transaction_log table...');
				sqlStr = `
				insert into transaction_log
				(txt_logfile, ts_loaded, ts_log_time, txt_username, txt_dbname, txt_connection_from, txt_error_severity, 
				 txt_sql_state_code, txt_message, txt_detail, txt_hint, txt_query, txt_location, txt_application_name)
				select 
				$1
				, current_timestamp
				, stl.ts_log_time
				, stl.txt_username
				, stl.txt_dbname
				, stl.txt_connection_from
				, stl.txt_error_severity
				, stl.txt_sql_state_code
				, stl.txt_message
				, stl.txt_detail
				, stl.txt_hint
				, stl.txt_query
				, stl.txt_location
				, stl.txt_application_name
				from staging_transaction_log stl
				left join (
					select uid, ts_log_time, LOWER(txt_message) as txt_message
					from transaction_log 
				) tl on stl.ts_log_time = tl.ts_log_time and LOWER(stl.txt_message) = tl.txt_message
				where txt_error_severity = 'LOG'
				and tl.uid is null
				order by ts_log_time; `;

				sqlValues.length = 0;
				sqlValues.push(sortedLogList[i].filename);

				res = await pgClient.query(sqlStr, sqlValues);
				console.log('Done.');

				console.log("--- '" + sortedLogList[i].filename + "' done ---");

			}
		}
	}
	catch(ex)
	{
		bError = true;
		console.log(ex);
	}

	pgClient.end();	
	console.log("=== ending update_ph_log ===");
};


import_schema();


