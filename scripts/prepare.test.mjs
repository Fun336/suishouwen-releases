import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const moduleUrl=new URL('./prepare.mjs',import.meta.url).href;
async function run({target='mac-arm64',size=3,prerelease=false,tag='v0.9.2'}={}){
 const dir=await mkdtemp(path.join(tmpdir(),'wen-feed-'));
 const name=target==='windows-x64'?'Suishouwen-0.9.2-Setup.exe':'Suishouwen-0.9.2-mac-arm64.zip';
 const release={draft:false,prerelease,assets:[{name,size,browser_download_url:'https://github.com/Fun336/suishouwen-releases/releases/download/v0.9.2/'+name}]};
 const code=`globalThis.fetch=async url=>url.includes('api.github.com')?new Response(JSON.stringify(${JSON.stringify(release)})):new Response('abc');await import(${JSON.stringify(moduleUrl)});`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:dir,env:{...process.env,RELEASE_TAG:tag,TARGET:target,GITHUB_OUTPUT:path.join(dir,'output')},encoding:'utf8'});
 return {dir,result,cleanup:()=>rm(dir,{recursive:true,force:true})};
}
test('Mac manifest matches actual bytes',async()=>{const r=await run();try{assert.equal(r.result.status,0,r.result.stderr);const feed=JSON.parse(await readFile(path.join(r.dir,'feeds/mac/arm64.json')));assert.equal(feed.currentRelease,'0.9.2');assert.equal(feed.releases[0].updateTo.size,3);assert.equal(feed.releases[0].updateTo.sha256,createHash('sha256').update('abc').digest('hex'));}finally{await r.cleanup();}});
test('Windows manifest matches version',async()=>{const r=await run({target:'windows-x64'});try{assert.equal(r.result.status,0,r.result.stderr);assert.equal(JSON.parse(await readFile(path.join(r.dir,'feeds/windows/x64.json'))).version,'0.9.2');}finally{await r.cleanup();}});
for(const [name,options] of [['oversize',{size:2}],['truncated',{size:4}],['prerelease',{prerelease:true}],['invalid target',{target:'other'}],['invalid tag',{tag:'latest'}]])test('rejects '+name,async()=>{const r=await run(options);try{assert.notEqual(r.result.status,0);}finally{await r.cleanup();}});
test('absent platform is not promoted',async()=>{const r=await run({target:'mac-x64'});try{assert.equal(r.result.status,0);assert.equal(await readFile(path.join(r.dir,'output'),'utf8'),'found=false\n');}finally{await r.cleanup();}});
