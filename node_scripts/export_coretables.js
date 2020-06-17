/*
This node script is to export coretables out of the current environment and put into coretable migration files for the next environment.
*/

var cfg = require('./config_node_scripts.json');
var {Pool, Client} = require('pg');
var path = require('path');
var fs = require('fs');
var {Logger} = require('./Logger.js');
var moment = require('moment');

async function export_coretables() {

	//create local objects from external files
	var log = new Logger();

	//other stuff
	var bError = false;
	var coretableMigFilesDir = cfg.dct_coretable_migration_files_dir;
	var sqlStr = "";
	var sqlValues = [];
	

	//setup the log file
	var dt = new moment();
	var logFileDir = path.join(__dirname, '/logs/export_coretables');
	var logFileName = "export_coretables__" + dt.format("YYYY-MM-DD_HH-mm-ss");
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
		console.log("=== starting export_coretables ===");
		
		console.log('Connecting postgres client...');
		pgClient.connect();
		console.log('Done.');


		//1) look at coretables in database
		console.log('Reading coretables table from database...');
		sqlStr = `
		select *
		from coretables
		where i_delete_flag is null
		`;
		var res = await pgClient.query(sqlStr);
		console.log('Done.');


		if(res.rows.length)
		{
			//2)clear out coretables in the directory first
			console.log('Deleting existing coretables in coretable directory...');
			var allFileNamelist = await fs.readdirSync(coretableMigFilesDir);
			var jsonFileNameList = allFileNamelist.filter((x) => {return x.indexOf(".json") >= 0;});
			for(var i = 0; i < jsonFileNameList.length; i++)
			{
				fs.unlinkSync(path.join(coretableMigFilesDir, jsonFileNameList[i]));
			}			
			console.log('Done.');




			//3) For each core table in the list, select from the table in the database
			console.log('Creating coretable migration files...');
			for(var i = 0; i < res.rows.length; i++)
			{
				var coretable = res.rows[i].txt_table;

				try
				{
					//come at me hackers
					sqlStr = `
					select *
					from ` + coretable + `;
					`;
					
					var coretableData = await pgClient.query(sqlStr);

					//3) For each core table, create a core table migration file
					var migFileName = "coretable-migration__" + coretable + "__" + dt.format("YYYY-MM-DD_HH-mm-ss");
					var migrationFileFullPath = path.join(coretableMigFilesDir, migFileName + ".json");
					
					var data = {
						filename: migFileName,
						coretable: coretable,
						dtCreated: dt.format("YYYY-MM-DD_HH-mm-ss"),
						dtCreated_X: dt.format('X'),
						migrations: coretableData.rows,
						schema: coretableData.fields
					}

					await fs.writeFileSync(migrationFileFullPath, JSON.stringify(data));

					console.log("Coretable migration file '" + migFileName + "' was created at '" + coretableMigFilesDir + "'");
				}
				catch(ex)
				{
					console.log("Exception caught when creating coretable migration file for '" + coretable + "'. Skipping this coretable. Exception: " + ex);
				}
			}

			console.log('Done.');
		}
		else
		{
			console.log('There are no records in the coretables table. Exiting script.');
		}
	}
	catch(ex)
	{
		bError = true;
		console.log(ex);
	}

	pgClient.end();	
	console.log("=== ending export_coretables ===");
};

export_coretables();