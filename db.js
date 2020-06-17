const cfg = require.main.require('./config_dct.json')
const pgp = require('pg-promise')({});

// Preparing the connection details:
const cn = {
	user: cfg.pg_user,
	host: cfg.pg_host,
	database: cfg.pg_database,
	password: cfg.pg_password,
	port: cfg.pg_port,
	application_name: "dontcodethis.com",
	query_timeout: 60000
};

// Creating a new database instance from the connection details:
const db = pgp(cn);

// Exporting the database object for shared use:
module.exports = db;