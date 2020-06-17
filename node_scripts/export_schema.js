/*
This node script is to export schema changes out from the transaction_log, and put schema changes in migration files for the next environment.
File name format:
schema-migration__5783291643__2020-08-03_11-59-15.json
schema-migration__X__YYYY-MM-DD_HH-mm-ss
X: epoch seconds since 1990
*/


var cfg = require('./config_node_scripts.json');
var {Pool, Client} = require('pg');
var path = require('path');
var fs = require('fs');
var {Logger} = require('./Logger.js');
var moment = require('moment');

async function export_schema() {

	//create local objects from external files
	var log = new Logger();

	//other stuff
	var bError = false;
	var schemaMigFilesDir = cfg.dct_schema_migration_files_dir;
	var sqlStr = "";
	var sqlValues = [];
	

	//setup the log file
	var dt = new moment();
	var logFileDir = path.join(__dirname, '/logs/export_schema');
	var logFileName = "export_schema__" + dt.format("YYYY-MM-DD_HH-mm-ss");
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
		console.log("=== starting export_schema ===");
		
		console.log('Connecting postgres client...');
		pgClient.connect();
		console.log('Done.');

		
		//1) Read the existing migration files, and determine the start date of schema changes
		console.log("Looking for schema migration files in '" + schemaMigFilesDir + "'...")
		var allFileNamelist = await fs.readdirSync(schemaMigFilesDir);
		var jsonFileNameList = allFileNamelist.filter((x) => {return x.indexOf(".json") >= 0;});
		console.log("Done.");

		



		//2) Determine when to start pulling changes from the transaction_log
		var dtStart = null;

		//if there are no migration files found, just default the time to be 1/1/2020.
		if(jsonFileNameList.length == 0)
		{
			dtStart = moment("01/01/2020", "MM/DD/YYYY");
			console.log("No schema migration files found in '" + schemaMigFilesDir + "'. Using '" + dtStart.format() + "' as the start date for exporting schema changes.");			
		}
		else
		{
			var migList = [];
			var sortedMigList = [];
			for(var i = 0; i < jsonFileNameList.length; i++)
			{
				//schema-migration__5783291643__2020-08-03_11-59-15.json			
				var tempFilename = jsonFileNameList[i].replace(".json", "");
				var filenameSplitArr = tempFilename.split("__");
				var epochTime = filenameSplitArr[1];
	
				var dt = moment(epochTime, "X");
				var temp = {
					filename: jsonFileNameList[i],
					dt: dt
				};
	
				migList.push(temp);
			}
	
			//sort from most recent to least recent
			sortedMigList = migList.sort((a,b) => {return b.dt.diff(a.dt, 'seconds');});
	
			dtStart = sortedMigList[0].dt;
			console.log('Most recent migration file found: ' + sortedMigList[0].filename + "'. Using '" +  dtStart.format() + "' as the start date for exporting schema changes.");
		}
		




		//3) Query all sql changes from the transaction_log from the most recent timestamp onward
		//- If there are no schema changes, console log that there wasn't any, and don't create the migration file
		//- If there are schema changes, create the migration file.

		//get the general_log with only schema changes
		sqlStr = `
		select tl.ts_log_time, REPLACE(tl.txt_message, 'statement: ', '') as txt_message
		from transaction_log tl
		inner join (
			select tlStatements.uid
			from (
				select *
				from (
					select uid, ts_log_time, LOWER(txt_message) as txt_message
					from transaction_log
					where ts_log_time >= $1
				) tl
				where 
				txt_message like 'statement:%'
				and
				txt_message not like '%create%table%transaction_log%'
				and
				txt_message not like '%drop%table%transaction_log%'
				and
				txt_message not like '%create%table%staging_transaction_log%'
				and
				txt_message not like '%drop%table%staging_transaction_log%'
				and
				txt_message not like '%create%table%migration_log%'
				and
				txt_message not like '%drop%table%migration_log%'
				and
				txt_message not like '%create%table%migration_log_options%'
				and
				txt_message not like '%drop%table%migration_log_options%'
				and
				txt_message not like '%create%table%coretables%'
				and
				txt_message not like '%drop%table%coretables%'
			) tlStatements
			where
			(txt_message like '%create%table%' AND txt_message not like '%temporary%table%')
			OR (txt_message like '%alter%table%' AND txt_message not like '%temporary%table%')
			OR (txt_message like '%drop%table%' AND txt_message not like '%temp_%')
		
			OR (txt_message like '%create%function%')
			OR (txt_message like '%replace%function%')
			OR (txt_message like '%alter%function%')
			OR (txt_message like '%drop%function%')
		
			OR (txt_message like '%create%view%')
			OR (txt_message like '%replace%view%')
			OR (txt_message like '%alter%view%')
			OR (txt_message like '%drop%view%')
		
			OR (txt_message like '%create%trigger%')
			OR (txt_message like '%replace%trigger%')
			OR (txt_message like '%alter%trigger%')
			OR (txt_message like '%drop%trigger%')
		
			OR (txt_message like '%create%procedure%')
			OR (txt_message like '%replace%procedure%')
			OR (txt_message like '%alter%procedure%')
			OR (txt_message like '%drop%procedure%')
		
			OR (txt_message like '%create%index%')
			OR (txt_message like '%replace%index%')
			OR (txt_message like '%drop%index%')
		) tlSchemaChanges on tl.uid = tlSchemaChanges.uid
		order by tl.ts_log_time asc;		
		`;
		sqlValues.length = 0;
		sqlValues.push(dtStart.format());

		res = await pgClient.query(sqlStr, sqlValues);

		//create a migration file
		if(res.rows.length > 0)
		{
			console.log('Schema changes found in transaction log.');
			console.log('Creating migration file...');
			//schema-migration__5783291643__2020-08-03_11-59-15.json
			var dtNow = moment();

			var migFileName = "schema-migration__" + dtNow.format('X') + "__" + dtNow.format("YYYY-MM-DD_HH-mm-ss");
			var migrationFileFullPath = path.join(schemaMigFilesDir, migFileName + ".json");

			var data = {
				filename: migFileName,
				dtCreated: dtNow.format("YYYY-MM-DD_HH-mm-ss"),
				dtCreated_X: dtNow.format('X'),
				migrations: res.rows
			}

			await fs.writeFileSync(migrationFileFullPath, JSON.stringify(data));

			console.log("Done. Migration file '" + migFileName + "' was created at '" + schemaMigFilesDir + "'");
		}
		else
		{
			console.log('No schema changes detected in transaction_log. No migration file made.');
		}


	}
	catch(ex)
	{
		bError = true;
		console.log(ex);
	}

	pgClient.end();	
	console.log("=== ending export_schema ===");
};

export_schema();