/*
This node script just creates the migration tables for the current environments.
This is just so I don't have to remember to create them if I ever want another environments.
I can just run this script instead.
*/


var cfg = require('./config_node_scripts.json');
var {Client} = require('pg');
var path = require('path');
var fs = require('fs');
var {Logger} = require('./Logger.js');
var moment = require('moment');

async function create_migration_tables() {

	//create local objects from external files
	var log = new Logger();

	//other stuff
	var bError = false;
	var sqlStr = "";
	

	//setup the log file
	var dt = new moment();
	var logFileDir = path.join(__dirname, '/logs/create_migration_tables');
	var logFileName = "create_migration_tables__" + dt.format("YYYY-MM-DD_HH-mm-ss");
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
		console.log("=== starting create_migration_tables ===");
		
		console.log('Connecting postgres client...');
		pgClient.connect();
		console.log('Done.');

		//create the tables if they don't exist
		console.log('Creating migration tables...');
		sqlStr = `
		CREATE TABLE if not exists transaction_log
		(
			uid int generated always as identity,
			txt_logfile text,
			ts_loaded timestamp,
			ts_log_time timestamp(3) with time zone,
			txt_username text,
			txt_dbname text,
			txt_connection_from text,
			txt_error_severity text,
			txt_sql_state_code text,
			txt_message text,
			txt_detail text,
			txt_hint text,
			txt_query text,
			txt_location text,
			txt_application_name text
		);
		
		CREATE TABLE if not exists staging_transaction_log
		(
			ts_log_time timestamp(3) with time zone,
			txt_username text,
			txt_dbname text,
			i_process_id integer,
			txt_connection_from text,
			txt_session_id text,
			i_session_line_num bigint,
			txt_command_tag text,
			ts_session_start_time timestamp with time zone,
			txt_virtual_transaction_id text,
			i_transaction_id bigint,
			txt_error_severity text,
			txt_sql_state_code text,
			txt_message text,
			txt_detail text,
			txt_hint text,
			txt_internal_query text,
			i_internal_query_pos integer,
			txt_context text,
			txt_query text,
			i_query_pos integer,
			txt_location text,
			txt_application_name text
		);

		create table if not exists migration_log (
			uid int generated always as identity,
			txt_migration_file_name text,
			ts_loaded timestamp,
			i_delete_flag int
		);
		
		create table if not exists migration_log_options (
			uid int generated always as identity,
			i_allow_imports int,
			i_delete_flag int,
			ts_last_updated	timestamp
		);
		create table if not exists coretables (
			uid int generated always as identity,
			txt_table text,
			i_delete_flag int,
			ts_last_updated text
		);		
		`;		

		res = await pgClient.query(sqlStr);
		console.log('Done.');
	}
	catch(ex)
	{
		bError = true;
		console.log(ex);
	}

	pgClient.end();	
	console.log("=== ending create_migration_tables ===");
};

create_migration_tables();