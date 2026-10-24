/** Browser-only edition. The server serves the app and stores no learner records. */
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
