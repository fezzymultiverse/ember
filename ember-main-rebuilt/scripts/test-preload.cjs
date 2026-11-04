/* Deterministic external-network guard; individual fixture routes registered later take precedence. */
'use strict';
const {chromium}=require('playwright');
const launch=chromium.launch.bind(chromium);
chromium.launch=async options=>{
 const browser=await launch({...options,args:[...(options?.args||[]),'--no-sandbox']});
 const newContext=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await newContext({...options,serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(['localhost','127.0.0.1','[::1]'].includes(u.hostname)||!/^https?:$/.test(u.protocol))return route.continue();
   return route.fulfill({status:503,contentType:'application/json',body:'{"error":"External HTTP blocked by deterministic test guard; add a fixture."}'});
  });
  return context;
 };
 return browser;
};
const originalFetch=global.fetch;
if(originalFetch)global.fetch=(url,options)=>{
 const u=new URL(typeof url==='string'?url:url.url||String(url));
 if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname))return Promise.reject(new Error('External HTTP blocked by test guard; add a fixture.'));
 return originalFetch(url,options);
};
