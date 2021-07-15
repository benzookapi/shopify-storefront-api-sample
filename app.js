'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaRequest = require('koa-http-request');
const views = require('koa-views');
const serve = require('koa-static');

const router = new Router();
const app = module.exports = new Koa();

// For Storefront API GraphQL
const STOREFRONT_ENDPOINT  = `${process.env.SHOPIFY_STOREFRONT_ENDPOINT}`; // https://YOUR_MYSHOPIFY_DOMAIN/api/graphql.json
const STOREFRONT_TOKEN  = `${process.env.SHOPIFY_STOREFRONT_TOKEN}`; // COPIED_TOKEN_FROM_YOUR_PRIVATE_APP
// For Admin API GraphQL (Optional)
const ADMIN_ENDPOINT  = `${process.env.SHOPIFY_ADMIN_ENDPOINT}`; // https://YOUR_MYSHOPIFY_DOMAIN/admin/api/graphql.json
const ADMIN_TOKEN  = `${process.env.SHOPIFY_ADMIN_TOKEN}`; // COPIED_API_PASSWORD_FROM_YOUR_PRIVATE_APP


app.use(bodyParser());

app.use(koaRequest({
  
}));

app.use(views(__dirname + '/views', {
  map: {
    html: 'underscore'
  }
}));

app.use(serve(__dirname + '/public'));

router.get('/',  async (ctx, next) => {  
  console.log("+++++++++ / ++++++++++");
  await ctx.render('index', {
  });
});

router.get('/one_pager',  async (ctx, next) => {  
  console.log("+++++++++ /one_pager ++++++++++");
  const handle = ctx.request.query.handle;
  
  let api_res = await(callGraphql(ctx, `{
    productByHandle(handle: "${handle}") {
      id
    }
  }`));
  console.log(`${JSON.stringify(api_res)}`); 

  const product_id = api_res.data.productByHandle.id;
  api_res = await(callGraphql(ctx, `{
    shop {
      name
      primaryDomain {
        url
      }
    }
    node(id: "${product_id}") {
      id
      ... on Product {
        title
        variants(first:1) {
          edges {
            node {
              id
              image {
                originalSrc
              }
              title
              priceV2 {
                amount
                currencyCode
              }
            }
          }          
        }
      }
    }
  }`));
  console.log(`${JSON.stringify(api_res)}`);  

  await ctx.render('one_pager', {
    image: api_res.data.node.variants.edges[0].node.image.originalSrc,
    title: api_res.data.node.title,
    price: api_res.data.node.variants.edges[0].node.priceV2.amount,
    currency: api_res.data.node.variants.edges[0].node.priceV2.currencyCode,
    url: api_res.data.shop.primaryDomain.url,
    handle: handle,
    variant_id: api_res.data.node.variants.edges[0].node.id
  });
});

router.post('/checkout', async (ctx, next) => {
  console.log("******** checkout ********");

  const quantity = ctx.request.body.quantity; 

  const email = ctx.request.body.email;
  
  const first_name = ctx.request.body.first_name; 
  const last_name = ctx.request.body.last_name; 

  const country = ctx.request.body.country; 
  const zip = ctx.request.body.zip; 
  const province = ctx.request.body.province; 
  const city = ctx.request.body.city; 
  const address1 = ctx.request.body.address1; 
  const address2 = ctx.request.body.address2; 
  const phone = ctx.request.body.phone; 

  const rate = ctx.request.body.rate;

  const note = ctx.request.body.note; 

  const variant_id = ctx.request.body.variant_id;
  const handle = ctx.request.body.handle;

  let api_res = await(callGraphql(ctx, `mutation checkoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        webUrl
      }
      checkoutUserErrors {
        code
        field
        message
      }
    }
  }`, {
    "input": {
      "email": email,
      "lineItems": [{
        "variantId": variant_id,
        "quantity": parseInt(quantity)
      }],
      "shippingAddress": {
        "address1": address1,
        "address2": address2,
        "city": city,
        "country": country,
        "firstName": first_name,
        "lastName": last_name,
        "phone": phone,
        "province": province,
        "zip": zip
      },
      "note": note,
      "customAttributes": [{ // Set the source-url as cart attributes used by Liquid in the addtional script (https://shopify.dev/docs/themes/liquid/reference/objects/checkout#checkout-attributes)
        "key": "source-url",
        "value": `${ctx.request.origin}/one_pager?handle=${handle}`
      }]
    }
  }));
  console.log(`${JSON.stringify(api_res)}`); 
  
  const checkout_id = api_res.data.checkoutCreate.checkout.id;
  const web_url = api_res.data.checkoutCreate.checkout.webUrl;   
  
  // If the user selcted 'Found shipping rate', try to get the first found shipping rate to apply to the created checkout above, otherwise they choose in Shopify checkout page.
  if (rate == 'found') {
    // ****** You need to poll this call until 'ready' gets true (immediate call returns false). ******
    let begin = Date.now();
    let ready = false;
    while (!ready || Date.now() - begin < 1000 * 10) { // THIS IS BLOCKING CODE WITHOUT INTERVALS, DO NOT USE IN PRODUCTION!
      api_res = await(callGraphql(ctx, `{
        node(id: "${checkout_id}") {
          id
          ... on Checkout {
            availableShippingRates { 
              ready
              shippingRates {
                handle
                title
                priceV2 {
                  amount
                  currencyCode
                }     
              }           
            }
          }
        }
      }`));
      console.log(`${JSON.stringify(api_res)}`);
      ready = api_res.data.node.availableShippingRates.ready;
    }

    // If some shipping rates are avaiable, use the first found one.
    if (api_res.data.node.availableShippingRates.shippingRates.length > 0) {
      const shipping_rate_handle = api_res.data.node.availableShippingRates.shippingRates[0].handle;
      api_res = await(callGraphql(ctx, `mutation checkoutShippingLineUpdate($checkoutId: ID!, $shippingRateHandle: String!) {
        checkoutShippingLineUpdate(
          checkoutId: $checkoutId
          shippingRateHandle: $shippingRateHandle
        ) {
            checkout {
              id
              webUrl
            }
            checkoutUserErrors {
              code
              field
              message
            }
          }
        }`, {
          "checkoutId": checkout_id,
          "shippingRateHandle": shipping_rate_handle
      }));
      console.log(`${JSON.stringify(api_res)}`);
    } 
  }
  
  // Redirect to the web url to complete the checkout.
  ctx.redirect(web_url);

});

router.post('/carrier_service',  async (ctx, next) => {  
  console.log("+++++++++ /carrier_service ++++++++++");
  console.log(`${JSON.stringify(ctx.request.body)}`);
  //WRIGHT THE SHIPPING RATE CALC. HERE!
  /**
   * 
   * 
   * 
   * 
   * 
   * 
   * 
   */
  ctx.body = {
    "rates": [
        {
            "service_name": "サービスその１",
            "service_code": "サービスコード01",
            "total_price": "77700",
            "description": "説明その１",
            "currency": "JPY",
            "min_delivery_date": "2013-04-12 14:48:45 -0400",
            "max_delivery_date": "2013-04-12 14:48:45 -0400"
        },
        {
          "service_name": "サービスその２",
          "service_code": "サービスコード02",
          "total_price": "88800",
          "description": "説明その２",
          "currency": "JPY",
          "min_delivery_date": "2013-04-12 14:48:45 -0400",
          "max_delivery_date": "2013-04-12 14:48:45 -0400"
      }
    ]
 };
});

// https://shopify.dev/docs/storefront-api/getting-started
const callGraphql = function(ctx, req, vars = null, storefront = true) {
  let endpoint = STOREFRONT_ENDPOINT;
  let token = STOREFRONT_TOKEN;
  if (!storefront) {
    endpoint = ADMIN_ENDPOINT;
    token = ADMIN_TOKEN;
  }  
  let api_req = {};
  // Set Gqphql string into query field of the JSON  as string
  api_req.query = req.replace(/\n/g, '');
  if (vars != null) {
    api_req.variables = vars;
  }
  console.log(`callGraphql ${endpoint} ${token} ${JSON.stringify(api_req)}`);
  return new Promise(function(resolve, reject) { 
    // Success callback
    let then_func = function(res){
      console.log(`callGraphql Success: ${res}`);
      return resolve(JSON.parse(res));
    };
    // Failure callback
    let catch_func = function(e){
      console.log(`callGraphql Error: ${e}`);
      return resolve(e);      
    };
    let headers = {};
    headers['Content-Type'] = 'application/json'; // for JSON.stringify otherwise application/graphql
    if (storefront) {
      headers['X-Shopify-Storefront-Access-Token'] = token;
    } else {
      headers['X-Shopify-Access-Token'] = token;
    }    
    ctx.post(endpoint, api_req, headers).then(then_func).catch(catch_func);   
  });
};   

app.use(router.routes());
app.use(router.allowedMethods());

if (!module.parent) app.listen(process.env.PORT || 3000);