import {createPublicKey,verify} from 'node:crypto';
import {spawnSync} from 'node:child_process';
export function decode(value,length) {
 if(typeof value!=='string'||!new RegExp(`^[A-Za-z0-9+/]+={0,2}$`).test(value))throw Error('Invalid base64');
 const bytes=Buffer.from(value,'base64');if(bytes.length!==length||bytes.toString('base64')!==value)throw Error('Invalid key/signature length');return bytes;
}
export function verifySignature(bytes,signature,key) {
 const publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),decode(key,32)]),format:'der',type:'spki'});
 if(!verify(null,bytes,publicKey,decode(signature,64)))throw Error('Ed25519 verification failed');
}
export function verifyFeed(bytes,key,{version,arch}) {
 if(!/^\d+\.\d+\.\d+$/.test(version)||!['arm64','x64'].includes(arch))throw Error('Invalid version/architecture');
 if(bytes.length>1024*1024)throw Error('Feed too large');
 const marker=Buffer.from('<!-- sparkle-signatures:\n');const start=bytes.lastIndexOf(marker);
 if(start<0)throw Error('Signed feed required');
 const footer=bytes.subarray(start).toString('utf8');
 const match=/^<!-- sparkle-signatures:\nedSignature: ([A-Za-z0-9+/=]+)\nlength: (\d+)\n-->\n?$/.exec(footer);
 if(!match||Number(match[2])!==start)throw Error('Invalid signed feed footer');
 verifySignature(bytes.subarray(0,start),match[1],key);
 const xml=bytes.subarray(0,start).toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('DTD/entities forbidden');
 const parser=spawnSync('python3',['-c',`import sys,json,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.buffer.read()); n={'s':'http://www.andymatuschak.org/xml-namespaces/sparkle'}
items=r.findall('./channel/item')
if len(items)!=1: raise ValueError('Exactly one item required')
i=items[0]; es=i.findall('enclosure')
if len(i.findall('s:version',n))!=1: raise ValueError('One version required')
if len(es)!=1: raise ValueError('Exactly one enclosure required')
if i.findall('s:releaseNotesLink',n) or i.findall('s:deltas',n): raise ValueError('External notes and deltas unsupported')
e=es[0]
if e.get('{'+n['s']+'}installationType') not in (None,'application'): raise ValueError('Unsupported installation type')
print(json.dumps({'version':i.findtext('s:version',namespaces=n),'url':e.get('url'),'signature':e.get('{'+n['s']+'}edSignature'),'length':e.get('length')}))`],{input:xml,encoding:'utf8'});
 if(parser.status!==0)throw Error('Invalid appcast XML');
 const data=JSON.parse(parser.stdout);
 const name=`Suishouwen-${version}-mac-free-${arch}.zip`;
 const url=`https://github.com/Fun336/suishouwen-releases/releases/download/v${version}/${name}`;
 if(data.version!==version||data.url!==url)throw Error('Feed version/URL mismatch');
 if(!/^\d+$/.test(data.length)||Number(data.length)<=0||Number(data.length)>2*1024**3)throw Error('Invalid archive length');
 decode(data.signature,64);return {...data,name,length:Number(data.length)};
}
