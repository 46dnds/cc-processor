var
txTypes = require('./lib/txTypes.js'),
_M      = {
    cfg:{
        //Global config
        protocol    : 'https',
        host        : {
            CA  : 'www3.moneris.com', //default
            US  : 'esplus.moneris.com'
        },
        test_host   : {
            CA  : 'esqa.moneris.com',
            US  : 'esplusqa.moneris.com'
        },
        port        : 443,
        file        : {
            CA  : '/gateway2/servlet/MpgRequest',
            US  : '/gateway_us/servlet/MpgRequest',
            mpi : {
                CA  : '/mpi/servlet/MpiServlet',
                US  : '/mpi/servlet/MpiServlet'
            }
        },
        timeout : 60
    },
    formatFields:function(vars){
        var _readyFields={
            order_id    			: vars.fields.orderId,//id.replace(/[^0-9a-zA-Z]/,''),
            amount      			: vars.fields.amount,
            crypt_type  			: '7',
			processing_country_code	: vars.country || 'CA',
			dynamic_descriptor		: vars.dynDesc || ''
        },
		out={
			store_id				: vars.cfg.credentials.storeID,
			api_token				: vars.cfg.credentials.apiToken
		};
        switch(vars.type){
            case 'S': //Sale
            case 'PA': //Pre-Auth
				try{
                    _readyFields.type=vars.type=='PA'?'preauth':'purchase';
					out[_readyFields.type]={};
					out[_readyFields.type].status_check=false;
					if(vars.cfg.credentials.cvvCheck){
						out[_readyFields.type].cvd_info={
							cvd_indicator	: vars.fields.card.cvv?'1':'0'
						};
						if(vars.fields.card.cvv)
							out[_readyFields.type].cvd_info.cvd_value = ''+vars.fields.card.cvv;
					}
					if(vars.cfg.credentials.avsCheck){
						out[_readyFields.type].avs_info={
							avs_street_number	: vars.fields.customer.stnumber || 0,
							avs_street_name		: vars.fields.customer.street,
							avs_zipcode			: vars.fields.customer.zip
							//,
							//avs_email			: vars.customer.email || '',
							//avs_custip			: vars.ipAddress,
							//avs_custphone		: vars.customer.phone
						};
					}
				}
				catch(e){
					console.log(e);
				}
                break;
			case 'CHECK': //Check cvv/cvc
				try{
                    _readyFields.type='card_verification';
					out[_readyFields.type]={};
					//out[_readyFields.type].order_id='chk-'+_readyFields.order_id;
					out[_readyFields.type].amount=(vars.fields.amount || 0.01)+'';
					out[_readyFields.type].status_check=false;
					if(vars.cfg.credentials.cvvCheck){
						out[_readyFields.type].cvd_info={
							cvd_indicator	: vars.fields.card.cvv?'1':'0'
						};
						if(vars.fields.card.cvv)
							out[_readyFields.type].cvd_info.cvd_value = ''+vars.fields.card.cvv;
					}
					if(vars.cfg.credentials.avsCheck){
						out[_readyFields.type].avs_info={
							avs_street_number	: vars.fields.customer.stnumber || 0,
							avs_street_name		: vars.fields.customer.street,
							avs_zipcode			: vars.fields.customer.zip
							//,
							//avs_email			: vars.customer.email || '',
							//avs_custip			: vars.ipAddress,
							//avs_custphone		: vars.customer.phone
						};
					}
				}
				catch(e){
					console.log(e);
				}

				break;
            case 'PAC': //Pre-Auth Completion
				_readyFields.type='completion';
					out[_readyFields.type]={};
					out[_readyFields.type].comp_amount=vars.fields.amount+'';
					out[_readyFields.type].txn_number=vars.fields.txnId+'';

                break;
            case 'VPA': //Void Pre-Auth
				_readyFields.type='completion';
					out[_readyFields.type]={};
					out[_readyFields.type].comp_amount='0.00';
					out[_readyFields.type].txn_number=vars.fields.txnId+'';

                break;
            case 'R': //Refund

                break;
			default:
				console.log('unknown type',vars.type)

        }
		try{
			if(mpg.pathExists(vars,'fields.customer.id'))
				_readyFields.cust_id=vars.fields.customer.id;
			if(vars.fields.card){
				_readyFields.pan=vars.fields.card.number;
				_readyFields.expdate=vars.fields.card.exp.year.substr(-2)+vars.fields.card.exp.month;

			}
			if(txTypes[_readyFields.type]){
				for(var i=0;i<txTypes[_readyFields.type].length;i++){
					var _f=txTypes[_readyFields.type][i];
					if(!out[_readyFields.type][_f])
						out[_readyFields.type][_f]=''+_readyFields[_f];
				}
			}
			if(out[_readyFields.type])
				delete out[_readyFields.type].wallet_indicator;
		}
		catch(e){
			console.log(e);
		}
        return out;


    },
    getUrl:function(vars){
        var url=_M.cfg.protocol+'://';
        url+=_M.cfg[(vars.test || mpg.cfg.test || mpg.pathExists(vars,'cfg.options.test')?'test_':'')+'host'][vars.country || mpg.cfg.country];
        url+=_M.cfg.file[vars.country || mpg.cfg.country];
		return url;
    },
	parseAnswer:function(vars,err,ans){
		var a=mpg.pathExists(ans,'response.receipt') || err || {};
		var out={
			status		: 'DECLINED',
			result		: 'error',
			code		: 500,
			message		: a.Message || err,
			data		: {
				debug	: a
			}
		};
		if(a.ResponseCode){
			/*
			{ ReceiptId: 'ord147570132041',
			ReferenceNum: '660053450012030040',
			ResponseCode: '482',
			ISO: '54',
			AuthCode: '000000',
			TransTime: '17:02:01',
			TransDate: '2016-10-05',
			TransType: '01',
			Complete: true,
			Message: 'DECLINED           * EXPIRED CARD       =',
			TransAmount: '0.05',
			CardType: 'V',
			TransID: '10172-0_11',
			TimedOut: false,
			BankTotals: null,
			Ticket: null,
			IsVisaDebit: false }
			*/
			out.status		= 1*a.ResponseCode<50?'APPROVED':'DECLINED';
			out.result		= 1*a.ResponseCode<50?'success':'error';
			out.code		= a.ResponseCode;
			out.message		= a.Message?a.Message.replace(/\s+/g,' ').replace(' * =','').replace(' =',''):'';
			out.authCode	= a.AuthCode;
			out.txnId		= a.TransID;

			switch(vars.type){
				case 'PA':
				case 'CHECK':
					var cvdres=(a.CvdResultCode)?a.CvdResultCode.replace(/[^A-Z]/g,''):'';
					if(vars.fields.card.cvv && vars.cfg.credentials.cvvCheck){
						if(!cvdres || cvdres!='M' && cvdres!='P'){
							out.status	= 'DECLINED';
							out.message	= 'DECLINED * CVV/CVD MISMATCH';
							out.result	= 'error';
						}
					}
					out.data.checks={
						cvd		: cvdres,
						cavv	: a.CavvResultCode,
						avs		: a.AvsResultCode
					};
					break;
			}
		}
		return out;
	},
    POST   : function(vars,cback){
		try{
			//input json, output json
			var headers={
				'User-Agent'	: mpg.cfg.appName+'/'+mpg.cfg.version,
				'Accept'		: 'text/xml',
				'Content-Type'	: 'text/xml'
			},
			builder = new mpg._m.xml2js.Builder({rootName:'request',renderOpts:{pretty:false,indent:'',newline:''},trim:true,headless:false}),
			xml='';

			if(mpg.cfg.debug)
				console.log('moneris sending data',JSON.stringify(vars.data,undefined,4));
			try{
				xml = builder.buildObject(vars.data);
			}
			catch(e){

				console.trace(e);
				cback({result:'error',code:500,message:'internal error',error:e});
				return;
			}
			if(mpg.cfg.debug)
				console.log('moneris generated '+vars.type+' XML',xml);
			mpg._m.request(
				{
					method	: 'POST',
					headers : headers,
					uri		: _M.getUrl(vars),
					body	: xml,
					timeout	: 20*1000
				},
				function(error, response, body){
					if(error){
						cback({result:'error',error:error});
					}
					else if(response.statusCode>=300){
						cback({result:'error',code:response.statusCode});
					}
					else if(body){
						if(mpg.cfg.debug) console.log('POST RECEIVED '+vars.type+' (raw) ',body);
						try{
							mpg._m.xml2js.parseString(body, {trim: true,explicitArray:false},function(err,xmldat){
								if(mpg.cfg.debug) console.log('POST RECEIVED '+vars.type+' (parsed) ',xmldat);
								var _ans=_M.parseAnswer(vars,err,xmldat);
								cback({result:'success',code:response.statusCode,data:_ans});
							});
						}
						catch(e){
							console.trace(e);
							cback({result:'error',code:500,errorCode:'processing_error',hint:'processing error',error:e});
						}
						return;
					}
					else{
						cback({result:'error',code:500,errorCode:'unknown_error',hint:'Answer body is empty'});
						//dafuq?
						console.log(response.headers);
					}
				}
			);
		}
		catch(e){

			console.trace(e);
			cback({result:'error',code:500,message:'internal error',error:e});
			return;
		}
    }
},
mpg={
    cfg : {
		debug		: false,
        test        : false, //true | false
        country     : 'CA' // CA | USA
    },
    init:function(opts){

        if(opts)
            mpg._m.xtend.extend(mpg.cfg,opts);
		if(mpg.cfg.debug)
			console.log('cc-Processor moneris init Config set',JSON.stringify(mpg.cfg,undefined,4));
    },
    doTx:function(vars,cback){

		/**
		 * Moneris doesn't allow 2 transactions with the same "reference" Id so instead of using orderid we use a new id
		 */

		try{
			vars=mpg._m.xtend.clone(vars);
			vars.fields.orderId='ord-'+(vars.fields.refId || vars.fields.id).replace(/[^0-9a-zA-Z]/,'');
			if(vars.type=='PA' && mpg.pathExists(vars,'fields.card.cvv')){
				var xvars=mpg._m.xtend.clone(vars);
				xvars.type='CHECK';
				xvars.fields.orderId='chk-'+xvars.fields.id.replace(/[^0-9a-zA-Z]/,'');
				xvars.data=_M.formatFields(xvars);
				_M.POST(xvars,function(checkRes){
					if(mpg.cfg.debug)
						console.log('checkRes',checkRes);
					if(checkRes.data.result=='success'){
						vars.data=_M.formatFields(vars);
						vars.data.preauth.txn_number=''+checkRes.data.txnId;
						_M.POST(vars,cback);
						return;
					}
					cback(checkRes);
				});
				return;
			}
			vars.data={};
			vars.data=_M.formatFields(vars);
			//console.log(vars.data)
			_M.POST(vars,cback);
		}
		catch(e){
			console.trace(e);
		}


    }
};
module.exports=mpg;