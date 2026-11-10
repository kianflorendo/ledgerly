import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(here,'assets','website-demo.mp4');
const fps=15;
const encoder=spawn('python',[path.join(here,'encode-video.py'),output,String(fps)],{stdio:['pipe','inherit','inherit']});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,colorScheme:'light'});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle',timeout:20000});
  await page.waitForSelector('.benchmark-results',{timeout:10000});
  await page.addStyleTag({content:`#demo-pointer{position:fixed;z-index:999999;width:34px;height:34px;border:3px solid #fff;border-radius:50%;background:rgba(65,138,242,.35);box-shadow:0 0 0 5px rgba(65,138,242,.25),0 2px 12px rgba(0,0,0,.35);pointer-events:none;left:0;top:0;transform:translate(-100px,-100px);transition:none}`});
  await page.evaluate(()=>{const d=document.createElement('div');d.id='demo-pointer';document.body.append(d);window.moveDemoPointer=(x,y)=>{d.style.transform=`translate(${Math.round(x-17)}px,${Math.round(y-17)}px)`;};});
  let cursor={x:120,y:120};
  async function frame(){const jpg=await page.screenshot({type:'jpeg',quality:90,animations:'allow'});const h=Buffer.alloc(4);h.writeUInt32BE(jpg.length);if(!encoder.stdin.write(Buffer.concat([h,jpg])))await once(encoder.stdin,'drain');}
  async function hold(seconds){for(let i=0;i<Math.round(seconds*fps);i++)await frame();}
  async function moveTo(box,seconds=1){if(!box)return;const to={x:box.x+Math.min(box.width*.72,80),y:box.y+box.height/2};for(let i=0;i<Math.round(seconds*fps);i++){const p=(i+1)/Math.round(seconds*fps);cursor={x:cursor.x+(to.x-cursor.x)*p,y:cursor.y+(to.y-cursor.y)*p};await page.evaluate(([x,y])=>window.moveDemoPointer(x,y),[cursor.x,cursor.y]);await frame();}cursor=to;}
  async function clickWithPointer(locator){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();await moveTo(box,.9);await locator.click();await page.waitForTimeout(250);}

  // Show the real saved three-repeat comparison; no inference is started here.
  const card=page.locator('.benchmark-card').first();await card.scrollIntoViewIfNeeded();
  await moveTo(await card.boundingBox(),.8);await hold(3.7);

  // Open actual per-task repeat details.
  const breakdown=page.locator('.benchmark-repeat-breakdown summary').first();
  await clickWithPointer(breakdown);await hold(3.3);

  // Open a real execution trace from the saved evaluation.
  const trace=page.locator('.benchmark-attempts details summary').first();
  await clickWithPointer(trace);await hold(4.5);

  // Switch to the invoice task-domain workspace and show evidence review UI.
  const nav=page.getByRole('button',{name:'Resolution desk'}).first();
  await clickWithPointer(nav);await page.waitForTimeout(350);await hold(5.95);

  encoder.stdin.end();
  const code=await new Promise((resolve,reject)=>{encoder.once('error',reject);encoder.once('close',resolve);});
  if(code!==0)throw new Error(`Video encoder exited with ${code}`);
  if(errors.length)throw new Error(`Page errors: ${[...new Set(errors)].join(' | ')}`);
  console.log(`Captured website demo to ${output}; approximately 21.2 seconds at ${fps} fps.`);
}catch(error){encoder.stdin.destroy();encoder.kill();throw error;}finally{await browser.close();}

