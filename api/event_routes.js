var db = require('../db/db'),
		news = require('../modules/ffnews/ffnews');

module.exports = function (app) {
	// Projection: Manually executes news.fetch()
	// and returns the result.
	// TODO: remove - this will be a scheduled process
	app.get('/api/events/fetch', function (req, res) {
		news.fetch(function (err, events) {
			if (err) res.send(500, err);
			db.insert(events, function (err) {
				if (err) res.send(500, err);
				res.send(200, events);
			});
		});
	});
	// Projection: Returns all events that have not
	// yet occurred.
	app.get('/api/events/latest', function (req, res) {
		db.NewsEvent.find({ time: { $gte: Date.now() }}, function (err, docs) {
			if (err) res.send(500, err);
			res.send(200, docs);
		});
	});
	// REST routes
	app.get('/api/events/:id', function (req, res) {
		var id = req.params.id;
		db.NewsEvent.findById({ _id: id }, function (err, ev) {
			if (err) res.send(500, err);
			res.send(200, ev);
		});
	});
	app.post('/api/events', function (req, res) {
		var ev = new db.NewsEvent(req.body);
		ev.save(function (err) {
			if (err) res.send(500, err);
			res.send(200);
		});
	});
	app.put('/api/events/:id', function (req, res) {
		var id = req.params.id;
		db.NewsEvent.update({ _id: id }, req.body, {}, function (err) {
			if (err) res.send(500, err);
			res.send(200);
		});
	})
};