import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

async function openLab(page,lab,key){
  await page.goto(`/deep-learning/runtime/${lab}/`);
  await page.waitForFunction(key=>[...document.querySelectorAll('iframe')].some(f=>f.contentWindow?.[key]?.state),key,{timeout:90000});
  return page.frames().find(f=>f!==page.mainFrame());
}
const engine=fileURLToPath(new URL('../python/',import.meta.url));

test('exported workshop shells and embedded apps have the requested Persian title',async({page})=>{
  test.setTimeout(180000);
  for(const [lab,key] of [['neuron-xor','dannaLab'],['network-playground','dannaNetwork']]){
    const frame=await openLab(page,lab,key);
    expect(await page.title()).toBe('کارگاه آموزشی دیپ لرنینگ');
    expect(await frame.evaluate(()=>document.title)).toBe('کارگاه آموزشی دیپ لرنینگ');
  }
  await page.goto('/deep-learning/runtime/convolution/');
  expect(await page.title()).toBe('کارگاه آموزشی دیپ لرنینگ');
});

test('perceptron and sigmoid hide hidden-width control and ignore its inactive invalid value',async({page})=>{
  test.setTimeout(120000);const frame=await openLab(page,'neuron-xor','dannaLab');
  await frame.locator('#hidden').fill('1.5');await frame.locator('#hidden').press('Tab');
  await frame.waitForFunction(()=>!window.dannaLab);
  for(const model of ['perceptron','linear']){
    await frame.locator('#model').selectOption(model);
    await frame.waitForFunction(model=>window.dannaLab?.state.config.model===model,model);
    await expect(frame.locator('#hidden')).toBeHidden();
    expect(await frame.evaluate(()=>window.deepLearningTopology.current.activations.map(x=>x.length))).toEqual([2,1]);
  }
  await frame.locator('#model').selectOption('mlp');await expect(frame.locator('#hidden')).toBeVisible();
  await frame.locator('#hidden').fill('4');await frame.locator('#hidden').press('Tab');
  await frame.waitForFunction(()=>window.dannaLab?.state.config.model==='mlp');
  expect(await frame.evaluate(()=>window.deepLearningTopology.current.activations.map(x=>x.length))).toEqual([2,4,1]);
});

test('network hides inactive controls and derives the actual layer trace from Python weights',async({page})=>{
  test.setTimeout(120000);const frame=await openLab(page,'network-playground','dannaNetwork');
  await frame.locator('#width2').fill('1.5');await frame.locator('#width2').press('Tab');
  await frame.waitForFunction(()=>!window.dannaNetwork);
  await frame.locator('#layers').fill('0');await frame.locator('#layers').press('Tab');
  await frame.waitForFunction(()=>window.dannaNetwork?.state.config.hidden.length===0);
  await expect(frame.locator('#activation')).toBeHidden();await expect(frame.locator('#width1')).toBeHidden();
  await frame.getByText('تنظیمات داده و روش یادگیری',{exact:true}).click();
  await expect(frame.locator('#regularization_rate')).toBeHidden();
  await frame.locator('#regularization').selectOption('l2');await expect(frame.locator('#regularization_rate')).toBeVisible();
  await frame.locator('#regularization').selectOption('none');await frame.waitForFunction(()=>window.dannaNetwork.state.config.regularization==='none');
  await frame.locator('#layers').fill('1');await frame.locator('#layers').press('Tab');
  await frame.waitForFunction(()=>window.dannaNetwork?.state.config.hidden.length===1);
  await expect(frame.locator('#activation')).toBeVisible();await expect(frame.locator('#width2')).toBeHidden();
  const actual=await frame.evaluate(()=>({trace:window.deepLearningTopology.current,state:window.dannaNetwork.state}));
  const native=JSON.parse(execFileSync('python3',['-c','import json,sys;sys.path.insert(0,sys.argv[1]);from network_playground import NetworkExperiment,features;c=json.loads(sys.argv[2]);r=NetworkExperiment(**c);p=json.loads(sys.argv[3]);a,z=r.network.forward(features(p,c["feature_names"]));print(json.dumps({"activations":a,"logits":z}))',engine,JSON.stringify(actual.state.config),JSON.stringify(actual.trace.point)],{encoding:'utf8'}));
  for(const key of ['activations','logits'])actual.trace[key].flat().forEach((x,i)=>expect(x).toBeCloseTo(native[key].flat()[i],12));
  await frame.locator('#network-forward').click();await expect(frame.locator('#network-flow-status')).toContainText('عبور کامل',{timeout:5000});
  await frame.locator('#width1').fill('1.5');await frame.locator('#width1').press('Tab');
  await frame.waitForFunction(()=>!window.dannaNetwork);expect(await frame.evaluate(()=>window.deepLearningTopology.current)).toBeNull();
  await expect(frame.locator('#network-trace')).toBeEmpty();
});

test('reduced motion keeps the complete numerical trace without the propagation sequence',async({page})=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
  const frame=await openLab(page,'neuron-xor','dannaLab');
  await frame.locator('#network-forward').click();
  await expect(frame.locator('#network-flow-status')).toContainText('تمام مقدارها');
  expect(await frame.evaluate(()=>window.deepLearningTopology.current.activations.at(-1)[0])).toBeCloseTo(await frame.evaluate(()=>window.dannaLab.state.probabilities[0]),12);
});

test('only topic-specific supplementary workshops are linked from lessons',async({page})=>{
  for(const id of ['s01','s11','s13','s14','s19','s28']){
    await page.goto(`/deep-learning/terms/spring-2022/${id}/`);
    await expect(page.locator('.related-labs')).toHaveCount(0);
  }
  await page.goto('/deep-learning/terms/spring-2022/s07/');
  await expect(page.locator('.related-labs a')).toHaveCount(1);
  await expect(page.locator('.related-labs a')).toHaveAttribute('href','/deep-learning/playgrounds/convolution/');
});
