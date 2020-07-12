const cfg = require.main.require('./config_dct.json');
const db = require.main.require('./db.js');
const {GenFuncs} = require.main.require('./gen-funcs.js')
const {ValidFuncs} = require.main.require('./valid-funcs.js')

class BlogListController {

	constructor() {
		
	}

	async getList(req, res) {
		var bError = false;
		var sco = null;
		var sqlStr = "";
		var sqlParams = {};
		var sqlData = [];
		var userMessage = "";
		var data = {};
		var userdata = {};
		var list = [];

		try {
			userdata = req.userdata;
			sco = await db.connect();
			
			//get aurelia app routes and nav bar so the site will load
			if(!bError)
			{
				sqlStr = `
				select uid, txt_title, txt_url_slug, ts_publish_date, coalesce(i_hit_count, 0) as i_hit_count
				from blog
				where i_delete_flag is null
				and b_publish = true
				and ts_publish_date <= current_timestamp
				order by ts_publish_date desc
				`;
	
				sqlData = await sco.any(sqlStr, sqlParams);

				if(sqlData.length > 0)
				{
					list = sqlData;
				}
				else
				{
					bError = true;
					userMessage = "Error when getting blog list.";
				}
			}
		}
		catch(ex) {
			userMessage = "Internal server error.";
			GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			var bError = true;
		}
		finally{
			if(sco)
			{
				sco.done();
			}
		}

		//send the response
		var statusResponse = 200;
		if(bError)		
			statusResponse = 500;

		data.list = list;

		res.status(statusResponse).json({userMessage: userMessage, data: data});
	}
}

exports.BlogListController = new BlogListController();