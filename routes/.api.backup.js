const app     = require('express');
const c       = require('chalk');
const db      = require('../database');
const router  = app.Router();

// express-validation stuff
const { body, validationResult } = require('express-validator');

// ======================
//    HELPER FUNCTIONS
// ======================

/*
  generic handler that accepts a response object, the query to be ran, and any
  potential errors from express-validator.
*/
async function queryHandler(res, query, errors = undefined) {
  if (typeof errors !== 'undefined' && !errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  console.log(`Running Database Query: '${c.blue.bold(query)}'...`);

  const results = await db.promise().query(query);

  res.send(results[0]);
}

const selectAll = (table) => `SELECT * FROM ${table}`;

const select = (table, whereColumn, whereValue) => {
  let query = `SELECT * FROM ${table} WHERE ${whereColumn}=`;
  query += typeof whereValue === 'string' ? `'${whereValue}'` : whereValue;

  return query;
}


/*
  ==============================
  PARAMS CHECK FUNCTIONS
  ==============================

  I want to make a few more of these and use them in my GET requests to check 
  the values that are passed into `req.params`. What's the best approach here?
  Should I have them take a value in and return a sanitized version of it,
  or should I have them work like numberCheck and simply return a boolean 
  of whether or not the param is in the proper format?
*/
const numberCheck = (number) => typeof number === 'number' && !isNaN(number);


// ================
//    API ROUTES
// ================

/*
  These routes are primarily concerned with getting and displaying data. The 
  routes to actually create and delete pages will come later.

  I don't think the GET requests need to really worry too much about input 
  validation. Is it possible to pass something malicious via the url params?
    - Alternate approach - I could make individual functions to handle and
    sanitize each of the params based on type 
*/

// Get all visible Pages
router.get('/pages/all', async (req, res, next) => {
  const query = `SELECT * FROM Page WHERE hidden=false`;
  queryHandler(res, query);
})

// Get a specific Page
router.get('/pages/:page', async (req, res, next) => {
  const query = `SELECT * FROM Page WHERE name='${req.params.page}'`;
  queryHandler(res, query);
});

// Get all visible Posts
router.get('/posts/all', async (req, res, next) => {
  const query = `SELECT * FROM Post WHERE hidden=false`;
  queryHandler(res, query);
});


// Get a specific Post by ID
router.get('/posts/id/:post-id', async (req, res, next) => {
  const query = `SELECT * FROM Post WHERE id=${req.params.post-id}`;
  queryHandler(res, query);
});

// Get a specific Post by slug
router.get('/posts/slug/:slug', async (req, res, next) => {
  const query = `SELECT * FROM Post WHERE slug='${req.params.slug}'`;
  queryHandler(res, query);
});

// Get all visible Projects (non-scrap)
router.get('/projects/non-scrap', async (req, res, next) => {
  const query = `SELECT * FROM Project WHERE is_scrap=0`;
  queryHandler(res, query);
});


// Get all visible Scrap Projects
router.get('/projects/scrap', async (req, res, next) => {
  const query = `SELECT * FROM Project WHERE is_scrap=1`;
  queryHandler(res, query);
});

// Get ALL Projects, scrap and non-scrap
// CURRENTLY REWRITTEN TO TEST NEW HELPER FUNCTIONS
router.get('/projects/all', async (req, res, next) => {
  //const query = `SELECT * FROM Project`;
  //queryHandler(res, query);
  queryHandler(res, getAll('Project'));
});

// Get a Specific Project
// CURRENTLY REWRITTEN TO TEST NEW HELPER FUNCTIONS
router.get('/projects/:id', async (req, res, next) => {
  //const query = `SELECT * FROM Project WHERE project_id=${req.params.id}`;
  //queryHandler(res, query);
  queryHandler(res, select('Project', 'project_id', req.params.id));
});


// Get all Categories
router.get('/projects/:id', async (req, res, next) => {
  queryHandler(res, getAll('Category'));
});


// =================
//    DEMO ROUTES   
// =================

/*
  This looks to be the basis for the rest of the database queries. 

  I suppose I'll need to just limit the parameters of the other queries by what changes - 
  which id I'm looking for to delete something, which first_name and last_name I'm adding, 
  etc. The actual query will be built here, server-side, and I won't need to reveal any 
  of the database implementation to the client.

  Also chalk fucking rules
*/
router.post('/demo/query', async (req, res, next) => {
  if (req.body.query) {
    const query = req.body.query;

    console.log(`Querying ${c.blue.bold("portfoliodb")}: '${c.green(query)}'`);
    
    queryHandler(res, query);
  }
});

/*
  Adds a new entry in the table Demo.

  Expects values for "first_name" and "last_name" in the POST body. 
*/
router.post('/demo/add',
  body('first_name').notEmpty().trim().escape(),
  body('last_name').notEmpty().trim().escape(),

  async (req, res, next) => {
    /*
      This process here will check if any of the validation steps failed. Instead of 
      the result object, it will return an object with a single property, "errors", that
      contains an array of all of the error objects.

      We can inspect these objects to know which part of the input failed, and then handle
      this appropriately in our UI. For instance, we could check each of them to test
      for "error.param", which is a property that lists the specific property on the post 
      body that was invalid. 
    */
   
    let { first_name, last_name } = req.body;
    first_name  = first_name.replace("'", "''");
    last_name   = last_name.replace("'", "''");
   
    const errors = validationResult(req);
    const query = 
      `INSERT INTO Demo (first_name, last_name) VALUES ('${first_name}', '${last_name}');`;
    
    queryHandler(res, query, errors);
  }
);

/*
  Deletes an entry in the demo table. Expects `id` in the post body as the 
  primary key in the demo table.
*/
router.post('/demo/remove',
  body('id').notEmpty().isNumeric(),

  async (req, res, next) => {
    const query = `DELETE FROM Demo WHERE id=${req.body.id}`;
    const errors = validationResult(req);

    queryHandler(res, query, errors);
  }
);

/*
  Searches for any entries that fuzzy match the search query. Looks at both
  `first_name` and `last_name` by default - this behavior can be limited by 
  specifying `column` in the post body as one of those two column names 
  as a string.
*/
router.get('/demo/search/:column/:search/:limit/:order_by/:order',
  async (req, res, next) => {

    /*
      There's a lot of reused code between this route and the one below it. Should
      I treat the "show" route as a generic version of this route, seeing as this
      does everything that the show route handler does but with a little more
      functionality? I could treat it is as if a show request is just a search
      that matches anything across all columns.
    */

    const { column, search, order_by } = req.params;
    let { limit, order } = req.params;
    limit = parseInt(limit);

    order = order === 'desc' ? 'DESC' : 'ASC';
    
    let query = `SELECT * FROM Demo WHERE `;
    query += column in ["first_name", "last_name"] ? 
      `${column} LIKE '%${search}%'` : 
      `first_name LIKE '%${search}%' OR last_name LIKE '%${search}%'`;
    query += typeof order_by !== 'undefined' && ["first_name", "last_name"].includes(order_by) ? 
    ` ORDER BY ${order_by}` : " ORDER BY id";
    query += ` ${order}`;

    query += numberCheck(limit) ? ` LIMIT ${limit};` : `;`

    queryHandler(res, query);
  }  
);

/*
  Show all of the entries in the Demo table. Entries are in ascending order
  by default, setting `desc` to any value will return entries in descending 
  order. Entry count can be limited by setting 
*/
router.get('/demo/show/:limit/:order_by/:order',
  async(req, res, next) => {
    console.log(req.params);
    let { limit, order_by, order } = req.params;
    limit = parseInt(limit);

    console.log(["first_name", "last_name"].includes(order_by))

    order = order === 'desc' ? 'DESC' : 'ASC';

    let query = `SELECT * FROM Demo`;
    
    query += typeof order_by !== 'undefined' && ["first_name", "last_name"].includes(order_by) ? 
    ` ORDER BY ${order_by}` : " ORDER BY id";
    query += ` ${order}`;
    query += numberCheck(limit) ? ` LIMIT ${limit}` : ""; 

    queryHandler(res, query);
  }
);



module.exports = router;