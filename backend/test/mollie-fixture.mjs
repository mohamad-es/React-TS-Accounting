// Loaded only by the integration test child process, never by production startup.
const original=globalThis.fetch;const records=new Map();
globalThis.fetch=async(url,options)=>{
 if(String(url)==='https://api.mollie.com/v2/payments'){
  const body=JSON.parse(options.body);const id='tr_fixture';records.set(id,body);
  return Response.json({id,status:'open',_links:{checkout:{href:'https://www.mollie.com/checkout/test-fixture'}}});
 }
 if(String(url)==='https://api.mollie.com/v2/payments/tr_fixture'){
  const body=records.get('tr_fixture');return Response.json({id:'tr_fixture',status:'paid',mode:'test',amount:body.amount,metadata:body.metadata});
 }
 return original(url,options);
};
