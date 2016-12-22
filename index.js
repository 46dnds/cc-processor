var
gws			= {
	moneris	: require('./lib/gateways/moneris/moneris.js')
},
cc			= require('creditcard'),
mac			= require('getmac'),
uuid		= require('node-uuid'),
xtend   	= require('cloneextend'),
request 	= require('request'),
xml2js  	= require('xml2js'),
nodeid 		= [],
_P			= {
	answer	: function(vars,res,cback){
		res=res.data || res;
		if(vars.type=='PA'){
			res.last4		= vars.fields.card.number.substr(-4);
			res.cardType	= vars.fields.card.ccd.scheme.toLowerCase();
		}
		res.orderId=vars.fields.orderId;
		res.date=_P.zuluTime();
		if(typeof res.code=='undefined')
			res.code=0;
		if(_P.pathExists(res,'cardType')=='undefined')
			res.cardType='';
		if(_P.pathExists(res,'last4')=='undefined')
			res.last4='';
		var out={
			id			: vars.fields.id,
			date		: res.date,
			code		: res.code || res.errorCode || 0,
			orderId		: res.orderId,
			result		: res.result,
			amount		: vars.fields.amount,
			cardType	: _P.pathExists(res,'cardType') || vars.fields.cardType,
			txnId		: res.txnId || '',
			type		: vars.type,
			authCode	: res.authCode || '',
			status		: res.status || (res.result=='success'?'Approved':''),
			last4		: _P.pathExists(res,'last4') || vars.fields.last4,
			refId		: vars.fields.refId || '',
			refTxnId	: vars.fields.txnId || '',
			message		: res.message || res.errorMessage,
			runTime		: res.runTime,
			debug		: res.data || res
		};
		out=_P.sortObject(out);
		cback(out);
	},
	isEmptyObject:function(obj) { // _P.isEmptyObject()
		for(var prop in obj) {
			if(obj.hasOwnProperty(prop))
				return false;
		}
		return true;
	},
	pathExists:function(o,p){ //_P.pathExists
		if(!o || !p) return false;
		var
		m 	= p.split("."),
		cm 	= o;
		for (var i = 0; i < m.length; i++) { // Here we need to take special care of possible method calls and arrays, but I am too lazy to write it down.
			if(cm===null)
				return false;
			if (typeof cm[m[i]]!=='undefined')//if(currentMember.hasOwnProperty(members[i]))
				cm = cm[m[i]];
			else
				return false;
		}
		return cm;
	},
	sortObject:function(obj){ // _P.sortObject
		if(typeof obj=='function'){
            var s=obj.toString();
			return s
            .replace(/\'func/g,'func')
            .replace(/\}\'/g,'}')
            .replace(/\\n/g,"\n")
            .replace(/\\t/g,"    ");
		}
		else if(Object.prototype.toString.call(obj) == '[object Array]'){
			for(var i=0;i<obj.length;i++){
				obj[i]=_P.sortObject(obj[i]);
			}
			return obj;
		}
		else if(Object.prototype.toString.call(obj) == '[object String]')
			return obj;
		else if(obj === Object(obj)){
            var keys = Object.keys(obj),
            i, len = keys.length,sorted={};
            keys.sort(function (a, b) {
				return a.toLowerCase().localeCompare(b.toLowerCase());
			});
            for (i = 0; i < len; i++){
                var k = keys[i];
                sorted[k]=obj[k];
            }
			var out={};
			for(var i in sorted){
				if(typeof sorted[i]=='undefined')
					continue;
				if(typeof sorted[i]=='object' && _P.isEmptyObject(sorted[i]))
					continue;
				out[i]=_P.sortObject(sorted[i]);
			}
            return out;
		}
		else
			return obj;
	},
	uuid:{
		_regexp:'[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
		get:function(){
			if(nodeid.length==0)
			throw new Error("Can't get node id (macAddress) maybe setting a timeout of 100 could fix it...");
			return uuid.v1({node:nodeid});
		},
		list:function(str){
			if(typeof str!='string')
				str=JSON.stringify(str);
			str=str.toLowerCase();
			var out=[];
			var m=str.match(new RegExp(_P.uuid._regexp,"g"));
			if(m && m.length)
				for(var x=0;x<m.length;x++)
					if(out.indexOf(m[x])==-1)
						out.push(m[x]);

			return out;
		},
		validate:function(str){
			if(!str)
				return false;
			str=str.toString().trim();
			if(str.length!=36)
				return false;
			var r=new RegExp("^"+_P.uuid._regexp+"$","i");
			if(r.test(str))
				return true;

			return false;
		}
	},
	zuluTime	: function(){
		return new Date().toISOString();
	}
},
P			= {
    cfg : {
		debug		: false,
        test        : false, //true | false
        country     : 'CA' // CA | USA
    },
    init:function(opts,cback){
		mac.getMac(function(err,macAddress){
			if(err){core.log(err);return false;}
			var macs=macAddress.split(':');
			for(var i in macs)
				nodeid.push(+("0x"+macs[i]));



			var pkg=require(__dirname+'/package.json');
			P.cfg.appName=pkg.name;
			P.cfg.version=pkg.version;
			if(opts)
				P.cfg=xtend.extend(P.cfg,opts);
			if(P.cfg.debug)
				console.log('cc-Processor init Config set',JSON.stringify(P.cfg,undefined,4));

			for(var i in gws){
				if(gws[i]){
					gws[i]._m={
						xtend	: xtend,
						request	:request,
						xml2js	: xml2js
					};
					gws[i].pathExists=_P.pathExists;
					gws[i].sortObject=_P.sortObject;
					gws[i].init(P.cfg);
				}
			}
			if(cback) cback();
		});
    },
    doTx:function(vars,cback){
		if(!vars.cfg || !vars.cfg.credentials){
			_P.answer(vars,{
				result	: 'error',
				code	: 51,
				message	: 'ERROR - Misconfigured store options.'
			},cback);
			return;
		}
		if(vars.cfg.debug)
			console.log('doTx vars.fields',vars.fields);
		vars.fields=xtend.clone(vars.fields);
		if(_P.pathExists(vars,'fields.card.number'))
			vars.fields.card.number=(vars.fields.card.number+'').replace(/[^0-9]/g,'');

		if(vars.type=='PA' || vars.type=='CHECK'){
			vars.fields.card.ccd=cc.parse(vars.fields.card.number);
			if(!vars.fields.card.ccd.validates){
				_P.answer(vars,{
					result		: 'error',
					code		: 51,
					preCheck	: true,
					message		: 'DECLINE - Invalid card number'
				},cback);
				return;
			}
			if(!_P.pathExists(vars.fields.card.ccd,'scheme')){
				_P.answer(vars,{
					result		: 'error',
					code		: 51,
					preCheck	: true,
					message		: 'DECLINE - Unrecognized card type'
				},cback);
				return;
			}
			vars.fields.card.expiry=cc.expiry(vars.fields.card.exp.month,vars.fields.card.exp.year);
			if(!vars.fields.card.expiry){
				_P.answer(vars,{
					result		: 'error',
					code		: 51,
					preCheck	: true,
					message		: 'DECLINE - Expired card'
				},cback);
				return;
			}
		}

		vars.fields.id=_P.uuid.get();
		var start=new Date().getTime();

		if(vars.type=='PA'){
			vars.fields.last4		= vars.fields.card.number.substr(-4);
			vars.fields.cardType	= vars.fields.card.ccd.scheme.toLowerCase();
		}
		//let's do it
		try{
			gws[vars.cfg.gateway].doTx(vars,function(res){
				if(typeof res.data=='undefined')
					res.data = {};
				res.data.type=vars.type;
				res.data.runTime=(new Date().getTime()-start)/1000;
				_P.answer(vars,res,cback);
			});
		}
		catch(e){

			_P.answer(vars,{
				result	: 'error',
				code	: 500,
				message	: e
			},cback);
			return;
		}
    }
};
module.exports=P;