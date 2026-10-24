const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function run(){
 const context={HtmlService:{createTemplateFromFile(){return {getRawContent:()=>'<html>legacy</html>'}},createHtmlOutput(html){assert.equal(html,'<html>legacy</html>');return {setTitle(){return this},addMetaTag(){return this}}}}};
 for(const name of ['SpreadsheetApp','PropertiesService','CacheService','Session','Logger'])context[name]=new Proxy({}, {get(){throw new Error('No student data service may be accessed: '+name)}});
 vm.createContext(context);vm.runInContext(fs.readFileSync('Code.gs','utf8'),context);context.doGet();
 for(const name of ['getRanking','submitScore','setupApp_','archiveRankings_','getAppInfo'])assert.equal(typeof context[name],'undefined');
 console.log('PASS GAS serves HTML only; no ranking endpoints or personal-data storage');
}
if(require.main===module)run();module.exports={run};
