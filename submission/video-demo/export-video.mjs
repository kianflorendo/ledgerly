import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const output = process.env.VIDEO_OUTPUT ? path.resolve(process.env.VIDEO_OUTPUT) : path.join(project, 'ledgerly-agent-benchmark-video.mp4');
const fps = Number(process.env.VIDEO_FPS || 15);
const duration = Number(process.env.VIDEO_DURATION || 114);
const encoder = spawn('python', [path.join(here, 'encode-video.py'), output, String(fps)], {stdio:['pipe','inherit','inherit']});
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,reducedMotion:'no-preference'});
const errors=[];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {if(message.type()==='error') errors.push(message.text());});
try {
  await page.goto(pathToFileURL(path.join(here, 'index.html')).href, {waitUntil:'load',timeout:20000});
  await page.waitForFunction(() => window.__timelines?.main && document.querySelector('#live-site-demo')?.readyState >= 2, null, {timeout:20000});
  const ready = await page.evaluate(() => ({gsap:typeof gsap?.timeline, timeline:!!window.__timelines?.main, seconds:window.__videoDuration}));
  if(ready.gsap!=='function' || !ready.timeline) throw new Error(`Composition not ready: ${JSON.stringify(ready)}`);
  const total = Math.round(duration*fps);
  for(let i=0;i<total;i++){
    const time=i/fps;
    await page.evaluate(async t=>{
      window.__timelines.main.seek(t,false);
      const video=document.querySelector('#live-site-demo');
      if(video && t>=62.8 && t<84){
        const target=Math.min(t-62.8,21.15);
        if(Math.abs(video.currentTime-target)>.02){
          await new Promise(resolve=>{const timeout=setTimeout(resolve,3000);video.addEventListener('seeked',()=>{clearTimeout(timeout);resolve();},{once:true});video.currentTime=target;});
        }
      }else if(video){video.pause();}
      await new Promise(requestAnimationFrame);
    },time);
    const frame=await page.screenshot({type:'jpeg',quality:88,animations:'allow'});
    const header=Buffer.alloc(4);header.writeUInt32BE(frame.length);
    if(!encoder.stdin.write(Buffer.concat([header,frame]))) await once(encoder.stdin,'drain');
    if(i>0 && i%(fps*10)===0) console.log(`captured ${Math.round(time)} / ${duration} seconds`);
  }
  encoder.stdin.end();
  const code=await new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',resolve);});
  if(code!==0) throw new Error(`OpenCV encoder exited with ${code}`);
  if(errors.length) throw new Error(`Browser reported: ${[...new Set(errors)].join(' | ')}`);
  console.log(`Created ${output} (${total} frames at ${fps} fps, ${duration} sec)`);
} catch(error) {
  encoder.stdin.destroy(); encoder.kill();
  throw error;
} finally {
  await browser.close();
}
