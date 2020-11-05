const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const port = 5000;
const db = require.main.require('./db.js');
const cfg = require.main.require('./config_dct.json');
const {GenFuncs} = require.main.require('./gen-funcs.js')

//require each controller
const {UserLoginController} = require("./controllers/user-login-controller.js");
const {UserCreateController} = require("./controllers/user-create-controller.js");
const {UserVerificationController} = require("./controllers/user-verification-controller.js");
const {UserForgotUsernameController} = require("./controllers/user-forgot-username-controller.js");
const {UserForgotPasswordController} = require("./controllers/user-forgot-password-controller.js");
const {UserResetPasswordController} = require("./controllers/user-reset-password-controller.js");
const {AppController} = require("./controllers/app-controller.js");
const {AdminBlogController} = require("./controllers/admin-blog-controller.js");
const {BlogListController} = require("./controllers/blog-list-controller.js");
const {BlogDetailsController} = require("./controllers/blog-details-controller.js");
const {UserAccountController} = require("./controllers/user-account-controller.js");
const {StockheimerEventToolController} = require("./controllers/stockheimer-event-tool-controller.js");

//middlware to get the user data from the database based on the session cookie
var MW_GetUserData = async function (req, res, next) {
	var sco = null;
	var sqlUserData = [];
	var sessionCookie = "";
	var userdata = {
		uid: null,
		username: null,
		email: null,
		bAdmin: false,
		bLoggedIn: false
	};

	try
	{
		//get signed cookie and see if the session exists
		 sessionCookie = req.signedCookies["session"];

		if(sessionCookie)
		{
			//look up a user in database with the sessionCookie
			sco = await db.connect();

			//find the user in the db
			sqlStr = `
			select uid, txt_username, txt_email, b_is_admin
			from users
			where i_delete_flag is null
			and lower(txt_status) = 'activated'
			and txt_session_cookie = $(txt_session_cookie)
			`;

			sqlParams = {
				txt_session_cookie: sessionCookie
			};

			sqlUserData = await sco.any(sqlStr, sqlParams);

			if(sqlUserData.length == 1)
			{
				userdata.uid = sqlUserData[0].uid;
				userdata.username = sqlUserData[0].txt_username;
				userdata.email = sqlUserData[0].txt_email;
				userdata.bAdmin = sqlUserData[0].b_is_admin;
				userdata.bLoggedIn = true;
			}
		}
	}
	catch(ex) {
		GenFuncs.logErrorGeneral(req.path, "Exception caught in MW_GetUserData: " + ex, ex.stack, userdata.uid, null);
	}
	finally{
		if(sco)
		{
			sco.done();
		}
	}

	req.userdata = userdata;

	next();
}

//this puts the "X-Real_Ip" header set by the proxy to be the req.ip string in the request objects.
app.set("trust proxy", true);

//add middleware to pipeline
app.use(express.json()); //for parsing application/json
app.use(express.urlencoded({extended: false})); //for parsing application/x-www-form-urlencoded
app.use(cookieParser(cfg.session_cookie_secret)); //for sessions

//static files
app.use('/favicon.ico', express.static(path.join(__dirname, "/facicon.ico")));
app.use('/scripts', express.static(path.join(__dirname, "/scripts")));
app.use('/src', express.static(path.join(__dirname, "/src")));
app.use('/images', express.static(path.join(__dirname, "/images")));
app.use('/third_party_libs', express.static(path.join(__dirname, "/third_party_libs")));

//index
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});


//web apis
app.get('/api/App/initializeApp', MW_GetUserData, AppController.initializeApp);
app.post('/api/App/logout', MW_GetUserData, AppController.logout);

app.post('/api/UserCreate/createUser', MW_GetUserData, UserCreateController.createUser);
app.post('/api/UserVerification/verifyUser', MW_GetUserData, UserVerificationController.verifyUser);

app.post('/api/UserLogin/login', MW_GetUserData, UserLoginController.login);

app.get('/api/UserLogin/publicApi', MW_GetUserData, UserLoginController.publicApi);
app.get('/api/UserLogin/secureApi', MW_GetUserData, UserLoginController.secureApi);

app.get('/api/UserAccount/getDetails', MW_GetUserData, UserAccountController.getDetails);
app.post('/api/UserAccount/saveDetails', MW_GetUserData, UserAccountController.saveDetails);


app.post('/api/UserForgotUsername/forgotUsername', MW_GetUserData, UserForgotUsernameController.forgotUsername);
app.post('/api/UserForgotPassword/forgotPassword', MW_GetUserData, UserForgotPasswordController.forgotPassword);
app.post('/api/UserResetPassword/verifyResetPasswordToken', MW_GetUserData, UserResetPasswordController.verifyResetPasswordToken);
app.post('/api/UserResetPassword/resetPassword', MW_GetUserData, UserResetPasswordController.resetPassword);

app.get('/api/AdminBlog/getList', MW_GetUserData, AdminBlogController.getList);
app.get('/api/AdminBlog/getDetails', MW_GetUserData, AdminBlogController.getDetails);
app.post('/api/AdminBlog/saveDetails', MW_GetUserData, AdminBlogController.saveDetails);

app.get('/api/BlogList/getList', MW_GetUserData, BlogListController.getList);
app.get('/api/BlogDetails/getDetails', MW_GetUserData, BlogDetailsController.getDetails);
app.get('/api/BlogDetails/getComments', MW_GetUserData, BlogDetailsController.getComments);
app.post('/api/BlogDetails/saveComment', MW_GetUserData, BlogDetailsController.saveComment);

app.get('/api/StockheimerEventTool/getList', MW_GetUserData, StockheimerEventToolController.getList);
app.get('/api/StockheimerEventTool/getDetails', MW_GetUserData, StockheimerEventToolController.getDetails);
app.post('/api/StockheimerEventTool/saveDetails', MW_GetUserData, StockheimerEventToolController.saveDetails);
app.post('/api/StockheimerEventTool/exportDetails', MW_GetUserData, StockheimerEventToolController.exportDetails);

//run the server
app.listen(port, () => console.log(`DontCodeThis.com listening on port ${port}!`));

