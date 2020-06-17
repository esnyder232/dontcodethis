/*
This node script is to import coretables changes from the coretable migration directory.
*/

var cfg = require('./config_node_scripts.json');
var {Pool, Client} = require('pg');
var path = require('path');
var fs = require('fs');
var {Logger} = require('./Logger.js');
var moment = require('moment');

/*
1) Read coretable migrationfile from the directory
2) If there are files, for each file, truncate the coretable, load the data (including uid), and reseed the table
*/
async function import_coretables() {

	//create local objects from external files
	var log = new Logger();

	//other stuff
	var bError = false;
	var coretableMigFilesDir = cfg.dct_coretable_migration_files_dir;
	var sqlStr = "";
	var sqlValues = [];
	

	//setup the log file
	var dt = new moment();
	var logFileDir = path.join(__dirname, '/logs/import_coretables');
	var logFileName = "import_coretables__" + dt.format("YYYY-MM-DD_HH-mm-ss");
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
		console.log("=== starting import_coretables ===");
		
		console.log('Connecting postgres client...');
		pgClient.connect();
		console.log('Done.');

		//1) Read coretable migrationfile from the directory
		var finalMigList = []; //this is the final list of migration files to run in order from the directory

		console.log("Looking for coretable migration files in '" + coretableMigFilesDir + "'...")
		var allFileNamelist = await fs.readdirSync(coretableMigFilesDir);
		var jsonFileNameList = allFileNamelist.filter((x) => {return x.indexOf(".json") >= 0;});
		console.log("Done.");
		
		//if there are no migration files found, no need to continue.
		if(jsonFileNameList.length)
		{
			//2) If there are files, for each file, truncate the coretable, load the data (including uid), and reseed the table

			console.log('Now loading coretables from the coretable migration files.');

			for(var i = 0; i < jsonFileNameList.length; i++)
			{
				console.log("--- Now loading '" + jsonFileNameList[i] + "' ---");
				var data = null;
				var fullpath = path.join(coretableMigFilesDir, jsonFileNameList[i]);
	
				//a) read the migration file
				try 
				{
					console.log('Reading file...');
					var rawFileContents = await fs.readFileSync(fullpath);
					console.log('Done.');
	
					console.log('Parsing data...');
					data = JSON.parse(rawFileContents);
					console.log('Done.');

					var coretable = data.coretable;
					var coretableData = data.migrations;
					var coretableSchema = data.schema;




					//b) truncate the table
					console.log('Truncating table...');
					//come at me hackers
					sqlStr = "truncate table " + coretable + ";";
					res = await pgClient.query(sqlStr);
					console.log('Done.');




					//c) load the data
					console.log('Inserting data...');
					var insertPart = "insert into " + coretable + " ";
					var columnPart = "";
					var valuesPart = "";

					var columnArr = [];
					for(var j = 0; j < coretableSchema.length; j++)
					{
						columnArr.push(coretableSchema[j].name);
					}
					columnPart = "(" + columnArr.join(", ") + ") ";

					var valuesArr = [];
					var sqlParameters = [];
					var sqlParametersCounter = 1;
					for(var j = 0; j < coretableData.length; j++)
					{
						var rowOfVals = [];
						for(var k = 0; k < coretableSchema.length; k++)
						{
							var s = coretableSchema[k];
							var raw = coretableData[j][s.name];
							var sqlParam = "$" + sqlParametersCounter;
							
							rowOfVals.push(sqlParam);
							sqlParameters.push(raw);
							sqlParametersCounter++;
						}
						valuesArr.push("(" + rowOfVals.join(", ") + ")");
					}
					
					valuesPart = " OVERRIDING SYSTEM VALUE values " + valuesArr.join(", ");
					
					var finalSql = insertPart + columnPart + valuesPart;
					res = await pgClient.query(finalSql, sqlParameters);
					console.log("Done.");



					//d) reseed the table
					//again, don't care
					console.log("Reseeding table...");
					sqlStr = "select setval(pg_get_serial_sequence('" + coretable + "', 'uid'), (select max(uid) from " + coretable + "));";
					res = await pgClient.query(sqlStr);
					console.log("Done.");

				}
				catch(ex)
				{
					bReadError = true;
					console.log(ex);
					console.log("Exception was caught during file read. Skipping coretable file.")
				}

				console.log("--- Finished loading '" + jsonFileNameList[i] + "' ---");
			}

		}
		else
		{
			console.log("No coretable migration files found in '" + coretableMigFilesDir + "'. Exiting script.");
		}

		

	}
	catch(ex)
	{
		bError = true;
		console.log(ex);
	}

	pgClient.end();	
	console.log("=== ending import_coretables ===");
};

import_coretables();