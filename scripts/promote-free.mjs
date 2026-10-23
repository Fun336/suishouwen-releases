import {readFile,writeFile,mkdir,appendFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {verifyFeed,verifySignature,decode} from './free-feed.mjs';
const {RELEASE_TAG:tag,TARGET_ARCH:arch,GITHUB_TOKEN:token,GITHUB_OUTPUT:output}=process.env;
if(!/^v\d+\.\d+\.\d+$/.test(tag||'')||!['arm64','x64'].includes(arch))throw Error('Invalid release target');
const key=(await readFile('config/mac-free-ed25519-public-key.txt','utf8')).trim();decode(key,32);
const r=await fetch(`https://api.github.com/repos/Fun336/suishouwen-releases/releases/tags/${tag}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'}});
if(!r.ok)throw Error(`Release lookup failed ${r.status}`);const release=await r.json();if(release.draft||release.prerelease)throw Error('Stable published release required');
const name=`mac-free-${arch}.xml`, asset=release.assets.find(a=>a.name===name);
if(!asset){await appendFile(output,'found=false\n');process.exit(0);}
async function download(url,max) {let res;for(let redirects=0;redirects<6;redirects++){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||!['github.com','release-assets.githubusercontent.com'].includes(u.hostname))throw Error('Disallowed download URL');res=await fetch(u,{redirect:'manual'});if([301,302,303,307,308].includes(res.status)){url=new URL(res.headers.get('location'),u).href;continue;}break;}if(!res.ok)throw Error('Asset download failed');let n=0;const chunks=[];for await(const part of res.body){n+=part.length;if(n>max)throw Error('Asset exceeds limit');chunks.push(part);}return Buffer.concat(chunks);}
const feedUrl=`https://github.com/Fun336/suishouwen-releases/releases/download/${tag}/${name}`;
if(asset.browser_download_url!==feedUrl)throw Error('Unexpected feed URL');
const feed=await download(feedUrl,1024*1024);const entry=verifyFeed(feed,key,{version:tag.slice(1),arch});
const zipAsset=release.assets.find(a=>a.name===entry.name);if(!zipAsset||zipAsset.size!==entry.length||zipAsset.browser_download_url!==entry.url)throw Error('Missing or inconsistent archive');
const zip=await download(entry.url,entry.length);if(zip.length!==entry.length)throw Error('Archive size mismatch');verifySignature(zip,entry.signature,key);
await mkdir('payload-free',{recursive:true});await writeFile('payload-free/update.zip',zip,{flag:'wx'});
execFileSync('python3',['-c',`import zipfile,pathlib,stat
z=zipfile.ZipFile('payload-free/update.zip')
for i in z.infolist():
 p=pathlib.PurePosixPath(i.filename)
 if p.is_absolute() or '..' in p.parts or chr(92) in i.filename: raise ValueError('Unsafe ZIP path')
 if stat.S_ISLNK(i.external_attr>>16):
  target=z.read(i).decode(); parts=list(p.parent.parts)
  if target.startswith('/'): raise ValueError('Absolute symlink')
  for part in target.split('/'):
   if part=='..':
    if len(parts)<=1: raise ValueError('Escaping symlink')
    parts.pop()
   elif part not in ('','.'): parts.append(part)
`]);
execFileSync('ditto',['-x','-k','payload-free/update.zip','payload-free/unpacked']);
const apps=(await readdir('payload-free/unpacked')).filter(n=>n.endsWith('.app'));if(apps.length!==1)throw Error('One app required');const app='payload-free/unpacked/'+apps[0];
const plist=app+'/Contents/Info.plist';const get=k=>execFileSync('/usr/libexec/PlistBuddy',['-c','Print :'+k,plist],{encoding:'utf8'}).trim();
if(get('CFBundleIdentifier')!=='local.wenyiwen.desktop'||get('CFBundleShortVersionString')!==tag.slice(1)||get('CFBundleVersion')!==tag.slice(1))throw Error('App identity/version mismatch');
if(get('SUPublicEDKey')!==key||get('SUFeedURL')!==`https://raw.githubusercontent.com/Fun336/suishouwen-releases/main/mac-free/${arch}.xml`||get('SURequireSignedFeed')!=='true'||get('SUVerifyUpdateBeforeExtraction')!=='true'||get('SUSignedFeedFailureExpirationInterval')!=='0')throw Error('App update trust policy mismatch');
for(const key of ['SUEnableAutomaticChecks','SUAutomaticallyUpdate','SUAllowsAutomaticUpdates','SUEnableSystemProfiling','SUShowReleaseNotes','SUEnableJavaScript'])if(get(key)!=='false')throw Error('Unexpected automatic update or content policy');
execFileSync('codesign',['--verify','--deep','--strict',app]);
for(const binary of ['MacOS/'+get('CFBundleExecutable'),'MacOS/Wen.Native','MacOS/Wen.Updater','Frameworks/Sparkle.framework/Versions/B/Sparkle','Resources/qt/Wen.Float'])execFileSync('lipo',[app+'/Contents/'+binary,'-verify_arch',arch==='arm64'?'arm64':'x86_64']);
await mkdir('feeds/mac-free',{recursive:true});await writeFile(`feeds/mac-free/${arch}.xml`,feed);
await appendFile(output,'found=true\n');
