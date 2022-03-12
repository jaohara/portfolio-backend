const createError = require('http-errors');

/*
  I don't know if I'm using these how I want to be. I should look
  into this.
*/

errorHandlers = {
  handle404: (req, res, next) => {
    // I don't know if I understand where 'createError' is coming from
    next(createError(404));
  },
  error: (err, req, res, next) => {
    /*
      Most of this is from the boilerplate code in the express generator
      tool. I don't know if I need the locals if I'm not using a template 
      engine? I have to look into this.
    */
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err: {};

    // slightly modified
    res.status(err.status || 500);
    res.send(`Error: ${err.status} - ${err.message}`);
  }
}

module.exports = errorHandlers;