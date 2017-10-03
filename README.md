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

const server = new Hapi.Server()
server.connection({ port: 8000 })

server.register({
    register: require('./lib'),
    options: clientOpts
}, function (err) {
    if (err) {
        console.error(err)
        throw err
    }

    server.route({
        method: 'GET',
        path: '/redis/{val}',
        handler(request, reply) {
            const client = request.redis.client

            client.set('hello', request.params.val, (err) => {
                if (err) {
                    console.log(err)
                    return reply(Boom.internal('Internal Redis error'))
                }
                reply({
                    result: 'ok'
                })
            })
        }
    })

    server.start(function () {
        console.log(`Server started at ${server.info.uri}`)
    })
})
```

Check out [lib/index.test.js](midnightcodr/hapi-redis2/blob/master/lib/index.test.js) for more usage examples.
