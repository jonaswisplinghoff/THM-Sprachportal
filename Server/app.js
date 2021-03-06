var express = require('express');
var path = require('path');
var async = require('async');

var db = require('./db');

var Student = db.define('student', {
  id      : { type: "serial", key: true },
  name    : String,
  surname : String,
  matrikelnummer: {type: "text", unique: true},
  ani: {type: "text", unique: true}
}, {
  methods : {
    getFullName: function () {
      return this.name + " " + this.surname;
    },
    getMatrikelnummer: function () {
	  return this.matrikelnummer;
    }
  }
});

var Course = db.define('course', {
	id		:{type: "serial", key: true},
	classId	: String,
	classTitle: String,
	classDescription: { type: "text" },
	classWeekDay: {type: "enum", values: [ "Montags", "Dienstags", "Mitwochs", "Donnerstags", "Freitags", "Samstags", "Sonntags" ]}
}, {
  methods:{
	getClassId: function (){
		return this.classId;
	},
	getClassTitle: function() {
		return this.classTitle;
	},
	getClassDescription: function() {
		return this.classDescription;
	}
  }
});

var Log = db.define('log', {
	id		: {type: "serial", key: true},
	callId	: { type: "text"},
	timestamp: { type: "date", time: true },
	event: { type: "enum", values: [ "start", "menu", "end" ] },
	choice: String,
	ani: String
}, {
	methods:{
		getCallId: function(){
			return this.callId;
		},
		getTimeStamp: function(){
			return this.timestamp;
		},
		getEvent: function(){
			return this.event;
		},
		getChoice:function(){
			return this.choice;
		}
	}
});

// !SETUP DATABASE

	Student.sync(function(){});
	Course.sync(function(){});
    Log.sync(function(){});



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
		
	sendResponse = function(err, results){
		console.log("GET /   data: " + JSON.stringify(results));
		res.render('index', { title: 'THM Sprachportal Server', logs: results });
	}
	
	db.driver.execQuery("SELECT DISTINCT callId FROM sdi.log;", function (err, data) {
		if (err) {
			console.log("Something is wrong with the connection", err);
			return;
		}
				
		getCallJSON = function(data, callback){
			var call = {};
			call.callId = data.callId;
							
			Log.find({callId: call.callId, event : "start"}, 1, function (err, logs){
				if (err) {
					console.log("Something is wrong with the connection", err);
					return;
				}
			
				if(logs.length !=0){
					call.start = logs[0].timestamp;
					call.ani = logs[0].ani;
				}
				else{
					call.start = "";
					call.ani = "";
				}

				Student.find({ani: call.ani},1, function (err, student) {
				
					if (err) {
						console.log("Something is wrong with the connection", err);
						return;
					}
				
					if(student.length !=0){
						call.matrikelnummer = student[0].getMatrikelnummer();
						call.name = student[0].getFullName();
					}
					else{
						call.matrikelnummer = "";
						call.name = "";
					}
				
					Log.find({callId: call.callId, event : "end"}, 1, function (err, logs){
					
						if (err) {
							console.log("Something is wrong with the connection", err);
							return;
						}
					
						if(logs.length != 0){
							call.end = logs[0].timestamp;
						}
						else{
							call.end = "";
						}
						
						Log.find({callId: call.callId, event : "menu"}, {}, function (err, logs){
						
						if (err) {
							console.log("Something is wrong with the connection", err);
							return;
						}
						
							menus = [];
							for(var j=0; j<logs.length; j++){
								var choice = {};
								
								choice.timeStamp = logs[j].timestamp;
								choice.choice = logs[j].choice;
								
								menus.push(choice);
							}							
							call.menus = menus;
														
							callback(null, call);
						});
					});
				});
			});
		}
		
		async.map(data, getCallJSON, sendResponse);
	});		
});

app.get('/reports/start', function (req, res) {
   console.log('GET /reports/start callId: ' + req.query.callId + ' timestamp: ' + req.query.timestamp + ' ani: ' + req.query.ani);
   var response = {};
      
   if(typeof req.query.callId != "undefined" && 
   		typeof req.query.timestamp != "undefined" && 
   		typeof req.query.ani != "undefined"){	

	   	var newLog = {};
	   	newLog.callId = req.query.callId;
	   	newLog.timestamp = req.query.timestamp;
	   	newLog.event = "start";
	   	newLog.ani = req.query.ani;
	   	Log.create(newLog, function(err, results) {
			if (err) {
		    	console.log("Something is wrong with the log creation", err);
		    	return;
			}
		});

		Student.find({ani:req.query.ani}, function(err, persons){
			if (err) {
		    	console.log("Something is wrong with the connection", err);
		    	return;
			}
			if(persons.length == 1){
				response.status = "ok";
				response.name = persons[0].getFullName();
				res.send(response);
			}
			else{
				response.status = "ok";
				response.name = "";
				res.send(response);
			}
		});
   }
   else{
   		response.status = "not_ok";
   		response.name = "";
   		res.send(response);
   }
});

app.get('/reports/menu', function (req, res) {
   console.log('GET /reports/menu callId: ' + req.query.callId + ' timestamp: ' + req.query.timestamp + ' choice: ' + req.query.choice);
   res.contentType = 'json';
   var response = {};

   if(typeof req.query.callId != "undefined" && 
   		typeof req.query.timestamp != "undefined" && 
   		typeof req.query.choice != "undefined"){	
   		
   		var newLog = {};
	   	newLog.callId = req.query.callId;
	   	newLog.timestamp = req.query.timestamp;
	   	newLog.event = "menu";
	   	newLog.choice = req.query.choice;
	   	Log.create(newLog, function(err, results) {
			if (err) {
		    	console.log("Something is wrong with the log creation", err);
		    	return;
			}
		});
		response.status = "ok";
		res.send(response);
   }
   else{
   		response.status = "not_ok";
   		res.send(response);
   }
});

app.get('/reports/end', function (req, res) {
   console.log('GET /reports/end callId: ' + req.query.callId + ' timestamp: ' + req.query.timestamp);
   res.contentType = 'json';
   var response = {};

   if(typeof req.query.callId != "undefined" && 
   		typeof req.query.timestamp != "undefined"){	
	   		
	   		var newLog = {};
		   	newLog.callId = req.query.callId;
		   	newLog.timestamp = req.query.timestamp;
		   	newLog.event = "end";
		   	Log.create(newLog, function(err, results) {
				if (err) {
			    	console.log("Something is wrong with the log creation", err);
			    	return;
				}
			});
   			response.status = "ok";
   			res.send(response);	
   }
   else{
	   		response.status = "not_ok";
	   		res.send(response);
   }
});

app.get('/matrikelnummer', function (req, res) {
   console.log('GET /matrikelnummer id: ' + req.query.callId + ' matrikelnummer: ' + req.query.matrikelnummer);
   res.contentType = 'json';
   var response = {};

   if(typeof req.query.callId != "undefined" && 
   		typeof req.query.matrikelnummer != "undefined"){	

	   	Student.find({matrikelnummer: req.query.matrikelnummer}, function(err, persons){
			if (err) {
		    	console.log("Something is wrong with the connection", err);
		    	return;
			}
			if(persons.length == 1){
				response.status = "ok";
				response.name = persons[0].getFullName();
				res.send(response);
			}
			else{
				response.status = "ok";
				response.name = "";
				res.send(response);
			}
		});
   }
   else{
   		response.status = "not_ok";
		response.name = "";
		res.send(response);
   }
});


app.get('/class', function (req, res) {
   console.log('GET /class callId: ' + req.query.callId + ' classId: ' + req.query.classId);
   res.contentType = 'json';
   var response = {};

   if(typeof req.query.callId != "undefined" && typeof req.query.classId != "undefined"){	
   
   		Course.find({classId: req.query.classId}, function(err, classes){
	   		if (err) {
		    	console.log("Something is wrong with the connection", err);
		    	return;
			}
	   		if(classes.length == 1){
	   			response.status = "ok";
	   			response.classId = classes[0].getClassId();
	   			response.classTitle = classes[0].getClassTitle();
	   			response.description = classes[0].getClassDescription();
	   			res.send(response);
	   		}
	   		else{
	   			response.status = "not_ok";
	   			response.classId = "";
	   			response.classTitle = "";
	   			response.description = "";
	   			res.send(response);
		   	}
   		});
   }
   else{
   		response.status = "not_ok";
		response.classId = "";
		response.classTitle = "";
		response.description = "";
		res.send(response);
   }
});



/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
