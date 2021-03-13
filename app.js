'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaRequest = require('koa-http-request');
const views = require('koa-views');
const serve = require('koa-static');

const router = new Router();
const app = module.exports = new Koa();

const ADMIN_ENDPOINT  = `${process.env.SHOPIFY_ADMIN_ENDPOINT}`; // https://YOUR_MYSHOPIFY_DOMAIN/admin/api/graphql.json
const ADMIN_TOKEN  = `${process.env.SHOPIFY_ADMIN_TOKEN}`; // COPIED_API_PASSWORD_FROM_YOUR_PRIVATE_APP
const STOREFRONT_ENDPOINT  = `${process.env.SHOPIFY_STOREFRONT_ENDPOINT}`; // https://YOUR_MYSHOPIFY_DOMAIN/api/graphql.json
const STOREFRONT_TOKEN  = `${process.env.SHOPIFY_STOREFRONT_TOKEN}`; // COPIED_TOKEN_FROM_YOUR_PRIVATE_APP


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
  ctx.status = 200;
});

router.get('/one_pager',  async (ctx, next) => {  
  console.log("+++++++++ /one_pager ++++++++++");
  let product_id = ctx.request.query.product_id;

  let api_res = await(callGraphql(ctx, `{
    product(id: "gid://shopify/Product/${product_id}") {
      title
      handle
      variants(first:1) {
        edges {
          node {
            id
            storefrontId
            title
            price
            image
          }
        }
      }    
    }
  }`, false));
  console.log(`${JSON.stringify(api_res)}`);        
  await ctx.render('one_pager', {
  });
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