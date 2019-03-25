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
    let argsLength = process.argv.splice(2).length; // 判断执行命令时是否传入参数，如果传入只需要爬去最新的1页(20条)。
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
                let author = basic[0];
                let reDate = basic[1];
                let views = basic[2];
                // 获取tags信息
                ele.children('.node-header').find('.field-item').each((idx, item) => {
                    let _ele = $(item);
                    tags.push(_ele.text());
                });
                contentData.push({title, titleUrl, summary, basic, tags, author, reDate, views});
                saveLists({title, titleUrl, summary, basic, tags, author, reDate, views});
            })
            if (index === 0) {
                max = $('.pager-last').children('a').attr('href').split('=')[1]
            }
            if (argsLength) {
                max = 1;
            }
            console.log('max:::', max);
            if (index < max) {
                loadPageData(url, ++index)
            } else {
                console.log('完成了...');
                getSingleContent(contentData, 0)
            }
            // console.log('max::::', max);
            // console.log(contentData.length);
        })
    })
}



// 获取单个帖子内容
function getSingleContent(urls, index) {
    console.log(`正在获取第${index}条数据，标题为：${urls[index].title}的内容，url: ${urls[index].titleUrl}`);

    https.get(urls[index].titleUrl, response => {
        let chunks = [];
        response.on('data', chunk => {
            chunks.push(chunk);
        });

        response.on('end', () => {
            let html = Buffer.concat(chunks);
            let $ = cheerio.load(html, {decodeEntities: false});
            let title = urls[index].title;
            let basic = [];
            let tags = [];
            // 获取文章 作者，时间，浏览数
            $('#block-system-main .submitted').find('span').each((idx, item) => {
                let ele = $(item);
                basic.push(ele.text());
            })
            let author = basic[0];
            let releaseDate = basic[1];
            let views = basic[2];
            // 获取标签
            $('#block-system-main .tags').find('.field-item').each((idx, item) => {
                let ele = $(item);
                tags.push(ele.text());
            });
            let content = $('.body-content .field-items').html();
            threadData.push({title, basic, tags, content});
            console.log('basic:::', basic);
            saveThread({title, basic, author, releaseDate, views, tags, content});
            if (index < urls.length - 1) {
                getSingleContent(contentData, ++index);
            } else {
                console.log('threads 获取完成');
            }
        });

    })
}

// 将帖子列表保存到mysql lists表中
function saveLists(data) {
    // 查询title
    let sql = 'SELECT * FROM lists WHERE title="' + data.title + '"';
    // 插入
    let addSql = 'INSERT INTO lists (title, titleUrl, summary, basic, tags, time, author, release_date, views) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)';
    let params = [data.title, data.titleUrl, data.summary, JSON.stringify(data.basic), JSON.stringify(data.tags), new Date(), data.author, data.reDate, data.views];
    connection.query(sql, (error, result) => {
        if (error) {
            console.log('连接数据库失败...', error);
        } else {
            console.log('result.length');
            if (result.length) {
                console.log('lists数据已存在...');
                // 已经存在，就更新数据  author, reDate, views
                let updateSql = 'UPDATE lists SET author = ?, release_date = ?, views = ? WHERE id = ?';
                let updateParams = [data.author, data.reDate, data.views, result[0].id];
                connection.query(updateSql, updateParams, (err, res) => {
                    if (err) {
                        console.log('更新lists数据失败...', err);
                    } else {
                        console.log('更新lists数据成功...');
                    }
                })
            } else {
                connection.query(addSql, params, (err, res) => {
                    if (err) {
                        console.log('保存lists失败...', err);
                    } else {
                        console.log('保存lists成功...');
                    }
                })
            }
        }
    });

}

// 保存帖子内容
function saveThread(data) {
    // 通过title查询tid
    let titleSql = 'SELECT * FROM lists WHERE title="' + data.title + '"';
    // 添加到threads表中的sql
    let addSql = 'INSERT INTO threads (tid, title, basic, message, tags, create_time, last_visit_time, views, release_date, author) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    connection.query(titleSql, (error, result) => {
        if (error) {
            console.log('保存帖子-查询结果error:::::', error);
        } else {
            console.log('保存帖子-查询结果result:::::');
            let params = [result[0].id, data.title, JSON.stringify(data.basic), data.content, JSON.stringify(data.tags), new Date(), new Date(), data.views, data.releaseDate, data.author];
            // 通过tid查询
            let tidSql = 'SELECT * FROM threads WHERE tid="' + result[0].id + '"';
            connection.query(tidSql, (err, response) => {
                if (err) {
                    console.log('查询失败：：：', err);
                } else {
                    if (response.length) {
                        console.log('插入threads数据库失败：帖子已经存在...');
                        // 更新数据
                        // let updateSql = 'UPDATE threads SET basic = ?, message = ?, tags = ? WHERE tid = ?';
                        // let updateParams = [JSON.stringify(data.basic), data.content, JSON.stringify(data.tags), response[0].tid];
                        // connection.query(updateSql, updateParams, (e, res) => {
                        //     if (e) {
                        //         console.log('thread 更新数据失败...', e);
                        //     } else {
                        //         console.log('thread 更新数据成功...', res);
                        //     }
                        // })
                    } else {
                        connection.query(addSql, params, (e, res) => {
                            if (e) {
                                console.log('插入threads数据库失败...', e);
                            } else {
                                console.log('插入threads数据库成功');
                            }
                        })
                    }
                }
            })
        }
    })
}

function main() {
    console.log('开始...');
    loadPageData(baseUrl, index);
}

main();












// promise 获取单个帖子内容
function getSingleContentPromise(urls, index) {
    console.log(`正在获取第${index}条数据，标题为：${urls[index].title}的内容，url: ${urls[index].titleUrl}`);

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
        }
    }).catch(error => {
        console.log('error', error);
    })
}