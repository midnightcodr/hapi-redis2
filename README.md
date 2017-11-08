Inspired by https://github.com/Marsup/hapi-mongodb, here's another simple
redis plugin for hapijs that supports multiple connections.


Usage example: 

```javascript
const Hapi = require('hapi')
const Boom = require('boom')

const clientOpts = {
    url: 'redis://localhost:6379',
    decorate: true
}

const server = new Hapi.Server({ port: 8080 })

server
    .register({
        plugin: require('./lib'),
        options: clientOpts
    })
    .then(() => {
        server.route({
            method: 'GET',
            path: '/redis/{val}',
            handler(request, h) {
                const client = request.redis.client

                return client
                    .setAsync('hello', request.params.val)
                    .then(() => {
                        return {
                            result: 'ok'
                        }
                    })
                    .catch(err => {
                        return Boom.internal('Internal Redis error')
                    })
            }
        })

        server.start().then(() => {
            console.log(`Server started at ${server.info.uri}`)
        })
    })
    .catch(err => {
        throw err
    })
```

Check out [lib/index.test.js](lib/index.test.js) for more usage examples.

Requirements:
    Hapi>=17
    nodejs>=8
