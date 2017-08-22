var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');

var app = express();

var baseUrl = 'http://www.w3cplus.com/'

app.get('/', function(req, res) {
	superagent.get(baseUrl)
		.end(function(err, sres) {
			if (err) {
				return next(err);
			}

			var $ = cheerio.load(sres.text);
			var lastPageUrl = $('.pager .pager-last a').attr('href');
			var pageNum = parseInt(lastPageUrl.substring(lastPageUrl.indexOf('=') + 1));
			var result = [];
			var urls = [];
			console.log(sres.text);
			console.log($('*').length)
			console.log(typeof pageNum)
			$('#block-system-main .node-blog').each(function(index, value) {
				var $ele = $(value);
				result.push({
					title: $ele.find('h1 a').text(),
					href: baseUrl + $ele.find('h1 a').attr('href'),
					content: $ele.find('.field-item p').text()
				})
			})
			for (var i = 1; i <= pageNum; i++) {
				urls.push(baseUrl + 'node?page=' + i);
			}
			console.log(urls);
			res.send(result);
		})
})

app.listen(3000, function() {
	console.log('app listening at port is 3000')
})