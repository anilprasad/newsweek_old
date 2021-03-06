'use strict';

var s = require('node-schedule'),
		db = require('../../db/db'),
    OA = require('../oanda/client'),
    util = require('util'),
    async = require('async'),
    precision = 5;

module.exports = Trader;

function Trader(tradeGroupModel, cb) {
  this.trade = tradeGroupModel;
  async.series([
      this._createClient.bind(null, this),
      this._loadStrategy.bind(null, this),
      this._schedule.bind(null, this)
  ], cb);
}

Trader.prototype._createClient = function (self, next) {
  var query = {
    _id: self.trade.user
  };
  db.User.findOne(query, function (err, user) {
    if (err) {
      return next(err);
    }
    self.user = user;
    self.client = new OA(user.token, self.trade.account);
    return next();
  });
};

Trader.prototype._loadStrategy = function (self, next) {
  // For now, load the default strategy
  var query = {
    name: 'default'
  };
  db.Strategy.findOne(query, function (err, strategy) {
    if (err) {
      return next(err);
    }
    self.strategy = strategy;
    return next();
  });
};

Trader.prototype._schedule = function (self, next) {
  var query = {
    _id: self.trade.event
  };
  db.NewsEvent.findOne(query, function (err, event) {
    if (err) {
      return next(err);
    }
    self.trade.time = event.time - self.strategy.timeBefore;
    self.trade.save(function (err) {
      if (err) {
        return next(err);
      }
      s.scheduleJob(self.trade.time, self.execute.bind(null, self));
      logger.debug('Scheduled trade', self.trade.id, 'at',
          util.inspect(self.trade.time));
      return next();
    });
  });
};

Trader.prototype.execute = function (self) {

  async.series([
      _getPrices,
      _placeTopOrder,
      _placeBottomOrder
  ], function (err) {
    logger.debug('Finished executing trade', self.trade.id);
    if (err) {
      logger.error(util.inspect(err));
    }
    self.completed = true;
  });

  function _getPrices(next) {
    // Get the current instrument price
    var params = {
      instruments: [self.trade.instrument]
    };
    self.client.getPrices(params, function (err, res) {
      self.ask = res.prices[0].ask;
      logger.debug('Current ask price of', self.trade.instrument, 'is', self.ask);
      next();
    });
  }

  function _placeBottomOrder(next) {
    logger.debug('Bottom order will be placed at', self._bottomOrder().price);
    self.client.openTrade(self._bottomOrder(), function (err, data) {
      if (err) {
        return next(new Error('Error opening top order:' + err));
      } else {
        logger.debug('Opened bottom order', data);
        return next();
      }
    });
  }

  function _placeTopOrder(next) {
    logger.debug('Top order will be placed at', self._topOrder().price);
    self.client.openTrade(self._topOrder(), function (err, data) {
      if (err) {
        return next(new Error('Error opening top order:' + err));
      } else {
        logger.debug('Opened top order', data);
        return next();
      }
    });
  }

};

Trader.prototype._topOrder = function () {
  var straddle = this.strategy.straddle / 10000,
      stopLoss = this.strategy.stopLoss / 10000,
      takeProfit = this.strategy.takeProfit / 10000;
  return {
    price: parseFloat((this.ask + straddle).toFixed(precision)),
    instrument: this.trade.instrument,
    side: 'buy',
    type: 'limit',
    stopLoss: parseFloat((this.ask + straddle - stopLoss).toFixed(precision)),
    takeProfit: parseFloat((this.ask + straddle + takeProfit).toFixed(precision)),
    trailingStop: this.strategy.trailingStop,
    expiry: parseInt(((new Date().getTime() + 60 * 60) / 1000).toFixed()),
    units: this.trade.units
  };
};

Trader.prototype._bottomOrder = function () {
  var straddle = this.strategy.straddle / 10000,
      stopLoss = this.strategy.stopLoss / 10000,
      takeProfit = this.strategy.takeProfit / 10000;
  return {
    price: parseFloat((this.ask - straddle).toFixed(precision)),
    instrument: this.trade.instrument,
    side: 'sell',
    type: 'limit',
    stopLoss: parseFloat((this.ask - straddle + stopLoss).toFixed(precision)),
    takeProfit: parseFloat((this.ask - straddle - takeProfit).toFixed(precision)),
    trailingStop: this.strategy.trailingStop,
    expiry: parseInt(((new Date().getTime() + 60 * 60) / 1000).toFixed()),
    units: this.trade.units
  };
};
