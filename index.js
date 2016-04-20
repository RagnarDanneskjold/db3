var
  _ = require('underscore'),
  stream = require('stream'),
  mysql = require('mysql'),
  shortid = require('shortid'),
  queryString = require('db3-query-string')

module.exports = function (d) {
  return new Db3(d)
}

function Db3 (d) {
  var self = this
  _.each(['count', 'min', 'max', 'avg', 'sum'], function (func) {
    self[func] = function (table, cond, field, done) {
      return self.groupBy(func, table, cond, field, done)
    }
  })
  this.stack = []
  this.use(true, this.stringify())
  this.use(true, this.dbQuery())
  this.use(true, this.unpack())
  if (d)
    this.connect(d)
  return this
}

_.extend(Db3.prototype, {
  format: mysql.format,
  queryString: queryString,
  connect: function (d) {
    this.db = mysql.createPool(d)
    return this
  },
  end: function (done) {
    return this.db.end(done)
  },
  createTable: function (table, field, done) {
    if (_.isFunction(table)) {
      field = table
      table = 'table' + shortid.generate()
    }
    if (_.isFunction(field)) {
      done = field
      field = undefined
    }
    this.query({name: 'createTable', table: table, field: field}, function (err, data) {
      data = data || {}
      data.table = table
      done(err, data)
    })
  },
  dropTable: function (table, done) {
    this.query({name: 'dropTable', table: table}, done)
  },
  truncateTable: function (table, done) {
    this.query({name: 'truncateTable', table: table}, done)
  },
  renameTable: function (from, to, done) {
    if (_.isFunction(to)) {
      done = to
      to = undefined
    }
    if (!to)
      to = from + shortid.generate()
    this.query({name: 'renameTable', table: from, to: to}, function (err, data) {
      if (err)
        return done(err, null)
      data = data || {}
      data.table = to
      done(err, data)
    })
  },
  tableExists: function (table, done) {
    this.query({name: 'select', table: table, limit: 1}, function (err, data) {
      if (!err)
        return done(null, true)
      done(null, false)
    })
  },
  copyTable: function (from, to, done) {
    if (_.isFunction(to)) {
      done = to
      to = undefined
    }
    if (!to)
      to = from + shortid.generate()
    var self = this
    self.query({name: 'createTable', table: to, like: from}, function (err, data) {
      if (err)
        return done(err, null)
      self.query({name: 'insert', table: to, select: from}, function (err, data) {
        if (err)
          return done(err, null)
        data = data || {}
        data.table = to
        done(err, data)
      })
    })
  },
  insert: function (table, d, done) {
    if (_.isFunction(d)) {
      done = d
      d = undefined
    }
    if (!d || !_.size(d))
      d = {id: null}
    if (!done) {
      var self = this
      var s = new stream.Writable({objectMode: true})
      s._write = function (d, encoding, done) {self.insert(table, d, function () {done()})}
      return s
    }
    this.query({name: 'insert', table: table, set: d}, done)
  },
  update: function (table, cond, d, done)  {
    if (_.isString(cond) || _.isNumber(cond) || _.isArray(cond))
      cond = {id: cond}
    this.query({name: 'update', table: table, set: d, where: cond}, done)
  },
  delete: function (table, cond, done) {
    if (_.isString(cond) || _.isNumber(cond))
      cond = {id: cond}
    if (!done) {
      var self = this
      var s = new stream.Writable({objectMode: true})
      s._write = function (d, encoding, done) {self.delete(table, d, function () {done()})}
      return s
    }
    this.query({name: 'delete', table: table, where: cond}, done)
  },
  save: function (table, d, field, done) {
    if (_.isFunction(d)) {
      done = field
      field = d
      d = undefined
    }
    if (_.isFunction(field)) {
      done = field
      field = undefined
    }
    if (!_.size(d))
      d = {id: null}
    if (_.isString(field))
      field = [field]
    if (!done) {
      var self = this
      var s = new stream.Writable({objectMode: true})
      s._write = function (d, encoding, done) {self.save(table, d, field, function () {done()})}
      return s
    }
    this.query({name: 'insert', table: table, set: d, update: (field && _.pick(d, field)) || d}, done)
  },
  duplicate: function (table, id, d, done) {
    if (_.isFunction(d)) {
      done = d
      d = undefined
    }
    var self = this
    var temporaryTable = 'duplicate' + shortid.generate()
    self.query({name: 'createTable', table: temporaryTable, like: table}, function () {
      self.query({name: 'insert', table: temporaryTable, select: {table: table, where: {id: id}}}, function () {
        self.update(temporaryTable, id, d, function () {
          self.query({name: 'alterTable', table: temporaryTable, drop: 'id'}, function () {
            self.query('insert ?? select null, ??.* from ??', [table, temporaryTable, temporaryTable], function (err, data) {
              self.dropTable(temporaryTable, function () {done(err, data)})
            })
          })
        })
      })
    })
  },
  select: function (d, cond, field, done) {
    if (_.isFunction(cond)) {
      done = cond
      field = undefined
      cond = undefined
    }
    if (_.isFunction(field)) {
      done = field
      field = undefined
    }
    if (_.isNumber(d) || _.isString(d)) {
      d = {
        table: d,
        where: cond,
        field: field
      }
    }
    var unpackRow = _.isNumber(d.where) || _.isString(d.where)
    if (_.isNumber(d.where) || _.isString(d.where) || _.isArray(d.where))
      d.where = {id: d.where}
    var unpackField = (_.isNumber(d.field) || _.isString(d.field)) && d.field
    var query = _.extend(
      {
        name: 'select',
        unpack: function (data) {
          if (unpackField)
            data = _.pluck(data, unpackField)
          if (unpackRow)
            data = data[0]
          return data
        }
      },
      _.pick(d, ['field', 'table', 'where', 'orderBy', 'limit'])
    )
    return this.query(query, done)
  },
  groupBy: function (func, table, cond, field, done) {
    if (_.isFunction(cond) || _.isArray(cond)) {
      done = field
      field = cond
      cond = undefined
    }
    if (_.isFunction(field)) {
      done = field
      field = undefined
    }
    cond = queryString.where.query(cond)
    field = field || 'id'
    if (_.isString(field))
      field = [field]
    var lastField = mysql.escapeId(field.pop())
    field = _.map(field, function (d, i) {return mysql.escapeId(field)}).join(', ')
    var query = 'select ' + field
    if (field.length)
      query += ', '
    query += func + '(' + lastField + ') as ' + func + ' from ' + mysql.escapeId(table)
    if (cond)
      query += ' where ' + cond
    if (field.length)
      query += ' group by ' + field
    this.query(query, function (err, data) {
      if (!field.length) {
        var value = data && data[0] && _.values(data[0])[0]
        if (value && !_.contains(['min', 'max'], func))
          value = +value
        return done(err, value, field)
      }
      done(err, data)
    })
  },
  query: function (sql, values, done) {
    if (_.isFunction(values)) {
      done = values
      values = undefined
    }
    if (!done)
      return this.db.query(queryString.stringify(sql, values)).stream()
    var self = this
    var i = 0
    var ctx = {
      sql: sql,
      values: values
    }
    function next (err) {
      var use = self.stack[i++]
      if (err || !use || !use.fn)
        return done(err, ctx.data)
      if (self.match(use.filter, sql))
        return use.fn(ctx, next)
      return next()
    }
    return next()
  },
  stringify: function () {
    return function (ctx, next) {
      ctx.queryString = queryString.stringify(ctx.sql, ctx.values)
      next()
    }
  },
  dbQuery: function () {
    var self = this
    return function (ctx, next) {
      self.db.query(ctx.queryString, function (err, data, fields) {
        ctx.data = data
        ctx.fields = fields
        next(err)
      })
    }
  },
  unpack: function () {
    return function (ctx, next) {
      if (!ctx.sql || !ctx.sql.unpack)
        return next()
      ctx.data = ctx.sql.unpack(ctx.data)
      next()
    }
  },
  match: function (filter, sql) {
    if (filter === true)
      return true
    return filter == sql.name
  },
  use: function (filter, fn) {
    this.stack.push({filter: filter, fn: fn})
  }
})
