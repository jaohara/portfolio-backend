/*
  portfoliodb schema
  Created 7/14/2021

  This could probably stand to be renamed? This is a SQL file for the
  schema of the database that my portfolio site would use.

  It would need the following tables:

  - User 
    - to hold users (just myself, really)
  - Page (do I need this?)
    - stores body of each main page, written in markdown
    - Do I want to do it this way or write this stuff in my views?
  - BlogPost 
    - to hold blog posts
  - Project 
    - to hold portfolio projects
  - Scraps/Snippets 
    - could probably use a better name? To hold small things and demonstrations
 
*/


-- do I have a better name? Portfolio? Website?
DROP SCHEMA IF EXISTS portfoliodb;
CREATE SCHEMA portfoliodb;
USE portfoliodb;

/* 
  I might not actually need this if I'm using Auth0. I should look into 
  what I would use this for and see if I should just remove it.
*/
-- user table
CREATE TABLE User (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(48) NOT NULL,
  email             VARCHAR(320) NOT NULL,
  first_name        VARCHAR(48),
  last_name         VARCHAR(48),
  created           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- how do I use this exactly?
  password          VARCHAR(64) NOT NULL,          -- and what about this?

  PRIMARY KEY (id)
);

CREATE TABLE Page (
  name              VARCHAR(255) NOT NULL,
  pretty_name       VARCHAR(255) NOT NULL,
  hidden            BOOLEAN NOT NULL DEFAULT false,
  modified          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  body              TEXT,

  PRIMARY KEY (name)
);

-- table for blog posts
CREATE TABLE Post (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT, 
  user_id           INT UNSIGNED,          
  title             VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  hidden            BOOLEAN NOT NULL DEFAULT false,
  header_image_url  VARCHAR(255),
  published         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  body              TEXT NOT NULL,

  PRIMARY KEY (id),
  UNIQUE (slug),

  CONSTRAINT post_user_id_fk FOREIGN KEY (user_id)
    REFERENCES User (id)
    ON UPDATE CASCADE
);

-- table for categories (used for blogs, maybe images?)
CREATE TABLE Category (
  name              VARCHAR(128) NOT NULL,

  PRIMARY KEY (name)
);

-- table for Technologies (used for Projects)
CREATE TABLE Technology (
  name              VARCHAR(128) NOT NULL,
  color             VARCHAR(32),
    -- string representing a color that can be set via CSS

  PRIMARY KEY (name)
);

CREATE TABLE Project (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED,
  published         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,    
  title             VARCHAR(128) NOT NULL,
  is_scrap          BOOLEAN NOT NULL DEFAULT false,
  image_id          INT UNSIGNED,
  image_url         VARCHAR(255), -- optional main image to display (mandatory?) 
    -- should image_url be static?
    -- should image_url just be a reference to a row on Image?
  deployed_url      VARCHAR(255), -- url to a live version 
  github_url        VARCHAR(255),
  description       TEXT NOT NULL,-- best type for this? I think it's TEXT or TINYTEXT?

  PRIMARY KEY (id),

  CONSTRAINT project_user_id_fk FOREIGN KEY (user_id)
    REFERENCES User (id)
    ON UPDATE CASCADE
);

CREATE TABLE Image (
  description       TEXT,
  created           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(255) NOT NULL,
  static_url        VARCHAR(255) NOT NULL,

  PRIMARY KEY (id)
);

CREATE TABLE Settings (
  name              VARCHAR(255) NOT NULL,
  value             VARCHAR(255) NOT NULL,
  description       VARCHAR(255),
  previous_value    VARCHAR(255),
  last_updated      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- many-to-many tables
CREATE TABLE PostCategory (
  post_id           INT UNSIGNED NOT NULL,
  category_name     VARCHAR(128) NOT NULL,

  CONSTRAINT postcategory_pk PRIMARY KEY (post_id, category_name),

  CONSTRAINT postcategory_post_id_fk FOREIGN KEY (post_id)
    REFERENCES Post (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT postcategory_category_id_fk FOREIGN KEY (category_name)
    REFERENCES Category (name)
    ON DELETE CASCADE
    ON UPDATE CASCADE  
);

CREATE TABLE PostImage (
  post_id           INT UNSIGNED NOT NULL,
  image_id          INT UNSIGNED NOT NULL,

  CONSTRAINT postimage_pk PRIMARY KEY (post_id, image_id),

  CONSTRAINT postimage_post_id_fk FOREIGN KEY (post_id)
    REFERENCES Post (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT postimage_image_id_fk FOREIGN KEY (image_id)
    REFERENCES Image (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE ProjectTechnology (
  project_id        INT UNSIGNED NOT NULL,
  technology_name   VARCHAR(128) NOT NULL,

  CONSTRAINT projecttechnology_pk PRIMARY KEY (project_id, technology_name),

  CONSTRAINT projecttechology_project_id_fk FOREIGN KEY (project_id)
    REFERENCES Project (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT projecttechnology_technology_name_fk FOREIGN KEY (technology_name)
    REFERENCES Technology (name)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE ProjectImage (
  project_id        INT UNSIGNED NOT NULL,
  image_id          INT UNSIGNED NOT NULL,

  CONSTRAINT projectimage_pk PRIMARY KEY (project_id, image_id),

  CONSTRAINT projectimage_project_id_fk FOREIGN KEY (project_id)
    REFERENCES Project (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT projectimage_image_id_fk FOREIGN KEY (image_id)
    REFERENCES Image (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);


/*
  DEMO DATA FOR MAIN SITE DEVELOPMENT
*/

-- PAGE
INSERT INTO Page (name, pretty_name, body) VALUES ("home", "Home", "Home Page, important for stuff.");
INSERT INTO Page (name, pretty_name, body) VALUES ("test-page", "Test Page", "This is a test page. It's got some stuff.");
INSERT INTO Page (name, pretty_name, body) VALUES ("about-me", "About Me", "I like to program stuff. It makes me feel really accomplished. Hopefully someone will want to pay me to do this.");
-- hidden test page
INSERT INTO Page (name, pretty_name, hidden, body) VALUES ("secret-page", "Secret Page", true, "Secret Page - no peeking!");


-- POST
/*
INSERT INTO Post (title, slug, body, post_id) VALUES
  ("This is a Post.", "this-is-a-post", "Hey, this is a post. It's the first of many.", 1);
INSERT INTO Post (title, slug, body, post_id) VALUES
  ("My Second Post", "second-post", "Another post! Hopefully these all display nicely.", 2);
INSERT INTO Post (title, slug, body, post_id) VALUES
  ("Everything Bagels are the Best Bagel", "everything-bagels", "I think most sane people would agree with me, although poppy seed or sesame make a strong case for runner-up.", 3);
INSERT INTO Post (title, slug, body, post_id) VALUES
  ("Summer is Here!", "summer-is-here", "I really hope there isn't too much smoke this year.", 4);
*/

-- PROJECT
INSERT INTO Project (title, description, id, image_url) VALUES
  ("Tetris", "A tetris game written in Typescript", 1, "tmp_img/tetris/game.png"),
  ("Draft List", "Software to make dynamically sortable draft lists from beers in a restaurant's inventory.", 2, "tmp_img/draft-list/draft-list-raw.jpg"),
  ("Portfolio", "My portfolio page, created with React, Express, and MySQL.", 3, "tmp_img/portfolio/frontend-example.png");


-- PROJECT - Scraps

INSERT INTO Project (title, description, is_scrap) VALUES
  ("Demo Club Design", "Unused design mockup for a club website.", true);
INSERT INTO Project (title, description, is_scrap) VALUES
  ("React/Express API Example", "A simple demonstration of using React to access and modify a database table.", true);

-- TECHNOLOGY
INSERT INTO Technology (name, color) VALUES
  ("TypeScript", ""),
  ("JavaScript", ""),
  ("React", ""),
  ("Express", ""),
  ("Node.js", ""),
  ("SCSS", ""),
  ("SQL", ""),
  ("Java", ""),
  ("Python", "");


-- PROJECTTECHNOLOGY
INSERT INTO ProjectTechnology (project_id, technology_name) VALUES
  (1, "TypeScript"),
  (2, "React"),
  (2, "Express"),
  (2, "SQL"),
  (2, "SCSS"),
  (3, "React"),
  (3, "TypeScript"),
  (3, "Express"),
  (3, "SQL"),
  (3, "SCSS");