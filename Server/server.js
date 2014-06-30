var express = require('express');
var app = express();

var orm = require("orm"); 

var config = require('./config');

var db = orm.connect(config.dbUrl);

db.on("connect", function (err) {
    if (err) {
        console.log("Something is wrong with the connection", err);
        return;
    }

    console.log("Database connected!");
    
});

// !MODELS

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
	callId	: { type: "number"},
	timestamp: { type: "date", time: true },
	event: { type: "enum", values: [ "start", "menu", "end" ] },
	choice: String
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

db.drop(function(){
	Student.sync(function(){
		var newStudent ={};
		newStudent.name = "Max";
		newStudent.surname = "Mustermann";
		newStudent.matrikelnummer = "123456";
		newStudent.ani = "0800111111";
		Student.create(newStudent, function(err, results){
			if (err) {
		    	console.log("Something is wrong with the student creation", err);
		    	return;
			}
		});
	});
	Course.sync(function(){
		var newCourse = {};
		newCourse.classId = "MM14";
		newCourse.classTitle = "Konzeption von Sprachdialogsystemen und Realisierung von Sprachportalen";
		newCourse.classDescription = "Vorlesung: Architektur und Komponenten von Voice Plattformen (Voice Engines und Prozesse), Konzeptionierung eines Voice-User-Interfaces (Dialogstrukturen, Prompting und Persona Design), Dialog Implementierung (VoiceXML, Grammatikerstellung, Audioaufbereitung) Konzeption und Aufbau eines Sprachportals, Dynamische Dialoge mit Content aus Datenbank, Planung und Management von Sprachprojekten Ausblick auf multimodale Interaktionssysteme. Praktikum: Programmierung eines Sprachdialogs in VoiceXML; Realisierung eines Sprachportals mit dynamischen Content aus Datenbank.";
		Course.create(newCourse, function(err, results){
			if (err) {
		    	console.log("Something is wrong with the course creation", err);
		    	return;
			}
		});
	});
    Log.sync(function(){});
}); 

// !REQUEST HANDLER

// TODO: check incoming timestamps for valid format 

app.post('/reports/start', express.timeout(5000), function (req, res, next) {
   console.log('POST /reports/start callId: ' + req.query.callId + ' timestamp: ' + req.query.timestamp + ' ani: ' + req.query.ani);
   var response = {};
      
   if(typeof req.query.callId != "undefined" && 
   		typeof req.query.timestamp != "undefined" && 
   		typeof req.query.ani != "undefined"){	

	   	var newLog = {};
	   	newLog.callId = req.query.callId;
	   	newLog.timestamp = req.query.timestamp;
	   	newLog.event = "start";
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

app.post('/reports/menu', function (req, res, next) {
   console.log('POST /reports/menu callId: ' + req.query.callId + ' timestamp: ' + req.query.timestamp + ' choice: ' + req.query.choice);
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

app.post('/reports/end', function (req, res, next) {
   console.log('POST /reports/end callId: ' + req.query.callId + ' timestamp: ' + req.query.timestamp);
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

app.get('/matrikelnummer', function (req, res, next) {
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


app.get('/class', function (req, res, next) {
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

app.get('/reports', function (req, res, next) {

	console.log('GET /reports');
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', config.webServerCotext);

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

	var response = [];

	Log.all({}, function(err, logs) {
 		if (err) {
	    	console.log("Something is wrong with the connection", err);
	    	return;
		}

		

		console.log(logs.length);
 	});


	/**var response = [{
		callId:"",
		start:"",
		end:"", 
		menus:[]
	}];*/

	response = [{id: 1, name: "test"}, {id: 2, name: "test"}, {id: 3, name: "test"}, {id: 4, name: "test"}];

	res.send(response);
});

var server = app.listen(8080, function() {
	console.log('Listening on port %d', server.address().port);
});
