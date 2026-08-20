/**
 * 生物タイピング — 高校生物 用語タイピングゲーム（GAS ウェブアプリ版）
 *
 * ・doGet        … ゲーム画面(index.html)を配信
 * ・submitScore  … スコアを記録（全員で共有・各自のベストを保存）
 * ・getRanking   … TOP5と自分の順位を返す
 *
 * ランキングは PropertiesService（スクリプトのプロパティ）に保存します。
 * ウェブアプリは「実行するユーザー：自分（先生）」で動くため、
 * 全生徒のスコアが同じ場所に集計され、みんなで共有されます。
 * 個別のGoogle権限の許可は生徒側では不要です。
 *
 * ※ GitHub Pages などの静的サイトに index.html だけを置いた場合、
 *   ランキング以外の機能はそのまま動作します（自動で非表示になります）。
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('生物タイピング — 高校生物 用語タイピング')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

var RANK_KEY = 'RANKING';               // タイピングモード
var RANK_KEY_QUIZ = 'RANKING_QUIZ';     // 一問一答クイズ（4択）モード
var RANK_KEY_RECALL = 'RANKING_RECALL'; // 記述クイズ（入力で答える）モード

// モードに応じた保存キーを返す
function rankKey(mode) {
  var m = String(mode);
  if (m === 'quiz') return RANK_KEY_QUIZ;
  if (m === 'recall') return RANK_KEY_RECALL;
  return RANK_KEY;
}

// スコアを記録し、更新後のランキングを返す（各名前のベストスコアのみ保持）
function submitScore(payload) {
  payload = payload || {};
  var m = String((payload || {}).mode);
  var mode = (m === 'quiz' || m === 'recall') ? m : 'type';
  var key = rankKey(mode);
  var name = String(payload.name || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 12);
  if (!name) name = '名無し';
  var score = Math.max(0, Math.floor(Number(payload.score) || 0));
  var entry = {
    score: score,
    done: Math.max(0, Math.floor(Number(payload.done) || 0)),
    kpm: Math.max(0, Math.floor(Number(payload.kpm) || 0)),
    acc: Math.max(0, Math.min(100, Math.floor(Number(payload.acc) || 0))),
    date: new Date().toISOString()
  };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(8000); } catch (e) { return getRanking(name, mode); }
  try {
    var props = PropertiesService.getScriptProperties();
    var data = safeParse(props.getProperty(key));
    var prev = data[name];
    if (!prev || score > prev.score) {
      data[name] = entry;
      props.setProperty(key, JSON.stringify(data));
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
  return getRanking(name, mode);
}

// TOP5 と、指定した名前の順位を返す（mode: 'type' | 'quiz' | 'recall'）
function getRanking(highlightName, mode) {
  var props = PropertiesService.getScriptProperties();
  var data = safeParse(props.getProperty(rankKey(mode)));
  var arr = Object.keys(data).map(function (n) {
    var e = data[n];
    return { name: n, score: e.score, done: e.done || 0, kpm: e.kpm || 0, acc: e.acc || 0 };
  });
  arr.sort(function (a, b) { return (b.score - a.score) || (b.kpm - a.kpm); });
  var myRank = 0, my = null;
  if (highlightName) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].name === highlightName) { myRank = i + 1; my = arr[i]; break; }
    }
  }
  return { top: arr.slice(0, 5), myRank: myRank, my: my, total: arr.length };
}

function safeParse(s) {
  try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; }
}

// （先生用）ランキングを全消去したいときに手動実行する関数
// タイピング・4択クイズ・記述クイズ すべてのランキングが消えます
function resetRanking() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(RANK_KEY);
  props.deleteProperty(RANK_KEY_QUIZ);
  props.deleteProperty(RANK_KEY_RECALL);
}
