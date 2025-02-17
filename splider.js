

var superagent = require('superagent')
var cheerio = require('cheerio')
var http = require('http')
var url = require('url');
var async = require('async')
const server = http.createServer((req, res) => {
  var count = 0;
  var fetchUrl = function (offset, callback) {
    count++;
    console.log('当前并发数：', count)
    var baseUrl = 'http://www.zhihu.com/node/ExploreAnswerListV2'
    var params = {
      'offset':offset,
      'type':'day'
    }
    superagent.get(baseUrl)
          .set({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            'Referrer': 'www.baidu.com',
            'Content-Type': 'text/plain; charset=UTF-8'
          })
          .query({
            params: JSON.stringify(params)
          })
          .end(function(err, obj) {
            if(err) return null
            var $ = cheerio.load(obj.text)
            var items = []
            var baseUrl = 'https://www.zhihu.com'
            $('.explore-feed').each(function (index, item) {
              // item = this, $(this)转换为jq对象
              var tittle = $(this).find('h2 a').text().replace(/[\r\n]/g, '')
              var href = url.resolve(baseUrl, $(this).find('h2 a').attr('href'))
              var author = $(this).find('.author-link').text()
              items.push({
                title: tittle,
                href: href,
                author: author
              })
            })
            count--
            console.log('释放了并发数后，当前并发数：', count)
            callback(null, JSON.stringify(items))
          })
  };
  var offsets = [];
  for(var i = 0; i < 13; i++) {
    offsets.push(i * 5);
  }
  async.mapLimit(offsets, 5, function (offset, callback) {
    fetchUrl(offset, callback);
  }, function (err, result) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end(JSON.stringify(result))
  });
}).listen(9090)
