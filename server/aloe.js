var http = require("http");
var url = require("url");
var jsdom = require("jsdom");

var ALOE  = function(uri){

	for(var prop in url.parse(uri)){
		this[prop] = url.parse(uri)[prop];
	}

	this.redirects = 0;

	this.redirectLogin = function(rurl,callback){
		rurl = url.parse(rurl);
		
		this.hostname = rurl.hostname;
		this.port = rurl.port || 80;
		this.path = rurl.pathname;
		
		this.login(this.user,this.password,callback);
	}

	this.login = function(user,password,callback){

		if(this.redirects > 10){
			console.log("Too many redirects");
			return;
		}

		var self = this;

		this.user = user;

		this.password = password;

		var redirect = false;

		var page = "";
		
		var opts = {
			host : 'aloe.ulima.edu.pe',
			path : '/email/' + self.user + '/Bandeja%20de%20entrada/?Cmd=contents',
			port : 80,
			auth : self.user + ":" + self.password
		}
		
		var redirectRequest = http.get(opts,function(redirectResponse){
			redirectResponse.setEncoding("utf8");
			
			redirectResponse.on('data',function(chk){
				page+=chk;
			});

			redirectResponse.on("end",function(chk){
				callback(null,page);
			});
		});
		redirectRequest.end();					
	};

};


var aloe = new ALOE("http://aloe.ulima.edu.pe/email/");
var qs = require("querystring");
var server = http.createServer(function(req,res){
	var body="";
	
	if(req.method == "POST"){
		req.on("data",function(data){
			body+=data;
		});
		req.on("end",function(){
			var POST = qs.parse(body);
			var user = POST.user;
			var password = POST.password;
	
			aloe.login(user,password,function(err,page){
				if(err){
					console.log(err);
				}else{
					jsdom.env(page,['http://code.jquery.com/jquery-1.5.min.js'], function(errors,window){
						var $ = window.$;
						var emails = [];
						var unread_emails =  $(".List").find("img[src='/exchweb/img/icon-msg-unread.gif']");
						for(var j=0;j<unread_emails.size();j++){						
							var row = $(unread_emails.get(j));
							var rowparent = row.parent().parent().parent().parent().parent().parent();
							var fields = $(rowparent[0]).find("td");
							var email = {
								title : null,
								description : null,
								link : null,
								date : null
							}
							for(var i=0;i<=fields.size();i++){
								switch(i){
									case 5:
										email.link = "http://aloe.ulima.edu.pe/email/" + user + "/" + $($(fields.get(i)).find("a")[0]).attr("href");
										email.title = $(fields.get(i)).text();
										break;
									case 6:
										email.description = $(fields.get(i)).text();
										break;
									case 7:
										email.date = $(fields.get(i)).text();
										break;
									default:
										continue;
								}
							}
							emails.push(email);
						}
						console.log(emails);
						res.writeHead(200,{"Content-type":"text/plain"});
						res.end(JSON.stringify(emails));
					});
				}
			});		
		});
	}
	else if(req.method == "GET"){
		var url_parts = url.parse(req.url,true);
		console.log(url_parts.query);
	}
});

server.listen(80);
console.log("Servidor escuchando en puerto 80");


