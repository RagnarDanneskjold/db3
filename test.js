var
  should = require('chai').expect(),
  _ = require('underscore'),
  db3 = require('./db3.js'),
  db = db3.connect({user: 'root', database : 'test'})

describe('Db3', function () {
  before(function (done) {
    db.dropTable('test', function () {
      db.createTable('test', function () {
        db.dropTable('person', function () {
          db.createTable('person', ['id', 'name', 'gender'], function () {
            db.insert('person', [
              {name: 'God', gender: 'god'},
              {name: 'Adam', gender: 'male'},
              {name: 'Eve', gender: 'female'},
              {name: 'Cain', gender: 'male'},
              {name: 'Able', gender: 'male'},
              {name: 'Seth', gender: 'male'}
            ], done)
          })
        })
      })
    })
  })
  describe('#connect()', function () {
    it('should connect to the db', function (done) {
      var db = db3.connect({user: 'root', database : 'test'})
      db.query('select 1', function (data) {
        if (!data || !data[0])
          return done(new Error('test db is not working'))
        done()
      })
    })
  })
  describe('#end()', function () {
    it('should disconnect from', function (done) {
      var db = db3.connect({user: 'root', database : 'test'})
      db.end(function () {done()})
    })
  })
  describe('#createTable()', function () {
    it('should create table', function (done) {
      var table = 'createTable' + +(new Date)
      db.createTable(table, function () {
        db.tableExists(table, function (exists) {
          if (!exists)
            return done(new Error('"' + table + '" table does not exist'))
          return done()
        })
      })
    })
  })
  describe('#dropTable()', function () {
    it('should drop table', function (done) {
      var table = 'dropTable' + +(new Date)
      db.createTable(table, function () {
        db.dropTable(table, function () {
          db.tableExists(table, function (exists) {
            if (exists)
              return done(new Error('"' + table + '" table was not dropped'))
            return done()
          })
        })
      })
    })
  })
  describe('#tableExists()', function () {
    it('should check if table exists', function (done) {
      db.tableExists('tableExists' + +(new Date), function (exists) {
        if (exists)
          return done(new Error('"' + table + '" table exists'))
        return done()
      })
    })
  })
  describe('#truncateTable()', function () {
    it('should truncate table', function (done) {
      var table = 'truncateTable' + +(new Date)
      db.createTable(table, function () {
        db.insert(table, function (data) {
          if (!data.insertId)
            return done(new Error('failed to insert test item'))
          db.truncateTable(table, function () {
            db.count(table, function (count) {
              if (count)
                return done(new Error('truncate table failed'))
              done()
            })
          })
        })
      })
    })
  })
  describe('#copyTable()', function () {
    it('should copy table and all its data to other table', function (done) {
      var table = 'copyTable' + +(new Date)
      db.createTable(table, function () {
        db.insert(table, function (data) {
          if (!data.insertId)
            return done(new Error('failed to insert test item'))
          db.copyTable(table, function (data) {
            db.count(data.table, function (count) {
              if (!count)
                return done(new Error('copied table is absent or has no rows'))
              done()
            })
          })
        })
      })
    })
  })
  describe('#renameTable()', function () {
    it('should rename table', function (done) {
      var table = 'renameTable' + +(new Date)
      db.createTable(table, function () {
        db.insert(table, function (data) {
          if (!data.insertId)
            return done(new Error('failed to insert test item'))
          db.renameTable(table, function (data) {
            db.count(data.table, function (count) {
              if (!count)
                return done(new Error('renamed table is absent or has no rows'))
              done()
            })
          })
        })
      })
    })
  })
  describe('#insert()', function () {
    it('should insert empty item', function (done) {
      db.insert('test', function (data) {
        if (!data.insertId)
          return done(new Error('no insert id'))
        done()
      })
    })
    it('should insert item', function (done) {
      db.insert('test', {name: 'test'}, function (data) {
        if (!data.insertId)
          return done(new Error('no insert id'))
        db.select('test', data.insertId, function (data) {
          if (!data || !data[0] || (data[0].name != 'test'))
            return done(new Error('inserted item has wrong name field'))
          done()
        })
      })
    })
  })
  describe('#update()', function () {
    it('should update row', function (done) {
      db.insert('test', function (data) {
        if (!data.insertId)
          return done(new Error('no insert id'))
        var id = data.insertId
        db.update('test', id, {name: 'test'}, function (data) {
          if (!data || !data.changedRows)
            return done(new Error('update failed'))
          db.select('test', id, function (data) {
            if (!data || !data[0] || (data[0].name != 'test'))
              return done(new Error('inserted item has wrong name field'))
            done()
          })
        })
      })
    })
  })
  describe('#delete()', function () {
    it('should delete row', function (done) {
      db.insert('test', function (data) {
        if (!data.insertId)
          return done(new Error('no insert id'))
        var id = data.insertId
        db.delete('test', id, function (data) {
          if (!data || !data.affectedRows)
            return done(new Error('update failed'))
          db.select('test', id, function (data) {
            if (data && data[0])
              return done(new Error('item was not deleted'))
            done()
          })
        })
      })
    })
  })
  describe('#save()', function () {
    it('should insert a new row', function (done) {
      db.save('test', function (data) {
        if (!data.insertId)
          return done(new Error('no insert id'))
        db.select('test', data.insertId, function (data) {
          if (!data || !data[0])
            return done(new Error('item was not added'))
          done()
        })
      })
    })
    it('should update an existing row', function (done) {
      db.save('test', function (data) {
        if (!data.insertId)
          return done(new Error('no insert id'))
        var item = {id: data.insertId, name: 'test'}
        db.save('test', item, function (data) {
          db.select('test', item.id, function (data) {
            if (!data || !data[0] || (data[0].name != item.name))
              return done(new Error('item was not updated'))
            done()
          })
        })
      })
    })
  })
  describe('#select()', function () {
    it('should select an item from table', function (done) {
      var item = {name: 'test'}
      db.insert('test', item, function (data) {
        if (!data.insertId)
          return done(new Error('no insert id'))
        db.select('test', data.insertId, function (data) {
          if (!data || !data[0] || (data[0].name != item.name))
            return done(new Error('item was not found'))
          done()
        })
      })
    })
  })
  describe('#count()', function () {
    it('should count items in a table', function (done) {
      db.count('person', {name: 'God'}, function (count) {
        if (!count)
          return done(new Error('no items found'))
        done()
      })
    })
  })
  describe('#groupBy()', function () {
    var groupBy = {
      count: {
        field: '*',
        fullTable: 6,
        filtered: 1,
        grouped: {gender: 'female', count: 1},
        filteredAndGrouped: {gender: 'male', count: 4}
      },
      min: {
        fullTable: 1,
        filtered: 2,
        grouped: {gender: 'female', min: 3},
        filteredAndGrouped: {gender: 'male', min: 4}
      },
      max: {
        fullTable: 6,
        filtered: 2,
        grouped: {gender: 'female', max: 3},
        filteredGrouped: {gender: 'male', max: 4}
      },
      avg: {
        fullTable: 3.5,
        filtered: 2,
        grouped: {gender: 'female', avg: 3},
        filteredGrouped: {gender: 'male', avg: 4}
      },
      sum: {
        fullTable: 21,
        filtered: 2,
        grouped: {gender: 'female', sum: 3.0},
        filteredGrouped: {gender: 'male', sum: 4}
      }
    }
    _.each(['count', 'min', 'max', 'avg', 'sum'], function (func) {
      var name = func + '(' + (groupBy[func].field || 'id') + ')'
      it('should select ' + name  + ' from table', function (done) {
        db[func]('person', function (data) {
          if (data != groupBy[func].fullTable)
            return done(new Error(func + ' returned wrong value ' + data))
          return done()
        })
      })
      it('should select ' + name + ' from table filtered by condition', function (done) {
        db[func]('person', {name: 'Adam'}, function (data) {
          if (data != groupBy[func].filtered)
            return done(new Error(func + ' returned wrong value ' + data))
          return done()
        })
      })
      it('should select ' + name + ' from table grouped by field', function (done) {
        db[func]('person', ['gender', 'id'], function (data) {
          if (!_.findWhere(data, groupBy[func].grouped))
            return done(new Error(func + ' returned wrong value'))
          return done()
        })
      })
      it('should select ' + name + ' from table filtered by condition and grouped by field', function (done) {
        db[func]('person', {name: 'Cain'}, ['gender', 'id'], function (data) {
          if (!_.findWhere(data, groupBy[func].filteredGrouped))
            return done(new Error(func + ' returned wrong value'))
          return done()
        })
      })
    })
  })
  describe('#query()', function () {
    it('should return summary data grouped by name', function (done) {
      db.query('select ??, count(*) from ?? group by ??', ['name', 'test', 'name'], function (data) {
        if (!data || !data.length)
          return done(new Error('no items found'))
        done()
      })
    })
  })
})
