create database food_rescue_db;
use food_rescue_db;
select * from food_listings;
DROP TABLE IF EXISTS food_listings;
SHOW CREATE TABLE food_listings;
SHOW COLUMNS FROM food_listings LIKE 'status';
USE food_rescue_db;

ALTER TABLE food_listings
MODIFY COLUMN status
  ENUM('available','claimed','completed','expired') NOT NULL DEFAULT 'available';

USE food_rescue_db;

-- drop application tables (this will delete all data in them)
DROP TABLE IF EXISTS pickups;
DROP TABLE IF EXISTS food_listings;
DROP TABLE IF EXISTS users;


USE food_rescue_db;

-- add latitude + longitude + image_url (if not present)
ALTER TABLE food_listings
  ADD COLUMN latitude DECIMAL(10,7) NULL AFTER location,
  ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude,
  ADD COLUMN image_url VARCHAR(255) NULL AFTER donor_id;

select*from food_listings;

USE food_rescue_db;

ALTER TABLE food_listings  DROP COLUMN latitude,
  DROP COLUMN longitude,
  DROP COLUMN image_url;
  
  USE food_rescue_db;
SHOW COLUMNS FROM food_listings;

select * from users;