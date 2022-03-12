const cookieParser    = require('cookie-parser');
const cors            = require('cors');
const credentials     = require('./.credentials');
const express         = require('express');
const logger          = require('morgan');
const path            = require('path');


// router definitionsapi
const apiRouter       = require('./routes/api');
const indexRouter     = require('./routes/index');

const errorHandlers   = require('./routes/errors');

const app = express();

// middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(credentials.cookieSecret));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());


// set routes
app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use(errorHandlers.handle404);
app.use(errorHandlers.error);

// catch 404 and forward to error handler
/*
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // send the error response
  res.status(err.status || 500);
  res.send(`Error: ${err.status}`);
});
*/


module.exports = app;
