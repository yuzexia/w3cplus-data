let http = require('http');
let https = require('https');
let iconv = require('iconv-lite');
let cheerio = require('cheerio');
let promise = require('request-promise');
let mysql = require('mysql');
let connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'cAuth'
})

let index = 0; // 页数从0开始
let baseUrl = 'https://www.w3cplus.com/';
let contentData = [];
let max; // 最大页数
// 所有帖子内容
let threadData = [];

// 获取所有帖子链接
function loadPageData(url, index) {
    console.log(`正在获取第${index}页数据`);
    https.get(`${url}?page=${index}`, response => {
        let chunks = [];
        response.on('data', chunk => {
            chunks.push(chunk);
        })
        response.on('end', () => {
            let html = Buffer.concat(chunks);
            let $ = cheerio.load(html);
            $('.page-inner .node-blog').each((index, element) => {
                let ele = $(element);
                let title = ele.children('h1').find('a').text();
                let titleUrl = `${baseUrl}${ele.children('h1').find('a').attr('href')}`;
                let summary = ele.children('.body-content').find('p').text();
                let basic = [];
                let tags = [];
                // 获取作者，时间，浏览量信息
                ele.children('.node-header').find('span').each((idx, item) => {
                    let _ele = $(item);
                    basic.push(_ele.text())
                });
                // 获取tags信息
                ele.children('.node-header').find('.field-item').each((idx, item) => {
                    let _ele = $(item);
                    tags.push(_ele.text());
                });
                contentData.push({title, titleUrl, summary, basic, tags});
                saveLists({title, titleUrl, summary, basic, tags});
            })
            if (index === 0) max = $('.pager-last').children('a').attr('href').split('=')[1]
            if (index < max) {
                loadPageData(url, ++index)
            } else {
                console.log('完成了...');
                // getSingleContent(contentData, 0)
            }
            console.log('max::::', max);
            console.log(contentData.length);
        })
    })
}

// 获取单个帖子内容
function getSingleContent(urls, index) {
    console.log(`正在获取第${index}条数据，标题为：${urls[index].title}的内容`);

    promise({
        uri: urls[index].titleUrl
    }).then(response => {
        // {decodeEntities: false} 解决中文乱码的问题
        let $ = cheerio.load(response, {decodeEntities: false});
        let title = urls[index].title;
        let basic = [];
        let tags = [];
        // 获取文章 作者，时间，浏览数
        $('#block-system-main .submitted').find('span').each((idx, item) => {
            let ele = $(item);
            basic.push(ele.text());
        })
        // 获取标签
        $('#block-system-main .tags').find('.field-item').each((idx, item) => {
            let ele = $(item);
            tags.push(ele.text());
        });
        let content = $('.body-content .field-items').html();
        threadData.push({title, basic, tags, content});
        saveThread({title, basic, tags, content});
        if (index < urls.length - 1) {
            getSingleContent(contentData, ++index);
        } else {
            console.log('threads 获取完成');
            // console.log('threadData::::', threadData)
        }
    }).catch(error => {
        console.log('error', error);
    })
}

// 将帖子列表保存到mysql lists表中
function saveLists(data) {
    // 查询title
    let sql = 'SELECT * FROM lists WHERE title="' + data.title + '"';
    // 插入
    let addSql = 'INSERT INTO lists (title, titleUrl, summary, basic, tags, time) VALUES(?, ?, ?, ?, ?, ?)';
    let params = [data.title, data.titleUrl, data.summary, JSON.stringify(data.basic), JSON.stringify(data.tags), new Date()];
    connection.query(sql, (error, result) => {
        if (error) {
            console.log('连接数据库失败...', error);
        } else {
            if (result.length) {
                console.log('数据已存在...');
            } else {
                connection.query(addSql, params, (err, res) => {
                    if (err) {
                        console.log('保存失败...', err);
                    } else {
                        console.log('保存成功...', result);
                    }
                })
            }
        }
    });

}

// 保存帖子内容
function saveThread(data) {

}

function main() {
    console.log('开始...');
    loadPageData(baseUrl, index);
}

main();


function testSql() {
    connection.connect();
    let sql = 'SELECT * FROM lists WHERE title=\'ggg\'';
    // let sql = 'SELECT * FROM lists';
    // 查
    connection.query(sql, (err, result) => {
        console.log('查：err:::', err);
        console.log('查：result:::', result);
    })
    // 插入
    let addSql = 'INSERT INTO lists (Id, title, titleUrl, summary, basic, tags, time) VALUES(0, ?, ?, ?, ?, ?, ?)';
    let params = ['111', '222', '333', '444', '555', new Date()];
    connection.query(addSql, params, (err, result) => {
        console.log('新增err:::', err);
        console.log('新增result:::', result);
        console.log('新增 结束');
    })
}

// testSql();

