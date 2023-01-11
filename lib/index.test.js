/* eslint-env jest */
/* global test, expect */
'use strict'
const Hapi = require('@hapi/hapi')
const Redis = require('ioredis')
let server

beforeEach(async () => {
  server = await createServer()
})

afterEach(async () => {
  await server.stop()
})

const createServer = () => {
  return Hapi.Server()
}

test('should reject invalid options', async () => {
  expect.assertions(1)
  try {
    await server.register({
      plugin: require('./'),
      options: {
        setting: 'redis://localhost:6379'
      }
    })
  } catch (err) {
    expect(err).toBeTruthy()
  }
})

test('should reject invalid decorate', async () => {
  expect.assertions(1)
  try {
    await server.register({
      plugin: require('./'),
      options: {
        settings: 'redis://localhost:6379',
        decorate: 1
      }
    })
  } catch (err) {
    expect(err).toBeTruthy()
  }
})

test('should be able to register plugin with just URL', async () => {
  expect.assertions(1)
  await server.register({
    plugin: require('./'),
    options: {
      settings: 'redis://localhost:6379'
    }
  })
  const client = server.plugins['hapi-redis2'].client
  expect(client).toBeTruthy()
})

test('should be able to register plugin with null', async () => {
  expect.assertions(1)
  await server.register({
    plugin: require('./'),
    options: {
      settings: null
    }
  })
  const client = server.plugins['hapi-redis2'].client
  expect(client).toBeTruthy()
})

test('should log configuration upon successfull connection', async () => {
  expect.assertions(1)
  let logEntry
  server.events.once('log', entry => {
    logEntry = entry
  })

  await server.register({
    plugin: require('./'),
    options: {
      settings: {
        host: 'localhost',
        port: 6379,
        db: 1
      }
    }
  })
  expect(logEntry).toEqual({
    channel: 'app',
    timestamp: logEntry.timestamp,
    tags: ['hapi-redis2', 'info'],
    data: 'redis connection created for redis://localhost:6379/1'
  })
})

// note: a warning might be thrown
// Warning: Redis server does not require a password, but a password was supplied.

test('should be able to find the plugin on exposed objects', async () => {
  expect.assertions(2)
  await server.register({
    plugin: require('./'),
    options: {
      settings: 'redis://localhost:6379'
    }
  })
  server.route({
    method: 'GET',
    path: '/',
    handler: request => {
      const plugin = request.server.plugins['hapi-redis2']
      expect(plugin.client).toBeTruthy()
      expect(plugin.lib).toBeTruthy()
      return null
    }
  })
  await server.inject({
    validate: false,
    method: 'GET',
    url: '/'
  })
})

test('should be able to find the plugin on decorated objects', async () => {
  expect.assertions(2)
  await server.register({
    plugin: require('./'),
    options: {
      settings: 'redis://localhost:6379',
      decorate: true
    }
  })
  server.route({
    method: 'GET',
    path: '/',
    handler: request => {
      const plugin = request.server.redis
      expect(plugin.client).toBeTruthy()
      expect(plugin.lib).toBeTruthy()
      return null
    }
  })
  await server.inject({
    validate: false,
    method: 'GET',
    url: '/'
  })
})

test('should be able to find the plugin on custom decorated objects', async () => {
  expect.assertions(2)
  await server.register({
    plugin: require('./'),
    options: {
      settings: 'redis://localhost:6379',
      decorate: 'myRedis'
    }
  })
  server.route({
    method: 'GET',
    path: '/',
    handler: request => {
      const plugin = request.server.myRedis
      expect(plugin.client).toBeTruthy()
      expect(plugin.lib).toBeTruthy()
      return null
    }
  })
  await server.inject({
    validate: false,
    method: 'GET',
    url: '/'
  })
})

test('should be able to find the plugin on custom multiple decorated objects', async () => {
  expect.assertions(4)
  await server.register({
    plugin: require('./'),
    options: [
      {
        settings: 'redis://localhost:6379',
        decorate: 'myRedis1'
      },
      {
        settings: 'redis://localhost:6379',
        decorate: 'myRedis2'
      }
    ]
  })
  server.route({
    method: 'GET',
    path: '/multiple',
    handler: request => {
      const redis1 = request.server.myRedis1
      const redis2 = request.server.myRedis2
      expect(redis1.client).toBeTruthy()
      expect(redis1.lib).toBeTruthy()

      expect(redis2.client).toBeTruthy()
      expect(redis2.lib).toBeTruthy()
      return null
    }
  })
  await server.inject({
    validate: false,
    method: 'GET',
    url: '/multiple'
  })
})

test('should fail to mix different decorations', async () => {
  expect.assertions(1)
  try {
    await server.register({
      plugin: require('./'),
      options: [
        {
          settings: 'redis://localhost:6379',
          decorate: true
        },
        {
          settings: 'redis://localhost:6379',
          decorate: 'myRedis'
        }
      ]
    })
  } catch (err) {
    expect(err).toBeTruthy()
  }
})

test('should connect to a redis instance without providing plugin settings', async () => {
  expect.assertions(1)
  await server.register({
    plugin: require('./')
  })
  const client = server.plugins['hapi-redis2'].client
  expect(client).toBeInstanceOf(Redis)
  client.quit()
})
