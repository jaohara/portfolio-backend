const c   = require("chalk");
const db  = require('../../database');

// express-validation stuff
const { body, validationResult } = require('express-validator');
const { query } = require("../../database");

// Enable Debug
const DEBUG = true;


/*
  =========================
  ==== api_handlers.js ====
  =========================

  This file defines how API routes translate into database calls.

  Contents:

    1. Helper Functions 
      - Generic helpful functions
    2. Query Creation Functions
      - Building block functions that return SQL queries as strings based on 
        provided arguments
    3. Params Check Functions
      - Type checking functions - not heavily used
    4. API Handlers
      - The function endpoints for various APi routes:
      1. Creation Queries
      2. Deletion Queries
      3. Update Queries
    
  API handler functions should follow this table order:

    - Category
    - Technology
    - Page
    - Project
    - ProjectTechnology
    - Post

*/

// ======================
//    HELPER FUNCTIONS
// ======================

/*
  generic handler that accepts a response object, the query to be ran, and any
  potential errors from express-validator.

  TODO: THIS SHOULD TOTALLY NOT BE EXPORTED. FIX THIS AFTER YOU'VE TIDIED UP THE
  DEMO ROUTES THAT RELY ON THIS.
*/
async function queryDb (res, query, errors = undefined) {
  // I think I wrote this first part to handle errors found via express-validator
  if (typeof errors !== 'undefined' && !errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (DEBUG) console.log(`Running Database Query: '${c.blue.bold(query)}'...`);

  try {
    const results = await db.promise().query(query);
    res.send(results[0]);
    //if (DEBUG) console.log(`Query results: ${results}`);
  } 
  catch (error) {
    if (DEBUG) console.log(error);
    /* 
      TODO: I'm pretty sure this is the most appropriate http status code
      to return, but I might need to double check.
    */
    return res.status(400).send(error);
  } 
}

// creates a new object with the properties of an existing object, conditionally
// adding a key/value pair
const addIfDefined = (obj, key, value) => {
  let newObj = {};

  if (typeof value !== "undefined") {
    newObj[key] = value;
  }

  return {...obj, ...newObj};
};

// Creates a new object with all of the properties of an existing object, strips
//  undefined properties, and returns that stripped copy.
const stripUndefinedProperties = (obj) => {
  let newObj = {...obj};

  Object.keys(newObj).forEach(key => {
    if (typeof newObj[key] === "undefined") {
      delete newObj[key];
    }
  });

  return newObj;
};
// There's a lot of code reuse between these two... hmm...

// Creates a new object with all of hte properties of an existing object, strips 
//  properties that are empty strings, and returns that stripped copy.
const stripEmptyStringProperties = (obj) => {
  let newObj = {...obj};

  Object.keys(newObj).forEach(key => {
    if (typeof newObj[key] === "string" && newObj[key].length === 0){
      delete newObj[key];
    }
  });

  return newObj;
};

const fullyStripProperties = (obj) => stripUndefinedProperties(stripEmptyStringProperties(obj));

// check if a variable is a string and enclose it in single or double quotes if so
const quoteString = (input) => typeof input === "string" ? `'${input}'` : input;
const dubQuoteString = (input) => quoteString(input).replaceAll("'", '"');

// create slugs/page urls from ugly strings
const createSafeURLString = (input) => 
  input.toLowerCase().replaceAll(" ", "-").replace(/[^a-zA-Z0-9-_]/g, '');

// escape single quotes for mysql insertion
const escapeSingleQuotes = 
  (input) => typeof input === "string" ? input.replaceAll("'", "''") : input;
const esq = (input) => escapeSingleQuotes(input);

// combines escapeSingleQuotes and quoteString
const prepString = (input) => quoteString(escapeSingleQuotes(input));

// converts input to a boolean, counting "false" as a false-y value
const parseBoolean = (input) => 
  typeof input === "string" && input.toLowerCase() === "false" ? false : Boolean(input);

// uses parseBoolean but doesn't count undefined and empty strings as a false-y value
const parseBooleanIfDefined = (input) =>
  typeof input !== "undefined" && input !== "" ? parseBoolean(input) : undefined;

//  =========================================
//  ======== QUERY CREATION FUNCTIONS =======
//  =========================================

// create and return a "SELECT *" query on a specific table
const selectAllQuery = (table) => `SELECT * FROM ${table}`;

// TODO: rewrite this to use a key/value pair and JS object as second param
// create and return a "SELECT WHERE" query on a specific table, looking
//  for a specific column value.
const selectQuery = (table, whereColumn, whereValue) => {
  let query = 
    `SELECT * FROM ${table} WHERE ${whereColumn}=${prepString(whereValue)}`;


  return query;
};

// create and return an "INSERT INTO" query from a string table name and 
//  an object with key-value pairs relating to columns-values
const insertQuery = (table, data) => 
  `INSERT INTO ${table} (${Object.keys(data)}) ` + 
  `VALUES (${Object.values(data).map(val => prepString(val))})`;

const insertIgnoreQuery = (table, data) => 
  `INSERT IGNORE ${insertQuery(table, data).substr(7)}`;

// create and return a "DELETE" query on a specific table.
//
//  "data" represents a JS object mapping columns to values for your delete query;
//  only one key/value pair is needed if that column is unique, but some queries 
//  (removing many-to-many entries, for example) require a match on multiple columns.
const deleteQuery = (table, data) => {
  // this whole implementation could probably use a pass to make it more clever
  let columns = Object.keys(data);
  let values  = Object.values(data);

  let query = `DELETE FROM ${table} WHERE `;

  for (let i = 0; i < columns.length; i++) {
    query += `${columns[i]}=${prepString(values[i])}`;
    query += i !== columns.length - 1 ? " AND " : ""; 
  }
  
  return query;
};


// create and return an "UPDATE" query on a specific table
//
//  "data" represents a JS object mapping columns to values that are to be updated.
//  "table" is the name of the table to update.
//  "key" is a JS object with a single key/value mapping corresponding to the table's
//    primary key and a specific value for the primary key to identify the entry.
const updateQuery = (table, key, data) =>  
  `UPDATE ${table} ` +
  `SET ${Object.entries(data).map((item) => `${item[0]}=${prepString(item[1])}`)} ` + 
  `WHERE ${key.key}=${prepString(key.value)}`;

// create and return an "UPDATE" query on a specific table using multiple keys.
//
//  same args as above, but "keys" is an array of those key objects.
//
//  TODO: Make this the default implementation?
const updateQueryMultipleKeys = (table, keys, data) => {
  let query = `UPDATE ${table} ` +
    `SET ${Object.entries(data).map((item) => `${item[0]}=${prepString(item[1])}`)} WHERE `; 

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    query += `${key.key}=${prepString(key.value)}${i !== keys.length - 1 ? "," : ""}`;
  }

  return query;
};


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

// THIS SHOULD ALSO PROBABLY NOT BE EXPORTED, BUT IT ISN'T AS MUCH OF A VULNERABILITY
// AS `queryDb` IS. USED IN SOME DEMO ROUTE HANDLERS.
const numberCheck = (number) => typeof number === 'number' && !isNaN(number);


// ==================
//    API HANDLERS
// ==================

// get all visible (non-hidden) Pages as JSON
const getAllVisiblePages = 
  async (req, res) => queryDb(res, selectQuery('Page', 'hidden', false));

const getAllHiddenPages = 
  async (req, res) => queryDb(res, selectQuery('Page', 'hidden', true));

const getAllPages = 
  async (req, res) => queryDb(res, selectAllQuery('Page'));

// get a specific Page
const getPage = 
  async (req, res) => queryDb(res, selectQuery('Page', 'name', req.params.page));

const getImage = 
  async (req, res) => queryDb(res, selectQuery('Image', 'id', req.params.id));

const getAllImages = 
  async (req, res) => queryDb(res, selectAllQuery('Image'));

// get all Posts
const getAllPosts = 
  async (req, res) => queryDb(res, selectAllQuery('Post'));

// get all visible Posts
const getAllVisiblePosts = 
  async (req, res) => queryDb(res, selectQuery('Post', 'hidden', false));

// get a specific Post by id
const getPostById = 
  async (req, res) => queryDb(res, selectQuery('Post', 'id', req.params.id));

// get a specific Post by slug
const getPostBySlug = 
  async (req, res) => queryDb(res, selectQuery('Post', 'slug', req.params.slug));

// get all visible Projects (non-scrap)
//  I kinda hate this name? It's a homonym for "awful"?
const getAllFullProjects = 
  async (req, res) => queryDb(res, selectQuery('Project', 'is_scrap', 0));

// get all visible Scrap Projects
const getAllScraps = 
  async (req, res) => queryDb(res, selectQuery('Project', 'is_scrap', 1));

// get all Projects, scrap and non-scrap
const getAllProjects = 
  async (req, res) => queryDb(res, selectAllQuery('Project'));

// get a specific Project
const getProject = 
  async (req, res) => queryDb(res, selectQuery('Project', 'id', req.params.id));

// get all Categories
const getAllCategories = 
  async (req, res) => queryDb(res, selectAllQuery('Category'));

// get all Technologies
const getAllTechnologies = 
  async (req, res) => queryDb(res, selectAllQuery('Technology'));

// get all ProjectTechnologies associated with a particular Project ID
const getAllProjectTechnologies = async (req, res) => 
  getProjectTechnologies(req, res, undefined);

const getAllPostCategories = async (req, res) => 
  getPostCategories(req, res, undefined);

const getAllProjectImages = async (req, res) =>
  getProjectImages(req, res, undefined);
  
const getAllPostImages = async (req, res) =>
  getPostImages(req, res, undefined);

// get all ProjectTechnologies
const getProjectTechnologies = async (req, res, projectId = undefined) => {
  // is there a way to break this down into discrete functions?
  // let query = `
  //   SELECT Project.id, Technology.name FROM Project 
  //     JOIN ProjectTechnology 
  //     ON Project.id = ProjectTechnology.project_id 
  //     JOIN Technology 
  //     ON ProjectTechnology.technology_name = Technology.name`;

  // console.log(`req.params.id: ${req.params.id}`)

  // query += req.params.id !== undefined ? 
  //   ` WHERE ProjectTechnology.project_id = '${req.params.id}'` : "";

  // return queryDb(res, query);
  return getModelTags(req, res, projectId, "Project", "Technology");
};

const getPostCategories = async (req, res, postId = undefined) => {
  // let query = `
  //   SELECT Post.id, Category.name FROM Post
  //     JOIN PostCategory
  //     ON Post.id = PostCategory.post_id
  //     JOIN Category
  //     ON PostCategory.category_name = Category.name`;

  // query += req.params.id !== undefined ? 
  //   ` WHERE PostCategory.post_id = '${req.params.id}'` : "";
  
  // return queryDb(res, query);
  return getModelTags(req, res, postId, "Post", "Category");
};

// Generic query for tags associated with a given model
const getModelTags = async (req, res, postId = undefined, model, tag) => {
  if ((model === "Post" || model === "Project") && tag === "Technology" || tag === "Category") {
    let query = `
      SELECT ${model}.id, ${tag}.name FROM ${model}
        JOIN ${model}${tag}
        ON ${model}.id = ${model}${tag}.${model.toLowerCase()}_id
        JOIN ${tag}
        ON ${model}${tag}.${tag.toLowerCase()}_name = ${tag}.name`;

    query += req.params.id !== undefined ? 
      ` WHERE ${model}${tag}.${model.toLowerCase()}_id = '${req.params.id}'` : "";

    return queryDb(res, query);
  }
}

const getProjectImages = async (req, res, projectId = undefined) => {
  // let query = `
  //   SELECT Project.id, Image.created, Image.description, Image.static_url FROM Project
  //     JOIN ProjectImage
  //     ON Project.id = ProjectImage.project_id
  //     JOIN Image
  //     ON ProjectImage.image_id = Image.id`;

  // query += req.params.id !== undefined ? 
  //   ` WHERE ProjectImage.project_id = '${req.params.id}'` : "";

  // return queryDb(res, query);
  return getModelImages(req, res, projectId, "Project");
};

const getPostImages = async (req, res, postId = undefined) => {
  // let query = `
  //   SELECT Post.id, Image.created, Image.description
  // `;

  // query += req.params.id !== undefined ? 
  //   ` WHERE PostImage.post_id = '${req.params.id}'` : "";

  // return queryDb(res, query);
  return getModelImages(req, res, postId, "Post");
};

// Generic query for getting images associated with a specific model
const getModelImages = async (req, res, postId = undefined, model) => {
  if (model === "Post" || model === "Project") {
    let query = `
      SELECT ${model}.id, Image.created, Image.description, Image.static_url FROM ${model}
        JOIN ${model}Image
        ON ${model}.id = ${model}Image.${model.toLowerCase()}_id
        JOIN Image
        ON ${model}Image.image_id = Image.id`;
    
    query += req.params.id !== undefined ?
     ` WHERE ${model}Image.${model.toLowerCase()}_id = '${req.params.id}'` : "";
  
    return queryDb(res, query);
  }
}

/*
  Table Order:
    - Category
    - Technology
    - Page
    - Image
    - Project
    - ProjectTechnology
    - ProjectImage
    - Post
    - PostCategory
    - PostImage
*/


//  =====================
//    CREATION QUERIES
//  =====================
const createCategory = async (req, res) => {
  /*
    Should I do anything special to account createSafeString for these values being inserted via SQL?
    Escape apostrophes, spaces, etc?

    Also, how do I modify my table schema to make it case-sensitive?
  */

  // TODO: should I filter the input rather than directly grabbing the name from the post body?
  return queryDb(res, insertQuery("Category", {"name": req.body.name}));
};

const createTechnology = async (req, res) => {
  /*
    This will take in an name and optionally a color. 

    What happens if I do a create request for something that already exists?

    This seems to give a MySQL 1062 error. 
    If I can catch this error here, I can check if (err.errno === 1062). 
      - Based on examples I've seen, this seems to be the way to go about 
      doing this.

    ALSO MAKE SURE TO MAKE THIS ENTRY/FIELD UPPERCASE? 
  */

  let techData = {
    color: req.body.color,
    //icon: req.body.icon,
    name: req.body.name,
  };

  techData = stripUndefinedProperties(techData);

  return queryDb(res, insertQuery("Technology", techData));
};

const createPage = async (req, res) => {
  /*
    Just writing out my train of thought here - in the context of a Page, "name" is the 
    string that is used to both form the URL and serve as the primary key in the database.

    We're going to take what the user enters as a name and use that for "pretty_name", which
    is what is displayed in the body of the page (including whitespace, symbol chars, etc).

    "pretty_name" will be used to derive a url-safe version for "name".
  */
  let pageData = {
    name: createSafeURLString(req.body.name),
    pretty_name: req.body.name,
    hidden: parseBoolean(req.body.hidden),
    body: req.body.body,
  };

  return queryDb(res, insertQuery("Page", pageData));
};


// TODO: TEST THIS ROUTE HANDLER
const createImage = async (req, res) => {
  let imageData = {
    description: req.body.description,
    name: req.body.name,
    static_url: req.body.static_url,
  };

  return queryDb(res, insertQuery("Image", imageData));
};

const createProject = async (req, res) => {
  let projectData = {
    deployed_url: req.body.deployed_url,
    description: req.body.description,
    github_url: req.body.github_url,
    is_scrap: parseBoolean(req.body.is_scrap),
    // TODO: update to include image stuff when it's created
    //image_id
    //image_url
    published: parseBoolean(req.body.published),
    title: req.body.title,
  };

  return queryDb(res, insertQuery("Project", projectData));
}

const createProjectTechnology = async (req, res) => {
  let projectTechnologyData = {
    project_id: req.body.project_id,
    technology_name: req.body.technology_name
  };

  // Note the query combination - we're using insert ignore to make sure the 
  // technology exists while suppressing the error, then adding the technology 
  // after we're sure it exists.

  let query = insertIgnoreQuery("Technology", {name: req.body.technology_name}) + "; " +
    insertQuery("ProjectTechnology", projectTechnologyData);

  // return queryDb(res, insertQuery("ProjectTechnology", projectTechnologyData));
  return queryDb(res, query);
}

// TODO: TEST THIS ROUTE
const createProjectImage = async (req, res) => {
  let projectImageData = {
    project_id: req.body.project_id,
    image_id: req.body.image_id,
  };

  return queryDb(res, insertQuery("ProjectImage", projectImageData));
}

const createPost = async(req, res) => {
  let postData = {
    title: req.body.title,
    hidden: parseBoolean(req.body.hidden),
    body: req.body.body,
    slug: createSafeURLString(req.body.title),
  };

  return queryDb(res, insertQuery("Post", postData));
};

const createPostCategory = async (req, res) => {
  let postCategoryData = {
    post_id: req.body.post_id,
    category_name: req.body.category_name,
  };

  let query = insertIgnoreQuery("Category", {name: req.body.category_name}) + "; " +
    insertQuery("PostCategory", postCategoryData);

  return queryDb(res, query);
};

// TODO: Test this query
const createPostImage = async (req, res) => {
  let postImageData = {
    post_id: req.body.post_id,
    image_id: req.body.image_id,
  };

  return queryDb(res, insertQuery("PostImage", postImageData));
}

// Batch Creation Queries

/*
  Hmmm... what if I just refactor this to be the default way? 

  You take a comma-separated string (or maybe something more unique?) and split 
*/
const batchCreateProjectTechnology = async (req, res) => 
  batchCreateModelTags(req, res, req.body.technologies, "Technology", "ProjectTechnology");

const batchCreatePostCategory = async (req, res) => 
  batchCreateModelTags(req, res, req.body.categories, "Category", "PostCategory");

const batchCreateModelTags = async (req, res, dataString, mainTable, joinTable) => {
  let dataArray = dataString.split(",");
  let query     = "";

  dataArray.forEach(data => {
    // this replace should fix the empty category problem
    if (data.replace(/\s/g, '').length !== 0) {
      query += insertIgnoreQuery(mainTable, {name: data}) + ";" +
        insertIgnoreQuery(joinTable, stripUndefinedProperties({
          category_name: mainTable === "Category" ? data : undefined,
          post_id: req.body.post_id,
          project_id: req.body.project_id,
          technology_name: mainTable === "Technology" ? data : undefined,
        })) + ";";
    }
  });

  return queryDb(res, query)
};


//  =====================
//    DELETION QUERIES
//  =====================
// TODO: Test these and remove comments upon completion
const deleteCategory = async (req, res) => 
  queryDb(res, deleteQuery("Category", { name: req.body.name }));

const deleteTechnology = async (req, res) =>
  queryDb(res, deleteQuery("Technology", { name: req.body.name }));

const deletePage = async (req, res) =>
  queryDb(res, deleteQuery("Page", { name: req.body.name }));

// TODO: TEST THIS ROUTE HANDLER
const deleteImage = async (req, res) =>
  queryDb(res, deleteQuery("Image", { id: req.body.id }));

const deleteProjectById = async (req, res) =>
  queryDb(res, deleteQuery("Project", { id: req.body.id }));

const deleteProjectTechnology = async (req, res) =>
  queryDb(res, deleteQuery("ProjectTechnology", {
    project_id: req.body.project_id, technology_name: req.body.technology_name }));

// TODO: TEST THIS ROUTE HANDLER
const deleteProjectImage = async (req, res) => 
  queryDb(res, deleteQuery("ProjectImage", {
    project_id: req.body.project_id, image_id: req.body.image_id }));

const deletePostById = async (req, res) =>
  queryDb(res, deleteQuery("Post", { id: req.body.id }));

const deletePostCategory = async (req, res) =>
  queryDb(res, deleteQuery("PostCategory", {
    post_id: req.body.post_id, category_name: req.body.category_name }));

// TODO: TEST THIS ROUTE HANDLER
const deletePostImage = async (req, res) => 
  queryDb(res, deleteQuery("PostImage", {
    post_id: req.body.post_ID, image_id: req.body.image_id }));

//  ==================
//    UPDATE QUERIES
//  ==================

// TODO: 
//  - These should send a 404 or something if the supplied key doesn't exist.
//  - These should send the same error if the update data object is empty

const updateCategory = async (req, res) => {
  let categoryData = {
    name: req.body.name,
  };

  let key = {
    key: "name",
    value: req.body.primary_key,
  };

  return queryDb(res, updateQuery("Category", key, categoryData));
  // res.send(updateQuery("Category", key, categoryData));
};

const updateTechnology = async (req, res) => {
  let technologyData = {
    name: req.body.name,
    color: req.body.color,
  };

  let key = {
    key: "name",
    value: req.body.primary_key,
  };

  return queryDb(res, updateQuery("Technology", key, stripUndefinedProperties(technologyData)));
  // res.send(updateQuery("Technology", key, stripUndefinedProperties(technologyData)));
};

const updatePage = async (req, res) => {
  let pageData = {
    body: req.body.body,
    hidden: parseBooleanIfDefined(req.body.hidden),
    name: createSafeURLString(req.body.name),
    pretty_name: req.body.name,
  };

  let key = {
    key: "name",
    value: req.body.primary_key,
  };

  return queryDb(res, updateQuery("Page", key, fullyStripProperties(pageData)));
  // res.send(updateQuery("Page", key, stripUndefinedProperties(stripEmptyStringProperties(pageData))));
};

// TODO: TEST THIS ROUTE HANDLER
const updateImage = async (req, res) => {
  let imageData = {
    name: req.body.name,
    description: req.body.descrioption,
    static_url: req.body.static_url,
  };

  let key = {
    key: "id",
    value: parseInt(req.body.primary_key),
  }

  return queryDb(res, updateQuery("Image", key, fullyStripProperties(imageData)));
};

const updateProject = async (req, res) => {
  let projectData = {
    title: req.body.title,
    is_scrap: parseBooleanIfDefined(req.body.is_scrap),
    deployed_url: req.body.deployed_url,
    github_url: req.body.github_url,
    description: req.body.description,
  };

  let key = {
    key: "id",
    value: parseInt(req.body.primary_key),
  };

  return queryDb(res, updateQuery("Project", key, fullyStripProperties(projectData)));
};

/*
  Does it make sense to have this method?

  Would there ever be a case where you are updating a ProjectTechnology? Wouldn't
  You just delete it and create a different one?
*/
const updateProjectTechnology = async (req, res) => {
  /*
    TODO: So, based on my thinking above, I don't think that I actually need this
    method. 

    That being said, it is a complete example of what I wanted to do with multiple
    primary keys being gathered as an array of objects rather than a single object.
    It currently returns the generated query without running it.
  */
 
  let projectTechnologyData = {
    project_id: parseInt(req.body.project_id),
    technology_name: req.body.technology_name,
  }

  let keys = [
    {
      key: "project_id",
      value: parseInt(req.body.project_primary_key),
    },
    {
      key: "technology_name",
      value: req.body.technology_primary_key,
    }
  ];
  
  res.send(updateQueryMultipleKeys("ProjectTechnology", keys, projectTechnologyData));
};

const updatePost = async (req, res) => {
  let postData = {
    title: req.body.title,
    hidden: parseBooleanIfDefined(req.body.hidden),
    body: req.body.body,
  };

  let key = {
    key: "id",
    value: parseInt(req.body.primary_key),
  };

  return queryDb(res, updateQuery("Post", key, fullyStripProperties(postData)));
};

// exports 
module.exports.queryDb                      = queryDb;
module.exports.numberCheck                  = numberCheck;
module.exports.getAllImages                 = getAllImages;
module.exports.getImage                     = getImage;
module.exports.getAllPages                  = getAllPages;
module.exports.getAllVisiblePages           = getAllVisiblePages;
module.exports.getAllHiddenPages            = getAllHiddenPages;
module.exports.getPage                      = getPage;
module.exports.getAllPosts                  = getAllPosts;
module.exports.getAllVisiblePosts           = getAllVisiblePosts;
module.exports.getPostById                  = getPostById;
module.exports.getPostBySlug                = getPostBySlug;
module.exports.getAllFullProjects           = getAllFullProjects;
module.exports.getAllScraps                 = getAllScraps;
module.exports.getAllProjects               = getAllProjects;
module.exports.getProject                   = getProject;
module.exports.getAllCategories             = getAllCategories;
module.exports.getAllTechnologies           = getAllTechnologies;
module.exports.getProjectTechnologies       = getProjectTechnologies;
module.exports.getPostCategories            = getPostCategories;
module.exports.getAllPostCategories         = getAllPostCategories;
module.exports.getAllProjectTechnologies    = getAllProjectTechnologies;
module.exports.getAllProjectImages          = getAllProjectImages;
module.exports.getAllPostImages             = getAllPostImages;
module.exports.getProjectImages             = getProjectImages;
module.exports.getPostImages                = getPostImages;


// exports for functions currently in development
module.exports.createCategory               = createCategory;
module.exports.createTechnology             = createTechnology;
module.exports.createPage                   = createPage;
module.exports.createImage                  = createImage;
module.exports.createProject                = createProject;
module.exports.createProjectTechnology      = createProjectTechnology;
module.exports.createProjectImage           = createProjectImage;
module.exports.batchCreateProjectTechnology = batchCreateProjectTechnology;
module.exports.createPost                   = createPost;
module.exports.createPostCategory           = createPostCategory;
module.exports.createPostImage              = createPostImage;
module.exports.batchCreatePostCategory      = batchCreatePostCategory;
module.exports.deleteCategory               = deleteCategory;
module.exports.deleteTechnology             = deleteTechnology;
module.exports.deletePage                   = deletePage;
module.exports.deleteImage                  = deleteImage;
module.exports.deleteProjectById            = deleteProjectById;
module.exports.deleteProjectTechnology      = deleteProjectTechnology;
module.exports.deleteProjectImage           = deleteProjectImage;
module.exports.deletePostById               = deletePostById;
module.exports.deletePostCategory           = deletePostCategory;
module.exports.deletePostImage              = deletePostImage;
module.exports.updateCategory               = updateCategory;
module.exports.updateTechnology             = updateTechnology;
module.exports.updatePage                   = updatePage;
module.exports.updateImage                  = updateImage;
module.exports.updateProject                = updateProject;
module.exports.updateProjectTechnology      = updateProjectTechnology;
module.exports.updatePost                   = updatePost;
