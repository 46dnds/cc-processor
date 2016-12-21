var moneris=require('../index.js');
moneris.init({
    debug       : true,
    test        : true
});


//https://developer.moneris.com/More/Testing/Penny%20Value%20Simulator
/*
PHP Version:
<?xml version="1.0" encoding="UTF-8"?>
<request>
    <store_id>store5</store_id>
    <api_token>yesguy</api_token>
    <preauth>
        <order_id>ord-051016-16:32:57</order_id>
        <cust_id>my cust id</cust_id>
        <amount>1.00</amount>
        <pan>4242424242424242</pan>
        <expdate>0806</expdate>
        <crypt_type>7</crypt_type>
        <dynamic_descriptor>123456</dynamic_descriptor>
    </preauth>
</request>

nodejs version:

<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<request>
    <store_id>store5</store_id>
    <api_token>yesguy</api_token>
    <preauth>
        <status_check>false</status_check>
        <cvdCheck>
            <cvd_indicator>1</cvd_indicator>
            <cvd_value>123</cvd_value>
        </cvdCheck>
        <order_id>ord1475700109222</order_id>
        <cust_id>1475699895803</cust_id>
        <amount>0.80</amount>
        <pan>4242424242424242</pan>
        <expdate>0899</expdate>
        <crypt_type>7</crypt_type>
        <dynamic_descriptor>123</dynamic_descriptor>
    </preauth>
</request>
*/
var orig={
    credentials : {
        storeID     : 'store5',
        apiToken    : 'yesguy'
    },
    type        : 'PA',
    dynDesc     : '1234',
    fields      : {
        orderId     : 'ord-'+(new Date().getTime()+'').substr(-15),
        amount      : '0.81',
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
    ipAddress   : '1.2.3.4'
};
moneris.doTx(orig,function(res){
        console.log('PA Result:',res);

        console.log('INIT PAC');
        var newObj={
            credentials : orig.credentials,
            type        : 'PAC',
            dynDesc     : orig.dynDesc,
            fields      : {
                txnId       : res.data.txnId,
                amount      : orig.fields.amount,
                orderId     : orig.fields.orderId,
                customer    : {
                    id  : orig.fields.customer.id
                }

            }
        };
        moneris.doTx(newObj,function(pacRes){
                console.log('PAC result:',pacRes);
            });
    });