'use strict';
var db = require('../db/db'),
    trader = require('../modules/trader/trader');

module.exports = function (app) {

  // GET /api/trades/latest -- Trades not yet triggered
  app.get('/api/trades/latest', function (req, res) {
    db.TradeGroup.find({ time: { $gte: Date.now() }})
      .populate('event')
      .exec(function (err, docs) {
        if (err) {
          return res.status(500).send(err);
        }
        return res.status(200).send(docs);
      });
  });

  // GET /api/trades -- All trades for user
  app.get('/api/trades', function (req, res) {
    db.TradeGroup.find({})
      .populate('event')
      .exec(function (err, docs) {
        if (err) {
          return res.status(500).send(err);
        }
         return res.status(200).send(docs);
      });
  });

  // POST /api/trades -- Creates a trade
  app.post('/api/trades', function (req, res) {
    trader.new(req.body, function (err, tradeGroup) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      return res.status(200).send(tradeGroup);
    });
  });

  // REST routes
  app.get('/api/trades/:id', function (req, res) {
    db.TradeGroup.findById(req.params.id)
      .populate('event')
      .exec(function (err, docs) {
        if (err) {
          return res.status(500).send(err);
        }
        return res.status(200).send(docs);
      });
  });

  app.put('/api/trades/:id', function (req, res) {
    var up = req.body;
    if (up._id) {
      delete up._id;
    }
    if (up.event) {
      delete up.event;
    }
    db.TradeGroup.update({ _id: req.params.id }, up)
      .exec(function (err, trade) {
        if (err) {
          return res.status(500).send(err);
        }
        return res.status(200).send(trade);
      });
  });

  app.delete('/api/trades/:id', function (req, res) {
    db.TradeGroup.remove({ _id: req.params.id })
      .exec(function (err, trade) {
        if (err) {
          return res.status(500).send(err);
        }
        return res.status(200).send(trade);
      });
  });
};
