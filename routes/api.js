const app     = require('express');
const c       = require('chalk');
const router  = app.Router(); // do I need to do this? can I just use app.verb()?

// express-validation stuff
const { body, validationResult } = require('express-validator');

// api route handlers
const api     = require('./handlers/api_handlers');


// api route mappings
router.get('/pages/all', api.getAllPages); // what if you have a page named 'all'?
router.get('/pages/visible', api.getAllVisiblePages);
router.get('/pages/hidden', api.getAllHiddenPages);
router.get('/pages/:page', api.getPage);
router.get('/images/all', api.getAllImages);
router.get('/images/id/:id', api.getImage);
router.get('/posts/all', api.getAllPosts);
router.get('/posts/visible', api.getAllVisiblePosts);
router.get('/posts/id/:id', api.getPostById);
router.get('/posts/slug/:slug', api.getPostBySlug);
router.get('/posts/categories/id/:id', api.getPostCategories);
router.get('/posts/categories/all', api.getPostCategories);
router.get('/posts/images/all', api.getAllPostImages);
router.get('/posts/images/id/:id', api.getPostImages);
// should these be named something like '/projects/all/non-scrap'?
router.get('/projects/non-scrap', api.getAllFullProjects);
router.get('/projects/scrap', api.getAllScraps);
router.get('/projects/all', api.getAllProjects);
router.get('/projects/technologies/id/:id', api.getProjectTechnologies);
router.get('/projects/technologies/all', api.getProjectTechnologies);
router.get('/projects/id/:id', api.getProject);
router.get('/projects/images/id/:id', api.getProjectImages);
router.get('/projects/images/all', api.getAllProjectImages);
router.get('/categories/all', api.getAllCategories);
router.get('/technologies/all', api.getAllTechnologies);

// api post routes
//  TODO: these should all be protected via auth0
//  TODO: Should I use "escape()" as much as I am here? Is it going
//    To ruin the content of some fields?

// CATEGORIES
router.post('/categories/create', 
  // body('name').notEmpty().trim().escape(),
  body('name').notEmpty().trim(),
  api.createCategory
);

router.post('/categories/delete',
  // body('name').notEmpty().trim().escape(),
  body('name').notEmpty().trim(),
  api.deleteCategory
);

router.post('/categories/update',
  body('name').notEmpty().trim(),
  body('primary_key').notEmpty().trim(),
  api.updateCategory
);

// TECHNOLOGIES
router.post('/technologies/create',
  body('name').notEmpty().trim(),
  body('color').trim(),
  api.createTechnology
);

router.post('/technologies/delete',
  body('name').notEmpty().trim(),
  api.deleteTechnology
);

router.post('/technologies/update',
  body('name').trim(),
  body('color').trim(),
  api.updateTechnology
);

// PAGES
router.post('/pages/create',
  body('name').notEmpty().trim(),
  body('hidden').toBoolean(),
  body('body').trim(),
  api.createPage
);

router.post('/pages/delete',
  body('name').notEmpty().trim(),
  api.deletePage
);

router.post('/pages/update',
  body('name').trim(),
  // not checking this to prevent omitting it from defaulting to false
  //body('hidden').toBoolean(),
  body('body').trim(),
  body('primary_key').notEmpty().trim().isInt(),
  api.updatePage
);

// IMAGES
router.post('/images/create',
  body('name').notEmpty().trim(),
  body('description').trim(),
  body('static_url').notEmpty().trim(),
  api.createImage
);

router.post('/images/delete',
  body('id').notEmpty().trim(),
  api.deleteImage
);

router.post('/images/update',
  body('name').trim(),
  body('description').trim(),
  body('static_url').trim(),
  body('primary_key').notEmpty().trim().isInt(),
  api.updateImage
);

// PROJECTS
router.post('/projects/create',
  body('deployed_url').trim(),
  body('description').notEmpty().trim(),
  body('github_url').trim(),
  body('is_scrap').toBoolean(),
  // this doesn't exist! Should I implement it in my model?
  // body('published').toBoolean(),
  body('title').notEmpty().trim(),
  //TODO: use "isURL()"?
  api.createProject
);

router.post('/projects/delete',
  body('id').notEmpty().trim(),
  api.deleteProjectById
);

router.post('/projects/update',
  body('title').trim(),
  // not checking this to prevent omitting it from defaulting to false
  //body('is_scrap').toBoolean(),
  body('deployed_url').trim(),
  body('github_url').trim(),
  body('description').trim(),
  body('primary_key').notEmpty().trim().isInt(),
  api.updateProject
);

// PROJECTTECHNOLOGIES
router.post('/projects/technologies/delete',
  body('project_id').notEmpty().trim(),
  body('technology_name').notEmpty().trim(),
  api.deleteProjectTechnology
);

router.post('/projects/technologies/create/batch',
  body('project_id').notEmpty().trim(),
  body('technologies').notEmpty(),
  api.batchCreateProjectTechnology  
);

router.post('/projects/technologies/create',
  body('project_id').notEmpty().trim(),
  body('technology_name').notEmpty().trim(),
  api.createProjectTechnology
);

// this is probably not needed
router.post('/projects/technologies/update',
  body('project_primary_key').notEmpty().isInt(),
  body('technology_primary_key').notEmpty().trim(),
  api.updateProjectTechnology
);

// PROJECTIMAGES
//  There is no 'update' query here, as it isn't super necessary for a 
//  model so simple.
router.post('/projects/images/create',
  body('project_id').notEmpty().isInt(),
  body('image_id').notEmpty().isInt(),
  api.createProjectImage
);

router.post('/projects/images/delete',
  body('project_id').notEmpty().isInt(),
  body('image_id').notEmpty().isInt(),
  api.deleteProjectImage
);


// POSTS
router.post('/posts/create',
  body('title').notEmpty().trim(),
  body('hidden').toBoolean(),
  body('body').notEmpty().trim(),
  api.createPost
);

router.post('/posts/delete',
  body('id').notEmpty().trim(),
  api.deletePostById
);

router.post('/posts/update',
  body('primary_key').notEmpty().isInt(),
  body('title').trim(),
  body('body').trim(),
  api.updatePost
);

// POSTCATEGORIES
router.post('/posts/categories/delete',
  body('category_name').notEmpty(),
  body('post_id').notEmpty().isInt(),
  api.deletePostCategory
);

// TODO: Should this be the only way of adding categories?
router.post('/posts/categories/create/batch',
  body('categories').notEmpty().trim(),
  body('post_id').notEmpty().isInt(),
  api.batchCreatePostCategory
);

router.post('/posts/categories/create',
  body('category_name').notEmpty(),
  body('post_id').notEmpty().isInt(),
  api.createPostCategory
);

//POSTIMAGES
//  There is no 'update' query here, as it isn't super necessary for a 
//  model so simple.
router.post('/posts/images/create',
  body('post_id').notEmpty().isInt(),
  body('image_id').notEmpty().isInt(),
  api.createPostImage
);

router.post('/posts/images/delete',
  body('post_id').notEmpty().isInt(),
  body('image_id').notEmpty().isInt(),
  api.deletePostImage
);

module.exports = router;
