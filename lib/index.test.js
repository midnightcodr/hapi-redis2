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
		register: require('./'),
		options: {
			urll: 'redis://localhost:6379'
		},
	}, (err) => {
		expect(err).toBeTruthy()
	})
})

test('should reject invalid decorate', () => {
	const server = createServer()
	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379',
			decorate: 1
		},
	}, (err) => {
		expect(err).toBeTruthy()
	})
})

test('should be able to register plugin with just URL', () => {
	const server = createServer()
	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379'
		},
	}, () => {
		const client = server.plugins['hapi-redis2'].client
		expect(client).toBeTruthy()
		client.quit()
	})
})


test('should log configuration upon successfull connection', () => {

	const server = createServer()
	let logEntry;
	server.once('log', (entry) => {

		logEntry = entry;
	});

	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379'
		}
	}, (err) => {

		if (err)  {
			throw err
		}
		expect(logEntry).toEqual({
			timestamp: logEntry.timestamp,
			tags: ['hapi-redis2', 'info'],
			data: 'redis connection created for {"url":"redis://localhost:6379"}',
			internal: false
		});
		server.plugins['hapi-redis2'].client.quit()
	});
});

// note: a warning might be thrown
// Warning: Redis server does not require a password, but a password was supplied.
test('should log configuration with password obscurified upon successfull connection', () => {

	const server = createServer()
	let logEntry;
	server.once('log', (entry) => {

		logEntry = entry;
	});

	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379?password=secret'
		}
	}, (err) => {

		if (err)  {
			throw err
		}
		expect(logEntry).toEqual({
			timestamp: logEntry.timestamp,
			tags: ['hapi-redis2', 'info'],
			data: 'redis connection created for {"url":"redis://localhost:6379?password=******"}',
			internal: false
		});
		server.plugins['hapi-redis2'].client.quit()
	});
});

test('should be able to register plugin with URL and settings', () => {
	const server = createServer()
	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379',
			settings: {parser: 'javascript'}
		}
	}, (err) => {
		expect(err).not.toBeTruthy()
		server.plugins['hapi-redis2'].client.quit()
	})
})

test('should be able to find the plugin on exposed objects', () => {
	const server = createServer()
	server.connection({port: 8881})
	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379'
		}
	}, (err) => {
		expect(err).not.toBeTruthy()

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
		}, () => {
			server.stop()
		})
	})
})

test('should be able to find the plugin on decorated objects', () => {
	const server = createServer()
	server.connection({port: 8882})
	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379',
			decorate: true
		}
	}, (err) => {
		expect(err).not.toBeTruthy()

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
		}, () => {
			server.stop()
		})
	})
})

test('should be able to find the plugin on custom decorated objects', () => {
	const server = createServer()
	server.connection({port: 8882})
	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379',
			decorate: 'myRedis'
		}
	}, (err) => {
		expect(err).not.toBeTruthy()

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
		}, () => {
			server.stop()
		})
	})
})

test('should be able to find the plugin on custom multiple decorated objects', () => {
	const server = createServer()
	server.connection({port: 8882})
	server.register({
		register: require('./'),
		options: [{
			url: 'redis://localhost:6379',
			decorate: 'myRedis1'
		}, {
			url: 'redis://localhost:6379',
			decorate: 'myRedis2'
		}]
	}, (err) => {
		expect(err).not.toBeTruthy()

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
		}, () => {
			server.myRedis1.client.quit()
			server.myRedis2.client.quit()
		})
	})
})

test('should fail to mix different decorations', () => {
	const server = createServer()
	server.register({
		register: require('./'),
		options: [{
			url: 'redis://localhost:6379',
			decorate: true
		}, {
			url: 'redis://localhost:6379',
			decorate: 'myRedis'
		}]
	}, (err) => {
		expect(err).toBeTruthy()
		server.stop()
	})
})

test('should connect to a redis instance without providing plugin settings', () => {
	const server = createServer()
	server.register({
		register: require('./')
	}, (err) => {
		expect(err).not.toBeTruthy()
		const client = server.plugins['hapi-redis2'].client
		expect(client).toBeInstanceOf(redis.RedisClient)
		client.quit()
	})
})
