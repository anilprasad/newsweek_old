var news = require('./ffnews'),
    fs = require('fs');

news.getNews(function (err, news) {
  if (err) console.log(err);
  fs.writeFile('test/integration/sampledata', JSON.stringify(news), function (err) {
  	if (err) throw err;
  });
});
