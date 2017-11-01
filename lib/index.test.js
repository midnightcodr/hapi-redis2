'use strict'
const Hapi = require('hapi')
const redis = require('redis')

// not using beforeEach and share a
// server instance because one test
// might affect the results of others

const createServer = () => {
    return new Hapi.Server()
}

test('should reject invalid options', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: {
            urll: 'redis://localhost:6379'
        },
    }).catch(err => {
        expect(err).toBeTruthy()
    })
})

test('should reject invalid decorate', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379',
            decorate: 1
        },
    }).catch(err => {
        expect(err).toBeTruthy()
    })
})

test('should be able to register plugin with just URL', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379'
        },
    }).then(() => {
        const client = server.plugins['hapi-redis2'].client
        expect(client).toBeTruthy()
        server.stop()
    }).catch(err => {
        throw err
    })
})


test('should log configuration upon successfull connection', () => {

    const server = createServer()
    let logEntry
    server.events.once('log', (entry) => {

        logEntry = entry
    })

    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379'
        }
    }).then(() => {
        expect(logEntry).toEqual({
            channel: 'app',
            timestamp: logEntry.timestamp,
            tags: ['hapi-redis2', 'info'],
            data: 'redis connection created for {"url":"redis://localhost:6379"}'
        })
        server.stop()
    })
})

// note: a warning might be thrown
// Warning: Redis server does not require a password, but a password was supplied.
test('should log configuration with password obscurified upon successfull connection', () => {

    const server = createServer()
    let logEntry
    server.events.once('log', (entry) => {

        logEntry = entry
    })

    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379?password=secret'
        }
    }).then(() => {
        expect(logEntry).toEqual({
            channel: 'app',
            timestamp: logEntry.timestamp,
            tags: ['hapi-redis2', 'info'],
            data: 'redis connection created for {"url":"redis://localhost:6379?password=******"}'
        })
        server.stop()
    })
})

test('should be able to register plugin with URL and settings', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379',
            settings: { parser: 'javascript' }
        }
    }).then(() => {
        server.stop()
    }).catch(err => {
        expect(err).toBeTruthy()
    })
})

test('should be able to find the plugin on exposed objects', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379'
        }
    }).then(() => {
        server.route({
            method: 'GET',
            path: '/',
            handler: (request, reply) => {
                const plugin = request.server.plugins['hapi-redis2']
                expect(plugin.client).toBeTruthy()
                expect(plugin.lib).toBeTruthy()
                reply('.')
            }
        })
        server.inject({
            validate: false,
            method: 'GET',
            url: '/'
        }).then(() => {
            server.stop()
        })
    })
})

test('should be able to find the plugin on decorated objects', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379',
            decorate: true
        }
    }).then(() => {
        server.route({
            method: 'GET',
            path: '/',
            handler: (request, reply) => {
                const plugin = request.server.redis
                expect(plugin.client).toBeTruthy()
                expect(plugin.lib).toBeTruthy()
                reply('.')
            }
        })
        server.inject({
            validate: false,
            method: 'GET',
            url: '/'
        }).then(() => {
            server.stop()
        })
    })
})

test('should be able to find the plugin on custom decorated objects', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: {
            url: 'redis://localhost:6379',
            decorate: 'myRedis'
        }
    }).then(() => {
        server.route({
            method: 'GET',
            path: '/',
            handler: (request, reply) => {
                const plugin = request.server.myRedis
                expect(plugin.client).toBeTruthy()
                expect(plugin.lib).toBeTruthy()
                reply('.')
            }
        })
        server.inject({
            validate: false,
            method: 'GET',
            url: '/'
        }).then(() => {
            server.stop()
        })
    })
})

test('should be able to find the plugin on custom multiple decorated objects', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: [{
            url: 'redis://localhost:6379',
            decorate: 'myRedis1'
        }, {
            url: 'redis://localhost:6379',
            decorate: 'myRedis2'
        }]
    }).then(() => {

        server.route({
            method: 'GET',
            path: '/multiple',
            handler: (request, reply) => {
                const redis1 = request.server.myRedis1
                const redis2 = request.server.myRedis2
                expect(redis1.client).toBeTruthy()
                expect(redis1.lib).toBeTruthy()

                expect(redis2.client).toBeTruthy()
                expect(redis2.lib).toBeTruthy()
                reply('.')
            }
        })
        server.inject({
            validate: false,
            method: 'GET',
            url: '/multiple'
        }).then(() => {
            server.stop()
        })
    })
})

test('should fail to mix different decorations', () => {
    const server = createServer()
    server.register({
        plugin: require('./'),
        options: [{
            url: 'redis://localhost:6379',
            decorate: true
        }, {
            url: 'redis://localhost:6379',
            decorate: 'myRedis'
        }]
    }).catch(err => {
        expect(err).toBeTruthy()
    })
})

test('should connect to a redis instance without providing plugin settings', () => {
    const server = createServer()
    server.register({
        plugin: require('./')
    }).then(() => {
        const client = server.plugins['hapi-redis2'].client
        expect(client).toBeInstanceOf(redis.RedisClient)
        client.quit()
    })
})
