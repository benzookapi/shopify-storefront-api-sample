'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaRequest = require('koa-http-request');
const views = require('koa-views');
const serve = require('koa-static');

const router = new Router();
const app = module.exports = new Koa();

const API_ENDPOINT  = `${process.env.SHOPIFY_API_ENDPOINT}`; // https://YOUR_API_KEY:YOUR_API_PASSWORD@YOUR_MYSHOPIFY_DOMAIN/admin/api/2021-01/graphql.json
const STOREFRONT_TOKEN  = `${process.env.SHOPIFY_STOREFRONT_TOKEN}`; // COPIED_ONE_FROM_YOUR_PRIVATE_APP


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
  let api_res = await(callGraphql(ctx, `{
    collections(first: 5) {
      edges {
        node {
          id
          handle
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }`));
  console.log(`${JSON.stringify(api_res)}`);    
  await ctx.render('one_pager', {
  });
});

// https://shopify.dev/docs/storefront-api/getting-started
const callGraphql = function(ctx, req, vars = null) {
  let api_req = {};
  // Set Gqphql string into query field of the JSON  as string
  api_req.query = req.replace(/\n/g, '');
  if (vars != null) {
    api_req.variables = vars;
  }
  console.log(`callGraphql ${API_ENDPOINT} ${STOREFRONT_TOKEN} ${JSON.stringify(api_req)}`);
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
    headers['X-Shopify-Storefront-Access-Token'] = STOREFRONT_TOKEN;
    ctx.post(API_ENDPOINT, api_req, headers).then(then_func).catch(catch_func);   
  });
};   

app.use(router.routes());
app.use(router.allowedMethods());

if (!module.parent) app.listen(process.env.PORT || 3000);