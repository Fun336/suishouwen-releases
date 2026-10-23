import {execFileSync} from 'node:child_process';import {readdir} from 'node:fs/promises';
const team=process.env.APPLE_TEAM_ID;if(!/^[A-Z0-9]{10}$/.test(team||''))throw Error('Set APPLE_TEAM_ID repository variable');
execFileSync('/usr/bin/ditto',['-x','-k','payload/update.zip','payload/unpacked']);
const apps=(await readdir('payload/unpacked')).filter(n=>n.endsWith('.app'));if(apps.length!==1)throw Error('ZIP must contain one app');
const app='payload/unpacked/'+apps[0];
execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
// codesign writes identity to stderr, capture both streams via spawnSync.
const {spawnSync}=await import('node:child_process');const result=spawnSync('/usr/bin/codesign',['-dv','--verbose=4',app],{encoding:'utf8'});
if(!result.stderr.includes(`TeamIdentifier=${team}\n`)||!result.stderr.includes('Authority=Developer ID Application:'))throw Error('Unexpected Mac publisher');
execFileSync('/usr/sbin/spctl',['--assess','--type','execute','--verbose',app],{stdio:'inherit'});
execFileSync('/usr/bin/xcrun',['stapler','validate',app],{stdio:'inherit'});

const plist=app+'/Contents/Info.plist';
const read=key=>execFileSync('/usr/libexec/PlistBuddy',['-c','Print :'+key,plist],{encoding:'utf8'}).trim();
if(read('CFBundleIdentifier')!=='local.wenyiwen.desktop')throw Error('Unexpected bundle identifier');
if(read('CFBundleShortVersionString')!==process.env.RELEASE_TAG?.slice(1))throw Error('Bundle version does not match release');
const arch=process.env.TARGET==='mac-arm64'?'arm64':'x86_64';
for(const binary of ['MacOS/'+read('CFBundleExecutable'),'MacOS/Wen.Native','Resources/qt/Wen.Float'])
  execFileSync('/usr/bin/lipo',[app+'/Contents/'+binary,'-verify_arch',arch]);
