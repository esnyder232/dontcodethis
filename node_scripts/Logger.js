var path = require('path');
var fs = require('fs');
var util = require('util');

/*
This is a logger that is used only with node_scripts js files.
This was built using node 12.14.1.
It is created to log to the console and a log file at the same time with a timestamp.
It does this by hijacking the console.log function, and logs the text to a file before it does the console log basically.

HOW TO USE IT:
Scenario 1) constructor
	var l = new Logger("C:/nodeProjects/myProject/logs/myLog.txt");
	l.startLog();
	console.log('hello from script'); <--this should show up in the console and the myLog.txt file.

Scenario 2) setLogPath:
	var l = new Logger();
	l.setLogFile("C:/nodeProjects/myProject/logs/myLog.txt");
	l.startLog();
	console.log('hello from script'); <--this should show up in the console and the myLog.txt file.

NOTES:
 - Its not super robust. There is only meant to be ONE log at a time per program...and there isn't really a way to revert console.log back to its original state.
 - Also, the constrcutor and setLogFile() functions are expecting a full path to the log file. 
 - startLog() returns a false if it succeeds, true otherwise. It logs the exception/errors to the console.log.
*/

var fs_writeFile = util.promisify(fs.writeFile);


class Logger {
	constructor(fullFilePath){
		this.logFileFullPath = fullFilePath;
	};

	setLogFile(fullFilePath)
	{
		this.logFileFullPath = fullFilePath;
	}

	startLog() {
		var bError = false;

		//create the log file first
		try {
			console.log('Creating log file...');
			fs.writeFileSync(this.logFileFullPath, "");
			console.log('Done.');
		}
		catch(ex)
		{
			bError = true;
			console.log('Error creating log file: ' + ex);
		}

		//hijack console.log, make it print to stdout and to the log file with a timestamp
		if(!bError)
		{
			try
			{
				var originalLogFunction = console.log;
				var that = this; //classic

				//for some reason, when this is an anonymous function the arguments length is 0....idk.
				console.log = function() {
					
					var logMsg = "";
					for(var i = 0; i < arguments.length; i++)
					{
						logMsg += arguments[i];
					}
			
					var timestamp = new Date().toISOString();
					var finalLog = timestamp + " - " + logMsg + "\n";
					
					fs.appendFileSync(that.logFileFullPath, finalLog);
					originalLogFunction.apply(console.log, arguments);
				};
			}
			catch(ex)
			{
				bError = true;
				console.log('Error hijacking console.log: ' + ex);
			}
		}

		return bError;
	}
};

exports.Logger = Logger;