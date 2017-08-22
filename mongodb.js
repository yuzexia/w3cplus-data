var MongoClient = require('mongodb').MongoClient;
var DB_CON_STR = 'mongodb://127.0.0.1:27017/data';

var insertData = function(db, callback) {
	console.log('1');
	var collection = db.collection('website');
	var data = [{
		'name': 'white',
		'url': 'http://www.white.com'
	}, {
		'name': 'quality',
		'url': 'http://www.quality.com'
	}]
	collection.insert(data, function(err, result) {
		if (err) {
			console.log('Error:' + err);
			return;
		}
		callback(result);
	})
}

MongoClient.connect(DB_CON_STR, function(err, db){
	insertData(db, function(result){
		db.close();
	})
})