'user strict'

const Redis = require('ioredis')
const Joi = require('joi')

// settings: initializing redis client using url format
//     [redis:]//[[user][:password@]][host][:port][/db-number]
//     or object, see https://github.com/luin/ioredis for details
//
// decorate: string or boolean, mixed use of different types of decorate settings are not allowed.
const singleOption = Joi.object({
    settings: [
        null,
        Joi.string()
            .uri({ scheme: ['redis'] })
            .default('redis://localhost:6379'),
        Joi.object()
    ],
    decorate: [true, Joi.string()]
})

const optionsSchema = Joi.array()
    .items(singleOption)
    .min(1)
    .single()

async function register(server, pluginOptions) {
    let options
    try {
        options = await optionsSchema.validate(pluginOptions)
    } catch (err) {
        throw err
    }

    const decorationTypes = new Set(
        options.map(option => typeof option.decorate)
    )
    if (decorationTypes.size > 1) {
        throw new Error('You cannot mix different types of decorate options')
    }

    const expose = {
        lib: Redis
    }

    async function connect(connectionOptions) {
        const client =
            connectionOptions.settings === null
                ? new Redis()
                : new Redis(connectionOptions.settings)

        const { host, port, db } = client.options
        server.log(
            ['hapi-redis2', 'info'],
            `redis connection created for redis://${host}:${port}/${db}`
        )
        if (typeof connectionOptions.decorate === 'string') {
            const decoration = Object.assign({ client }, expose)
            server.decorate('server', connectionOptions.decorate, decoration)
            server.decorate('request', connectionOptions.decorate, decoration)
        }
        return client
    }

    let clients = []
    try {
        clients = await Promise.all(options.map(connect))
    } catch (err) {
        server.log(['hapi-redis2', 'error'], err)
        throw err
    }

    expose.client = options.length === 1 ? clients[0] : clients

    if (decorationTypes.has('boolean')) {
        server.decorate('server', 'redis', expose)
        server.decorate('request', 'redis', expose)
    } else if (decorationTypes.has('undefined')) {
        Object.keys(expose).forEach(key => {
            server.expose(key, expose[key])
        })
    }

    server.events.on('stop', () => {
        [].concat(expose.client).forEach(client => {
            const { host, port, db } = client.options
            server.log(
                ['hapi-redis2', 'info'],
                'redis connection created for ' +
                    `redis://${host}:${port}/${db}`
            )
            try {
                server.log(
                    ['hapi-redis2', 'info'],
                    `closing redis connection for redis://${host}:${port}/${db}`
                )
                client.quit()
            } catch (err) {
                server.log(['hapi-redis2', 'error'], err)
            }
        })
    })
}
exports.plugin = {
    register: register,
    pkg: require('../package.json')
}
