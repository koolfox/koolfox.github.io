import {test,expect} from '@playwright/test';

test('normal page use reads no sibling project assets or stored records',async({page})=>{
  const foreignKeys=["structural-education-progress-v1", "tnf-course-quizzes-v1", "koolfox.karpathy.progress.v1"];
  await page.addInitScript(keys=>{
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
    for(const key of keys)set.call(localStorage,key,'isolation-sentinel');
    window.foreignStorageAccess=[];
    Storage.prototype.getItem=function(key){if(keys.includes(key))window.foreignStorageAccess.push(['read',key]);return get.call(this,key);};
    Storage.prototype.setItem=function(key,value){if(keys.includes(key))window.foreignStorageAccess.push(['write',key]);return set.call(this,key,value);};
  },foreignKeys);
  const foreignRequests=[];
  page.on('request',request=>{
    const url=new URL(request.url()),current=new URL(page.url());
    if(url.origin===current.origin&&["structural-bioinformatics", "karpathy", "optimization", "stochastic-processes"].some(name=>url.pathname.startsWith('/'+name+'/')))foreignRequests.push(url.pathname);
  });
  await page.goto("/deep-learning/terms/spring-2026/s02/");
  await expect(page.locator("main")).toBeVisible();
  expect(foreignRequests).toEqual([]);
  expect(await page.evaluate(()=>window.foreignStorageAccess)).toEqual([]);
});
