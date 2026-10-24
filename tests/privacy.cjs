const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const client=fs.readFileSync('src/gas-client.js','utf8'),server=fs.readFileSync('Code.gs','utf8'),html=fs.readFileSync('index.html','utf8');
assert(!/google\.script\.run|gasCall\(|getRandomValues|RANK_PLAYER_KEY/.test(client),'no app RPC or tracking identity');
assert(!/SpreadsheetApp|PropertiesService|CacheService|Session\.|Logger\.|console\.log/.test(server),'server must not store student data');
assert(!/id="nameInput2?"|登録して記録|みんなのランキング/.test(html),'no personal registration or shared ranking UI');
const context={};vm.createContext(context);vm.runInContext(server,context);
assert.deepEqual(Object.keys(context).filter(x=>typeof context[x]==='function'&&!x.endsWith('_')),['doGet']);
assert(!JSON.parse(fs.readFileSync('appsscript.json','utf8')).oauthScopes?.length,'no spreadsheet permission');
console.log('PASS browser-only architecture: no RPC, identity generation, personal input, server storage or spreadsheet permission');
