
var
test        = false,
debug       = true,
_index      = require('../index.js'),
gateway     = 'moneris',
credentials = {
    moneris : {
        storeID     : 'store5',
        apiToken    : 'yesguy',
        avsCheck    : false,
        cvvCheck    : false
    }
},
type        = 'PA',
dynDesc     = '1234',
fields      = {
    orderId     : 'ord-'+(new Date().getTime()+''),
    amount      : '0.01',
    card        : {
        number  : '4242424242424242',//'4242424242424242','4355310002576375',
        exp     : {
            month   : '08',
            year    : '2099'
        },
        cvv     : '123'
    },
    customer    : {
        id          : ''+new Date().getTime(),
        firstname   : 'Test',
        lastname    : 'User',
        stnumber    : '123',
        street      : '1st avenue',
        city        : 'City',
        state       : 'State',
        country     : 'CA',
        zip         : '12345',
        phone       : '1(555) 555-5555',
        email       : 'example@acme.com'
    }
},
ipAddress   = '1.2.3.4';


_index.init({
    debug       : debug,
    test        : test
},function(){
    var orig={
        cfg         : {
            gateway     : gateway,
            credentials : credentials[gateway]
        },
        type        : type,
        dynDesc     : dynDesc,
        fields      : fields,
        ipAddress   : ipAddress
    };
    _index.doTx(orig,function(PA_res){
        console.log('PA Result:');
        console.log(JSON.stringify(PA_res,undefined,4));
        if(PA_res.result=='success'){
            console.log('INIT PAC');
            var _pacObj={
                cfg     : orig.cfg,
                type    : 'PAC',
                dynDesc : dynDesc,
                fields  : {
                    customer    : {
                        id  : orig.fields.customer.id
                    },
                    refId       : PA_res.id,
                    txnId       : PA_res.txnId,
                    amount      : orig.fields.amount,
                    orderId     : orig.fields.orderId
                }
            };
            _index.doTx(_pacObj,function(PAC_res){
                console.log('PAC Result:');
                console.log(JSON.stringify(PAC_res,undefined,4));
            });
        }
    });
});

//moneris.doTx(orig,function(res){
//        console.log('PA Result:',res);
//
//        console.log('INIT PAC');
//        var newObj={
//            credentials : orig.credentials,
//            type        : 'PAC',
//            dynDesc     : orig.dynDesc,
//            fields      : {
//                txnId       : res.data.txnId,
//                amount      : orig.fields.amount,
//                orderId     : orig.fields.orderId,
//                customer    : {
//                    id  : orig.fields.customer.id
//                }
//
//            }
//        };
//        moneris.doTx(newObj,function(pacRes){
//                console.log('PAC result:',pacRes);
//            });
//    });