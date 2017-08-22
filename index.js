var express = require('express');
var cheerio = require('cheerio');
var superagent = require('superagent');
var eventproxy = require('eventproxy');
var url = require('url');

var app = express();
var baseUrl = 'http://www.w3cplus.com';

app.get('/', function(req, sres) {



	superagent.get(baseUrl)
		.end(function(err, res) {
			if (err) {
				return next.err();
			}

			var $ = cheerio.load(res.text);
			var results = [];
			var arr = [];
			var lastUrl = $('.pager .pager-last a').attr('href').substring(1);
			var length = +lastUrl.substring(lastUrl.indexOf('=') + 1);

			for (var i = 1; i <= length; i++) {
				results.push(url.resolve(baseUrl, '/node?page=' + i));
			}
			results.length = 10;
			var ep = new eventproxy();
			ep.after('detail_html', results.length, function(topics) {
				topics = topics.map(function(topicPair) {
					var topicUrl = topicPair[0];
					var topicHtml = topicPair[1];
					var $ = cheerio.load(topicHtml);
					$('.node-blog').each(function(index, value) {
							var $value = $(value);
							var targetA = $value.find('a');
							var header = $value.find('.node-header');
							var tags = $value.find('.tags .field-item');
							var tagLength = tags.length;
							var tagsDetail = [];
							tags.each(function(index, ele) {
								var $ele = $(ele);
								tagsDetail.push($ele.text());
							})
							arr.push({
								title: targetA.text(),
								url: url.resolve(baseUrl, targetA.attr('href')),
								tags: tagsDetail,
								detail: $value.find('.body-content').text()
							})
						})
				})
				sres.send(arr);
			})
			results.forEach(function(result) {
				superagent.get(result)
					.end(function(err, sres) {
						if (err) {
							console.log(err);
							return;
						}
						console.log(result);
						/*console.log('fetch:' + result + 'successful');
						console.log(sres.text.substring(0,200));*/
						ep.emit('detail_html', [result, sres.text]);
					})
			})

		})
})

app.listen(3000, function() {
	console.log('app listening port at 3000');
})