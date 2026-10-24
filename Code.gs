/** 生物タイピング GAS版。公開RPCは getAppInfo / getRanking / submitScore のみ。 */
var BIO_VERSION = '2026.10.23';
var BIO_SHEET_PROPERTY = 'BIO_RANKING_SHEET_ID';
var BIO_SHEET_NAME = 'Scores';
var BIO_HEADERS = ['出題条件', 'ブラウザID', '表示名(JSON)', '最高得点', '正解語数', '打鍵/分', '正確率', '更新日時'];
var BIO_MAX_ROWS = 20000;
function bundledFile_(name) {
  // Read before HTML sanitization, which removes the compressed comment envelope.
  var html = HtmlService.createTemplateFromFile(name).getRawContent();
  // Lossless storage compression keeps the Apps Script project below its size limit.
  // Accept the older plain HTML bundle too, so existing deployments remain compatible.
  var packed = html.match(/^<!--BIO_HTML_GZIP_V1:([A-Za-z0-9+/=]+)-->\s*$/);
  if (packed) {
    html = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(packed[1]), 'application/gzip', 'index.html.gz')).getDataAsString('UTF-8');
  }
  return html;
}
function doGet() {
  var html = bundledFile_('index');
  var artPattern = /const\s+ART\s*=\s*\{\s*\};/;
  if (artPattern.test(html)) {
    var art = {};
    for (var i=1;i<=5;i++) {
      var part = JSON.parse(bundledFile_('biome-art-'+i));
      Object.keys(part).forEach(function(key){art[key]=part[key];});
    }
    html = html.replace(artPattern,function(){return 'const ART='+JSON.stringify(art)+';';});
  }
  return HtmlService.createHtmlOutput(html).setTitle('生物タイピング — 生物基礎・生物 学習アプリ').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function getAppInfo() {
  return {version:BIO_VERSION, rankingReady:!!PropertiesService.getScriptProperties().getProperty(BIO_SHEET_PROPERTY), learningStorage:'browser'};
}
function rankKey_(mode, context) {
  if (['type','quiz','recall'].indexOf(mode)<0) throw new Error('練習方法が不正です。再読み込みしてください。');
  var m=typeof context==='string'&&context.match(/^v([345])_(time_(60|120)|count_15)_([0-9-]+)_([0-3]{9})(?:_([012])_(all|[AB][1-5][abc]|P))?$/);
  if(!m||context.length>100||(m[1]==='5')!==!!m[6])throw new Error('出題条件が不正です。再読み込みしてください。');
  var cats=m[4].split('-');
  if(cats.some(function(c){return !/^(0|[1-9]|10)$/.test(c);})||new Set(cats).size!==cats.length||(cats.indexOf('0')>=0&&cats.length>1))throw new Error('出題カテゴリが不正です。');
  if(m[1]==='5'){
    var units=['all','B1a','B1b','B2a','B2b','B3a','B3b','A1a','A1b','A1c','A2a','A2b','A3a','A3b','A3c','A4a','A4b','A5a','A5b','P'];
    if(units.indexOf(m[7])<0||(m[6]==='1'&&/^A/.test(m[7]))||(m[6]==='2'&&/^B/.test(m[7])))throw new Error('科目と単元が一致しません。');
  }
  return context+'_'+mode;
}
function playerId_(value) {
  if(typeof value!=='string'||!/^[a-f0-9-]{32,36}$/.test(value))throw new Error('ブラウザの識別情報がありません。再読み込みしてください。');
  return value;
}
function playerName_(value) {
  if(typeof value!=='string')throw new Error('表示名を入力してください。');
  var name=value.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,12);
  if(!name)throw new Error('表示名を入力してください。');return name;
}
function integer_(value,max,label) {
  if(typeof value!=='number'||!Number.isFinite(value)||!Number.isInteger(value)||value<0||value>max)throw new Error(label+'の値が不正です。');return value;
}
function withRankLock_(fn) {
  var lock=LockService.getScriptLock();if(!lock.tryLock(8000))throw new Error('送信が混み合っています。少し待って再送信してください。');
  try{return fn();}finally{lock.releaseLock();}
}
function rankingSheet_() {
  var id=PropertiesService.getScriptProperties().getProperty(BIO_SHEET_PROPERTY);
  if(!id)throw new Error('ランキングは準備中です。先生が setupApp_ を実行すると利用できます。');
  var sheet=SpreadsheetApp.openById(id).getSheetByName(BIO_SHEET_NAME);
  if(!sheet||JSON.stringify(sheet.getRange(1,1,1,8).getValues()[0])!==JSON.stringify(BIO_HEADERS))throw new Error('保存先を確認できません。先生に連絡してください。');return sheet;
}
function readRows_(sheet) {
  var count=sheet.getLastRow()-1;
  if(count>BIO_MAX_ROWS)throw new Error('保存件数が上限に達しました。先生にランキングの切り替えを依頼してください。');
  return count>0?sheet.getRange(2,1,count,8).getValues():[];
}
function records_(rows,key) {
  return rows.filter(function(r){return r[0]===key&&typeof r[1]==='string'&&Number.isFinite(r[3]);}).map(function(r){
    var name;try{name=JSON.parse(r[2]);}catch(e){name='名称不明';}
    return {id:r[1],name:typeof name==='string'?name:'名称不明',score:r[3],done:r[4],kpm:r[5],acc:r[6],date:String(r[7])};
  }).sort(function(a,b){return b.score-a.score||b.kpm-a.kpm||a.date.localeCompare(b.date)||a.id.localeCompare(b.id);});
}
function rankingResponse_(arr,id) {
  var myIndex=arr.findIndex(function(r){return r.id===id;});
  function publicRow(r){return {name:r.name,score:r.score,done:r.done,kpm:r.kpm,acc:r.acc,isMe:r.id===id};}
  return {top:arr.slice(0,5).map(publicRow),myRank:myIndex+1,my:myIndex>=0?publicRow(arr[myIndex]):null,total:arr.length};
}
function cacheKey_(key) {
  return 'bio-ranking:'+(PropertiesService.getScriptProperties().getProperty('BIO_RANKING_EPOCH')||'1')+':'+key;
}
function getRanking(highlightName,mode,context,playerId) {
  var key=rankKey_(mode,context),id=playerId?playerId_(playerId):'',cache=CacheService.getScriptCache(),cacheKey=cacheKey_(key),cached=cache.get(cacheKey);
  if(cached){try{return rankingResponse_(JSON.parse(cached),id);}catch(e){}}
  return withRankLock_(function(){
    var arr=records_(readRows_(rankingSheet_()),key),encoded=JSON.stringify(arr);
    if(Utilities.newBlob(encoded).getBytes().length<80000)cache.put(cacheKey,encoded,30);
    return rankingResponse_(arr,id);
  });
}
function submitScore(payload) {
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('送信内容が不正です。');
  var key=rankKey_(payload.mode,payload.context),id=playerId_(payload.playerId),name=playerName_(payload.name);
  var score=integer_(payload.score,1000000,'得点'),done=integer_(payload.done,payload.context.indexOf('_count_15_')>=0?15:2000,'正解語数');
  var kpm=integer_(payload.kpm,3000,'打鍵数'),acc=integer_(payload.acc,100,'正確率');
  return withRankLock_(function(){
    var sheet=rankingSheet_(),rows=readRows_(sheet),index=rows.findIndex(function(r){return r[0]===key&&r[1]===id;});
    // JSON encoding prevents display names from becoming spreadsheet formulas.
    var entry=[key,id,JSON.stringify(name),score,done,kpm,acc,new Date().toISOString()];
    if(index<0){
      if(rows.length>=BIO_MAX_ROWS)throw new Error('保存件数が上限に達しました。先生にランキングの切り替えを依頼してください。');
      if(rows.length+2>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),Math.min(1000,BIO_MAX_ROWS+1-sheet.getMaxRows()));
      sheet.getRange(rows.length+2,1,1,8).setValues([entry]);rows.push(entry);
    }else if(score>rows[index][3]||(score===rows[index][3]&&kpm>rows[index][5])){
      sheet.getRange(index+2,1,1,8).setValues([entry]);rows[index]=entry;
    }else if(rows[index][2]!==entry[2]){
      rows[index][2]=entry[2];sheet.getRange(index+2,3).setValue(entry[2]);
    }
    SpreadsheetApp.flush();CacheService.getScriptCache().remove(cacheKey_(key));
    return rankingResponse_(records_(rows,key),id);
  });
}
// Teacher-only: trailing underscores prevent browser RPC calls.
function setupApp_() {
  return withRankLock_(function(){
    var props=PropertiesService.getScriptProperties(),id=props.getProperty(BIO_SHEET_PROPERTY),book;
    if(id){book=SpreadsheetApp.openById(id);rankingSheet_();}
    else{
      book=SpreadsheetApp.create('生物タイピング：授業ランキング');
      var sheet=book.getSheets()[0];sheet.setName(BIO_SHEET_NAME);initializeSheet_(sheet);
      props.setProperty(BIO_SHEET_PROPERTY,book.getId());props.setProperty('BIO_RANKING_EPOCH',Utilities.getUuid());
    }
    console.log('保存先（先生専用・生徒への共有は不要）: '+book.getUrl());
    return {version:BIO_VERSION,spreadsheetUrl:book.getUrl()};
  });
}
function initializeSheet_(sheet) {
  sheet.getRange(1,1,1,8).setValues([BIO_HEADERS]);sheet.setFrozenRows(1);
  sheet.getRange('A:C').setNumberFormat('@');sheet.getRange('H:H').setNumberFormat('@');
}
function archiveRankings_() {
  return withRankLock_(function(){
    var sheet=rankingSheet_(),book=sheet.getParent();
    sheet.setName('Scores_archive_'+Date.now()+'_'+Utilities.getUuid().slice(0,8));initializeSheet_(book.insertSheet(BIO_SHEET_NAME));
    PropertiesService.getScriptProperties().setProperty('BIO_RANKING_EPOCH',Utilities.getUuid());
    console.log('新しいランキングを開始しました。以前の記録は保存先の別シートに残しています。');
  });
}
