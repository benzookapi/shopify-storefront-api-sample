# Shopify Storefront API Customization Sample (by private app)

## How to run

1. Set the environemnt variables.

    export SHOPIFY_STOREFRONT_ENDPOINT=https://YOUR_MYSHOPIFY_DOMAIN/api/graphql.json

    export SHOPIFY_STOREFRONT_TOKEN=COPIED_TOKEN_FROM_YOUR_PRIVATE_APP

    If you want to change the code to use Admin API GraphQL, set two others.

    export SHOPIFY_ADMIN_ENDPOINT=https://YOUR_MYSHOPIFY_DOMAIN/admin/api/graphql.json

    export SHOPIFY_ADMIN_TOKEN=COPIED_API_PASSWORD_FROM_YOUR_PRIVATE_APP

2. npm install

3. npm start

4. access http://localhost:3000

You can see some sample links.

These samples all refer to the oficial Strorefont API docs
https://shopify.dev/docs/storefront-api

## TIPS

1. In the one pager checkout sample (/one_pager?handle=YOUR_PRODUCT_HANDLE), the comments goes to the order note and the hosted URL of this program gets stored as 'source-url' as custom attributes to redirect buyers to the original page using 'Additonal Scripts' with Liquid.
    The sample codes of 'Additonal Scripts' are as follows:
    ```
    {% if checkout.attributes.source-url %}
      <span style="font-weight: bold;"><a href="{{ checkout.attributes.source-url }}">Go back to the original page.</a></span>
    { % endif %}
    ```
  
    For the custom attributes, check this link: https://shopify.dev/docs/themes/liquid/reference/objects/checkout#checkout-attributes
    
    For 'Additonal Scripts': https://help.shopify.com/en/manual/orders/status-tracking/customize-order-status

2. In the one pager checkout, if you select 'Found one by this program' for the shipping rate, this program gets the first one of available shipping rates by GraphQL to apply to the checkout which requires the polling procees of the query for 'Checkout' object until its 'ready' field turns true. Given a shipping rate, Shopify checkout shows the final payment method page directly skipping the rate selection.

    For the polling of available shipping rate query in GraphQL, see this link: https://shopify.dev/docs/storefront-api/reference/checkouts/availableshippingrates



