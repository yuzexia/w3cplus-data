var express = require('express');
var cheerio = require('cheerio');
var superagent = require('superagent');
var eventproxy = require('eventproxy');
var async = require('async');
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
			// results.length = 10;
			
		 	var concurrencyCount = 0;
			var fetchUrl = function(url, callback) {
				var delay = parseInt((Math.random() * 10000000) % 2000, 10);
				concurrencyCount++;
				console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');
				setTimeout(function() {
					concurrencyCount--;
					callback(null, url + ' html content');
				}, delay);
				superagent.get(url)
					.end(function(err, resu){
						console.log(3)
						if(err){return next.err()}
						var $ = cheerio.load(resu.text);
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
				sres.send(arr)
			};
			
			async.mapLimit(results, 5, function (url, callback) {
			  fetchUrl(url, callback);
			  console.log(333)
			}, function (err, result) {
			  console.log('final:');
			  console.log(result);
			});
		})
})

app.listen(3000, function() {
	console.log('app listening port at 3000');
})