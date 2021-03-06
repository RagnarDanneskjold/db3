[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Linux Build][travis-image]][travis-url]

## Table of Contents

 * [Introduction](#introduction)
 * [Installation](#installation)
 * [Connecting](#connecting)
 * [Disconnecting](#disconnecting)
 * [Creating table](#creating-table)
 * [Droping table](#droping-table)
 * [Truncating table](#truncating-table)
 * [Copying table](#copying-table)
 * [Renaming table](#renaming-table)
 * [Checking if table exists](#checking-if-table-exists)
 * [Inserting](#inserting)
 * [Updating](#updating)
 * [Deleting](#deleting)
 * [Saving](#saving)
 * [Selecting](#selecting)
 * [Aggregate functions](#aggregate-functions)
 * [SQL query](#sql-query)
 * [Advanced queries](#advanced-queries)
 * [Streaming](#streaming)
 * [Plugins](#plugins)

## Introduction
Db3 provides a framework and query format for data exchange. It replaces SQL queries in your code with simple, clean and readable calls. Its aim is to provide shorthand methods for basic and most used data lookup patterns. It may be useful for those who doesn't know or doesn't want to use SQL, but still interested in communicating with the SQL based db. 

## Setup
```javascript
var db = require('db3')()

db.use(require('db3-streamify')) //optional plugin for streaming
db.use(require('db3-mysql')({
  host: 'example.org',
  user: 'bob',
  password: 'secret',
  database : 'test'
})) // MySQL plugin
```
For more details on connections options, see [mysql.createPool](https://github.com/felixge/node-mysql#establishing-connections)

## Disconnecting
```javascript
//db.end(cb)
db.end(function (err) {
  console.log('all connections closed gracefully')
})
```
## Creating table
SQL: create table ...
```javascript
//db.createTable(table, fields, callback)
/*
create table `person` (
  id bigint primary key auto_increment,
  name text,
  gender text
);
*/
db.createTable('person', ['id', 'name', 'gender'], function (err, data) {
  console.log('created table `person` with field `id`, `name`, `gender`')
})
```
all fields will be of `text` type, except `id` (will be "bigint primary key auto_increment") and fields matching /Id$/, like userId (will become bigint)

## Droping table
SQL: drop table ...
```javascript
//db.dropTable(table, callback)
//drop table `person`;
db.dropTable('person', function () {
  console.log('table `person` dropped')
})
```

## Truncating table
SQL: truncate table ...
```javascript
//db.truncateTable(table, callback)
//truncate table `person`;
db.truncateTable('person', function () {
  console.log('table `person` truncated')
})
```

## Copying table
SQL: create table ... like ... insert
```javascript
//db.copyTable(from, to, callback)
//create table `personCopy` like `person`; insert `personCopy` select * from `person`;
db.copyTable('person', 'personCopy', function () {
  console.log('copied table `person` and all its data to table `personCopy`')
})
```

## Renaming table
SQL: rename table ...
```javascript
//db.renameTable(from, to, callback)
//rename table `person` to `nosrep`;
db.renameTable('person', 'nosrep', function () {
  console.log('renamed table `person` and all its data to table `nosrep`')
})
```

## Checking if table exists
```javascript
//db.tableExists(table, callback)
db.tableExists('person', function (err, exists) {
  if (exists)
    console.log('table `person` exists')
  else
    console.log('table `person` does not exist')
})
```

## Inserting
SQL: insert ...
```javascript
//db.insert(table, data, callback)
//insert `person` set `name` = "Bob";
db.insert('person', {name: 'Bob'}, function (err, data) {
  console.log('inserted row into table `person` with id ' + data.insertId + ' and `name` set to "Bob"')
})
```

## Updating
SQL: update ...
```javascript
//db.update(table, condition, data, callback)
//update `person` set `name` = "Bob" where `name` = "Alice";
db.update('person', {name: 'Bob'}, {name: 'Alice'}, function (err, data) {
  console.log('updated table `person`: ' + data.changedRows + ' rows named "Bob" changed name to "Alice"')
})
```

## Deleting
SQL: delete from ...
```javascript
//db.delete(table, condition, callback)
//delete from `person` where `name` = "Alice";
db.delete('person', {name: 'Alice'}, function (err, data) {
  console.log('deleted ' + data.affectedRows + ' rows named "Alice" from table `person`')
})
```

## Saving
SQL: insert ... on duplicate key update ...
```javascript
//db.save(table, data, callback)
//insert `person` set `id` = 1, `name` = "Bob" on duplicate key update `id` = 1, `name` = "Bob";
db.save('person', {id: 1, name: 'Bob'}, function (err, data) {
  console.log('saved row with id ' + data.insertId + ' with name set to "Bob" into table `person`')
})
//db.save(table, data, field, callback)
//insert `person` set `id` = 1, `name` = "Bob", gender = "male" on duplicate key update `gender` = "male";
db.save('person', {id: 1, name: 'Bob', gender: 'male'}, 'gender', function (err, data) {
  console.log('saved row with id ' + data.insertId + ' and gender set to "male" into table `person`')
})
```

## Selecting
```javascript
//db.select(table, condition, field, callback)
//select `name`, `gender` from `person` where `name` = "Bob";
db.select('person', {name: 'Bob'}, ['name', 'gender'], function (err, data) {
  console.log('selected name, gender fields from table `person`, where `name` = "Bob"')
  console.log(data)
  //[{name: 'Bob', gender: 'male'}, {name: 'Bob', gender: 'male'}, {name: 'Bob', gender: 'female'}, ...]
})
//if condition value is an array, its converted to in () statement
//select * from `person` where `name` in ('Bob', 'Alice');
db.select('person', {name: ['Bob', 'Alice']}, function (err, data) {
  console.log('selected all fields table `person`, where `name` is "Bob" or "Alice"')
  console.log(data)
  //[{id: 1, name: 'Bob', gender: 'male'}, {id: 2, name: 'Alice', gender: 'female'}]
})
//if condition is number or string or array, then its treated as condition on id field
//select * from `person` where `id` = 1;
db.select('person', 1, function (err, data) {
  console.log('selected all fields from table `person`, where `id` = 1')
  console.log(data)
  //{id: 1, name: 'Bob', gender: 'male'}
  //if id is set then row object is being returned, instead of array
})
//select * from `person` where id in (1, 2);
db.select('person', [1, 2], function (err, data) {
  console.log('selected all fields from table `person`, where `id` is 1 or 2')
  console.log(data)
  //[{id: 1, name: 'Bob', gender: 'male'}, {id: 2, name: 'Alice', gender: 'female'}]
})
//select `name` from `person` where gender = "male";
db.select('person', {gender: 'male'}, 'name', function (err, data) {
  console.log('selected `name` of all male persons')
  console.log(data)
  //["Bob", "Bill", "Bob", ...]
  //if field is string then returned array contains this field value instead of row object
})
//select `name` from `person` where id = 1;
db.select('person', 1, 'name', function (err, data) {
  console.log('selected `name` of person with `id` = 1')
  console.log(data)
  //"Bob"
  //if id is set and field is string then the field value returned, instead of array
})
```

## Aggregate functions
Supported functions: count, min, max, avg, sum
```javascript
//db[functionName](table, condition, field, callback)
//select count(*) from `person` where `name` = "Bob";
db.count('person', {name: 'Bob'}, function (err, count) {
  console.log('there are ' + count + ' persons named "Bob"')  
})
//select min(id) from `person` where `name` = "Bob";
db.min('person', {name: 'Bob'}, function (err, min) {
  console.log('first "Bob" has id ' + min)  
})
//select name, avg(age) from `person` where `name` = "Bob";
db.avg('person', {name: 'Bob'}, ['age'], function (err, avg) {
  console.log('Bob average age is ' + avg)  
})
//select name, sum(income) from `person` where `city` = "Hong Kong" group by name;
db.sum('person', {city: 'Hong Kong', year: '2015'}, ['name', 'income'], function (err, data) {
  console.log('total income of HK citizens by name for 2015')  
  console.log(data)
  //[{name: 'Yun', sum: someNumber}, {name: 'Tony', sum: someNumber}, {name: 'Donnie', sum: someNumber}, ...]
})
```

## SQL query
Proxied to the underlying SQL layer
```javascript
db.query('select ??, count(*) as count from ?? group by ?? order by id limit 10', ['gender', 'person', 'gender'], function (err, data) {
  console.log(data)
  //[{gender: 'male', count: someNumber}, {gender: 'female', count: someNumber}, ...]
})
```

## Advanced queries
You can use query objects directly
```js
db({name: 'select', table: 'person', field: 'name'}, function (err, data) {
  console.log(data)
  //[{name: 'Bob'}, {name: 'Alice'}]
})
```

## Streaming
Without callback most functions return streams
```javascript
//streaming select, outputs all rows in the table
db.select('person').on('data', console.log)
//streaming from select to insert, selects all rows from one table and inserts them to the other table
db.select('person').pipe(db.insert('nosrep'))
//streaming from select to save, selects all rows from one table and saves them to the other table
db.select('person').pipe(db.save('nosrep'))
//streaming from select to delete, selects all rows from one table and deletes them from the other table
db.select('person').pipe(db.delete('nosrep'))
//streaming from select to csv (using fast-csv lib), selects all rows from the table and converts them to csv
db.select('person').pipe(csv.format({headers: true}))
//raw query can be streamed too
db.query('select * from person').on('data', console.log)
//streaming from csv file to insert, inserts csv file into the table
csv.fromPath('my.csv').pipe(db.insert('person'))
//streaming from csv stream to insert, inserts csv formatted readable stream content into the table
csv.fromStream(readableStream).pipe(db.insert('person'))
```

## Plugins
To add pluging use .use
```js
db.use(function (ctx, next) {
  //do something
  next() //accepts optional err argument
})
```

[downloads-image]: https://img.shields.io/npm/dm/db3.svg
[downloads-url]: https://npmjs.org/package/db3
[node-version-image]: http://img.shields.io/node/v/db3.svg
[node-version-url]: http://nodejs.org/download/
[travis-image]: https://img.shields.io/travis/afanasy/db3/master.svg
[travis-url]: https://travis-ci.org/afanasy/db3
