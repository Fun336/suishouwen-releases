import {test} from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign} from 'node:crypto';
import {verifyFeed,verifySignature} from './free-feed.mjs';
const pair=generateKeyPairSync('ed25519'),key=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64');
const archive=Buffer.from('archive'),signature=sign(null,archive,pair.privateKey).toString('base64');
const xml=`<?xml version="1.0"?><rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel><item><sparkle:version>1.2.3</sparkle:version><enclosure url="https://github.com/Fun336/suishouwen-releases/releases/download/v1.2.3/Suishouwen-1.2.3-mac-free-arm64.zip" sparkle:edSignature="${signature}" length="7"/></item></channel></rss>`;
function signed(text){const b=Buffer.from(text);return Buffer.concat([b,Buffer.from(`<!-- sparkle-signatures:\nedSignature: ${sign(null,b,pair.privateKey).toString('base64')}\nlength: ${b.length}\n-->\n`)]);}
test('signed feed and archive validate; corruption, appended XML, wrong key/version/URLs fail',()=>{
 assert.equal(verifyFeed(signed(xml),key,{version:'1.2.3',arch:'arm64'}).length,7);
 verifySignature(archive,signature,key);
 assert.throws(()=>verifySignature(Buffer.from('changed'),signature,key));
 assert.throws(()=>verifyFeed(Buffer.concat([signed(xml),Buffer.from('<evil/>')]),key,{version:'1.2.3',arch:'arm64'}));
 assert.throws(()=>verifyFeed(signed(xml.replace('github.com','evil.com')),key,{version:'1.2.3',arch:'arm64'}));
 assert.throws(()=>verifyFeed(signed(xml),key,{version:'1.2.4',arch:'arm64'}));
 assert.throws(()=>verifyFeed(signed(xml),Buffer.alloc(32).toString('base64'),{version:'1.2.3',arch:'arm64'}));
 assert.throws(()=>verifyFeed(signed(xml.replace('<rss','<!DOCTYPE rss><rss')),key,{version:'1.2.3',arch:'arm64'}));
});
