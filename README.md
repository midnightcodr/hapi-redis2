Inspired by https://github.com/Marsup/hapi-mongodb, here's another simple
redis plugin for hapijs that supports multiple connections.

Update: Starting from version 1.0.0 this plugin only supports Hapi version 17 and above. If you are using hapijs prior to version 17, please check out version [0.9.11-a](https://github.com/midnightcodr/hapi-redis2/tree/0.9.11-a)

Usage example: 

```javascript
const Hapi = require('hapi')
const Boom = require('boom')

const launchServer = async function() {
    const clientOpts = {
        url: 'redis://localhost:6379',
        decorate: true
    }

    const server = new Hapi.Server({ port: 8080 })

    await server.register({
        plugin: require('./lib'),
        options: clientOpts
    })

    server.route({
        method: 'GET',
        path: '/redis/{val}',
        async handler(request) {
            const client = request.redis.client

            try {
                await client.setAsync('hello', request.params.val)
                return {
                    result: 'ok'
                }
            } catch (err) {
                throw Boom.internal('Internal Redis error')
            }
        }
    })

    await server.start()
    console.log(`Server started at ${server.info.uri}`)
}

launchServer().catch(err => {
    console.error(err)
    process.exit(1)
})
   
```

Check out [lib/index.test.js](lib/index.test.js) for more usage examples.

Requirements:

    Hapi>=17

    nodejs>=8
