'user strict'

const Redis = require('redis')
const Joi = require('joi')
const Async = require('async')

// initializing redis client using url format:
// [redis:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]
// provide other redis client settings via key settings
const singleOption = Joi.object({
    url: Joi.string().default('redis://localhost:6379'),
    settings: Joi.object(),
    decorate: [true, Joi.string()]
})

const optionsSchema = Joi.array().items(singleOption).min(1).single()

exports.register = (server, pluginOptions, next) => {
    optionsSchema.validate(pluginOptions, (err, options) => {
        if(err) {
            return next(err)
        }

        const decorationTypes = new Set(options.map((option) => typeof option.decorate))
        if (decorationTypes.size > 1) {
            return next(new Error('You cannot mix different types of decorate options'))
        }

        const expose = {
            lib: Redis
        }

        const connect = (connectionOptions, done) => {
            const client = Redis.createClient(Object.assign({
                url: connectionOptions.url,
            }, connectionOptions.settings))

            const connectionOptionsToLog = Object.assign({}, connectionOptions, {
                url: connectionOptions.url.replace(/\?password=(.+)/, '?password=******')
            })
            server.log(['hapi-redis2', 'info'], 'redis connection created for ' + JSON.stringify(connectionOptionsToLog))
            if(typeof connectionOptions.decorate === 'string') {
                const decoration = Object.assign({ client }, expose)
                server.decorate('server', connectionOptions.decorate, decoration)
                server.decorate('request', connectionOptions.decorate, decoration)
            }
            done(null, client)
        }

        Async.map(options, connect, (err, clients) => {

            if (err) {
                server.log(['hapi-redis2', 'error'], err)
                return next(err)
            }

            expose.client = options.length === 1 ? clients[0] : clients

            if (decorationTypes.has('boolean')) {
                server.decorate('server', 'redis', expose)
                server.decorate('request', 'redis', expose)
            }
            else if (decorationTypes.has('undefined')) {
                Object.keys(expose).forEach((key) => {

                    server.expose(key, expose[key])
                })
            }

            server.on('stop', () => {

                [].concat(expose.client).forEach((client) => {

                    try {
                        server.log(['hapi-redis2', 'info'], 'closing redis connection for ' + client.options.url.replace(/\?password=(.+)/, '?password=******'))
                        client.quit()
                    } catch(err) {
                        server.log(['hapi-redis2', 'error'], err)

                    }
                })
            })

            next()
        })
    })
}
exports.register.attributes = {
    pkg: require('../package.json')
}
