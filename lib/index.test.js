'use strict'
const Hapi = require('hapi')
let server

beforeEach(() => {
	server = new Hapi.Server()
})

test('should reject invalid options', () => {
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

// not working
// test('should fail with wrong redis port', () => {
// 	server.register({
// 		register: require('./'),
// 		options: {
// 			url: 'redis://localhost:7379'
// 		},
// 	}, (err) => {
// 		expect(err).toBeTruthy()
// 	})
// })

test('should be able to register plugin with just URL', () => {
	server.register({
		register: require('./'),
		options: {
			url: 'redis://localhost:6379'
		},
	}, () => {
	})
})
