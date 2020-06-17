/*
This node script is to import schema changes from the migration directory.
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


async function import_schema() {

	//create local objects from external files
	var log = new Logger();

	//other stuff
	var bError = false;
	var schemaMigFilesDir = cfg.dct_schema_migration_files_dir;
	var sqlStr = "";
	var sqlValues = [];
	

	//setup the log file
	var dt = new moment();
	var logFileDir = path.join(__dirname, '/logs/import_schema');
	var logFileName = "import_schema__" + dt.format("YYYY-MM-DD_HH-mm-ss");
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
		console.log("=== starting import_schema ===");
		
		console.log('Connecting postgres client...');
		pgClient.connect();
		console.log('Done.');

		
		//1) Query migartion_log_options and see if you are allowed to run imports for this environments.
		var isImportAllowed = false;

		sqlStr = `	
		select *
		from migration_log_options
		where i_delete_flag is null
		order by uid
		limit 1;
		`;
		res = await pgClient.query(sqlStr, sqlValues);


		if(res.rows.length)
		{
			isImportAllowed = res.rows[0].i_allow_imports == 1 ? true : false;
		}


		if(isImportAllowed)
		{
			console.log('Imports are allowed on this database.');
			var finalMigList = []; //this is the final list of migration files to run in order from the directory

			//2) Read migration logs from directory.
			console.log("Looking for schema migration files in '" + schemaMigFilesDir + "'...")
			var allFileNamelist = await fs.readdirSync(schemaMigFilesDir);
			var jsonFileNameList = allFileNamelist.filter((x) => {return x.indexOf(".json") >= 0;});
			console.log("Done.");
			
			//if there are no migration files found, no need to continue.
			if(jsonFileNameList.length == 0)
			{
				console.log("No schema migration files found in '" + schemaMigFilesDir + "'. Exiting script.");
			}
			else
			{
				//3) Order migration logs by date.
				var migList = []; 			//migration file list from directory
				var sortedMigList = []; 	//migration file list from directory sorted
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
		
				//sort from lease recent to most recent
				sortedMigList = migList.sort((a,b) => {return a.dt.diff(b.dt, 'seconds');});





				//4) Query migration logs from migration_log in database and order by date.
				console.log('Querying migration files in migration_log table...');
				sqlStr = `	
				select *
				from migration_log
				where i_delete_flag is null
				order by ts_loaded asc;
				`;
				res = await pgClient.query(sqlStr, sqlValues);
				console.log('Done.');




				//5) Determine the migration files to run for the databse: only run the migration files in the directory that are not found in the migration_log table.
				console.log('Comparing migration files from directory with the migration files in the table...');
				for(var i = 0; i < sortedMigList.length; i++)
				{
					var sqlRecord = res.rows.find((x) => {return x.txt_migration_file_name == sortedMigList[i].filename;})
					if(!sqlRecord)
					{
						finalMigList.push(sortedMigList[i]);
					}
				}
				console.log('Done.');




					
				//6) run the migration files statements in order if there are any
				if(finalMigList.length)
				{
					console.log('The following migration files have not ran yet for this database:');
					for(var i = 0; i < finalMigList.length; i++)
					{
						console.log(finalMigList[i].filename);
					}
					
					console.log('Now executing these migration files.');

					for(var i = 0; i < finalMigList.length; i++)
					{
						console.log("--- Now executing '" + finalMigList[i].filename + "' ---");
						var bReadError = false;
						var data = null;
						var fullpath = path.join(schemaMigFilesDir, finalMigList[i].filename);

						//a) read the migration file
						try 
						{
							console.log('Reading file...');
							var rawFileContents = await fs.readFileSync(fullpath);
							console.log('Done.');

							console.log('Parsing data...');
							data = JSON.parse(rawFileContents);
							console.log('Done.');
						}
						catch(ex)
						{
							bReadError = true;
							console.log(ex);
							console.log("Exception was caught during file read. Skipping migration file.")
						}

						if(!bReadError)
						{
							//b) execute the schema and log each error
							console.log('Executing migration sql statements...');							
							for(var j = 0; j < data.migrations.length; j++)
							{
								try
								{
									res = await pgClient.query(data.migrations[j].txt_message);
								}
								catch(ex)
								{
									console.log("Exception caught when running sql migration statement. Exception: " + ex);
									console.log("Migration record (sql statement is txt_message): " + JSON.stringify(data.migrations[j]))
								}
							}
							console.log('Done.')

							//c) insert record into migration_log
							try
							{
								console.log('Inserting record into migration_log table...');

								sqlStr = `
								insert into migration_log
								(txt_migration_file_name, ts_loaded)
								values ($1, current_timestamp)
								`;
								sqlValues.length = 0;
								sqlValues.push(finalMigList[i].filename);
								res = await pgClient.query(sqlStr, sqlValues);

								console.log('Done.')
							}
							catch(ex)
							{
								console.log("Exception caught when inserting into migration_log. Exception: " + ex);
								console.log("Sql Statement: " + sqlStr);
								console.log('Sql values: ' + JSON.stringify(sqlValues));
							}
						}

						console.log("--- Finished executing '" + finalMigList[i].filename + "' ---");
					}

				}
				else
				{
					console.log("All migration files were already ran for this database. Exiting script.");
				}
			}
		}
		else
		{
			console.log("Imports are not allowed for this database. Ending script.");
		}
	}
	catch(ex)
	{
		bError = true;
		console.log(ex);
	}

	pgClient.end();	
	console.log("=== ending import_schema ===");
};

import_schema();