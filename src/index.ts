import * as neo4j from 'neo4j-driver';

import {Factory} from './Factory';
import {Model} from './Model';
import {ModelMap} from './ModelMap';
import {Schema} from './Schema';
import {TransactionError} from './TransactionError';
import {Builder} from './Query/Builder';
import {Collection} from './Collection';
import {Node} from "./Node";
import {SchemaObject, TransactionWithCleanup} from "./Types";
import QueryRunner from "neo4j-driver/types/query-runner";

export class Neode {

    private driver: neo4j.Driver;
    public models: ModelMap;
    private schema: Schema;
    private factory: Factory;
    private database: string | undefined;
    /**
     * Constructor
     *
     * @param  {String} connection_string
     * @param  {String} username
     * @param  {String} password
     * @param  {Bool}   enterprise
     * @param  {String} database
     * @param  {Object} config
     * @return {Neode}
     */
    constructor(connection_string, username, password, enterprise = false, database = undefined, config = {}) {
        const auth = neo4j.auth.basic(username, password);
        this.driver = neo4j.driver(connection_string, auth, config);
        this.models = new ModelMap(this);
        this.schema = new Schema(this);
        this.factory = new Factory(this);

        this.database = database;

        this.setEnterprise(enterprise);
    }
    //
    // /**
    //  * @static
    //  * Generate Neode instance using .env configuration
    //  *
    //  * @return {Neode}
    //  */
    // static fromEnv() {
    //     require('dotenv').config();
    //
    //     const connection_string = `${process.env.NEO4J_PROTOCOL}://${process.env.NEO4J_HOST}:${process.env.NEO4J_PORT}`;
    //     const username = process.env.NEO4J_USERNAME;
    //     const password = process.env.NEO4J_PASSWORD;
    //     const enterprise = process.env.NEO4J_ENTERPRISE === 'true';
    //
    //     // Multi-database
    //     const database = process.env.NEO4J_DATABASE || 'neo4j';
    //
    //     // Build additional config
    //     const config = {};
    //
    //     const settings = {
    //         NEO4J_ENCRYPTION: 'encrypted',
    //         NEO4J_TRUST: 'trust',
    //         NEO4J_TRUSTED_CERTIFICATES: 'trustedCertificates',
    //         NEO4J_KNOWN_HOSTS: 'knownHosts',
    //
    //         NEO4J_MAX_CONNECTION_POOLSIZE: 'maxConnectionPoolSize',
    //         NEO4J_MAX_TRANSACTION_RETRY_TIME: 'maxTransactionRetryTime',
    //         NEO4J_LOAD_BALANCING_STRATEGY: 'loadBalancingStrategy',
    //         NEO4J_MAX_CONNECTION_LIFETIME: 'maxConnectionLifetime',
    //         NEO4J_CONNECTION_TIMEOUT: 'connectionTimeout',
    //         NEO4J_DISABLE_LOSSLESS_INTEGERS: 'disableLosslessIntegers',
    //         NEO4J_LOGGING_LEVEL: 'logging',
    //     };
    //
    //     Object.keys(settings).forEach(setting => {
    //         if ( process.env.hasOwnProperty(setting) ) {
    //             const key = settings[ setting ];
    //             let value = process.env[ setting ];
    //
    //             if ( key == "trustedCertificates" ) {
    //                 value = value.split(',');
    //             }
    //             else if ( key == "disableLosslessIntegers" ) {
    //                 value = value === 'true';
    //             }
    //
    //             config[ key ] = value;
    //         }
    //     });
    //
    //     return new Neode(connection_string, username, password, enterprise, database, config);
    // }

    /**
     * Define multiple models
     *
     * @param  {Object} models   Map of models with their schema.  ie {Movie: {...}}
     * @return {Neode}
     */
    with(models) {
        Object.keys(models).forEach(model => {
            this.model(model, models[ model ]);
        });

        return this;
    }

    // /**
    //  * Scan a directory for Models
    //  *
    //  * @param  {String} directory   Directory to scan
    //  * @return {Neode}
    //  */
    // withDirectory(directory) {
    //     const files = fs.readdirSync(directory);
    //
    //     files.filter(file => path.extname(file).toLowerCase() === '.js')
    //         .forEach(file => {
    //             const model = file.replace('.js', '');
    //             const path = directory +'/'+ file;
    //             const schema = require("" + path);
    //
    //             return this.model(model, schema);
    //         });
    //
    //     return this;
    // }

    /**
     * Set the default database for all future connections
     *
     * @param {String} database
     */
    setDatabase(database) {
        this.database = database;
    }

    /**
     * Set Enterprise Mode
     *
     * @param {Bool} enterprise
     */
    setEnterprise(enterprise) {
        this.enterprise = enterprise;
    }

    /**
     * Are we running in enterprise mode?
     *
     * @return {Bool}
     */
    enterprise() {
        return this.enterprise;
    }

    /**
     * Define a new Model
     *
     * @param  {String} name
     * @param  {Object} schema
     * @return {Model}
     */
    model(name: string, schema?: SchemaObject) {
        if (schema && schema instanceof Object) {
            const model = new Model(this, name, schema);
            this.models.set(name, model);
        }

        if ( !this.models.has(name) ) {
            const defined = this.models.keys();

            let message = `Couldn't find a definition for "${name}".`;

            if ( defined.length == 0 ) {
                message += ' It looks like no models have been defined.';
            }
            else {
                message += ` The models currently defined are [${ defined.join(', ') }]`;
            }

            throw new Error(message);
        }

        return this.models.get(name);
    }

    /**
     * Extend a model with extra configuration
     *
     * @param  {String} model   Original Model to clone
     * @param  {String} as     New Model name
     * @param  {Object} using  Schema changes
     * @return {Model}
     */
    extend(model: string, as: string, using: SchemaObject): Model {
        return this.models.extend(model, as, using);
    }

    /**
     * Create a new Node of a type
     *
     * @param  {String} model
     * @param  {Object} properties
     * @return {Node}
     */
    create<T>(model: string, properties: Record<string, string>): Promise<Node<T>> {
        return this.models.get(model).create(properties);
    }

    /**
     * Merge a node based on the defined indexes
     *
     * @param  {Object} properties
     * @return {Promise}
     */
    merge(model:string, properties: Record<string, string>) {
        return this.model(model).merge(properties);
    }

    /**
     * Merge a node based on the supplied properties
     *
     * @param  {Object} match Specific properties to merge on
     * @param  {Object} set   Properties to set
     * @return {Promise}
     */
    mergeOn(model:string, match: Record<string, string>, set: Record<string, string>) {
        return this.model(model).mergeOn(match, set);
    }

    /**
     * Delete a Node from the graph
     *
     * @param  {Node} node
     * @return {Promise}
     */
    delete(node:Node) {
        return node.delete();
    }

    /**
     * Delete all node labels
     *
     * @param  {String} label
     * @return {Promise}
     */
    deleteAll(model:string) {
        return this.models.get(model).deleteAll();
    }

    /**
     * Relate two nodes based on the type
     *
     * @param  {Node}   from        Origin node
     * @param  {Node}   to          Target node
     * @param  {String} type        Type of Relationship definition
     * @param  {Object} properties  Properties to set against the relationships
     * @param  {Boolean} force_create   Force the creation a new relationship? If false, the relationship will be merged
     * @return {Promise}
     */
    relate(from, to, type, properties, force_create = false) {
        return from.relateTo(to, type, properties, force_create);
    }

    /**
     * Run an explicitly defined Read query
     *
     * @param  {String} query
     * @param  {Object} params
     * @return {Promise}
     */
    readCypher(query, params) {
        const session = this.readSession();

        return this.cypher(query, params, session);
    }

    /**
     * Run an explicitly defined Write query
     *
     * @param  {String} query
     * @param  {Object} params
     * @return {Promise}
     */
    writeCypher(query, params) {
        const session = this.writeSession();

        return this.cypher(query, params, session);
    }

    /**
     * Run a Cypher query
     *
     * @param  {String} query
     * @param  {Object} params
     * @return {Promise}
     */
    cypher(query, params, session:neo4j.Session) {
        // If single run, open a new session
        const single = !session;
        if ( single ) {
            session = this.session();
        }

        return session.run(query, params)
            .then(res => {
                if ( single ) {
                    session.close();
                }

                return res;
            })
            .catch(err => {
                if ( single ) {
                    session.close();
                }

                err.query = query;
                err.params = params;

                throw err;
            });
    }

    /**
     * Create a new Session in the Neo4j Driver.
     *
     * @param {String} database
     * @return {Session}
     */
    session(database = this.database) {
        return this.readSession(database);
    }

    /**
     * Create an explicit Read Session
     *
     * @param {String} database
     * @return {Session}
     */
    readSession(database = this.database) {
        return this.driver.session({
            database,
            defaultAccessMode: neo4j.session.READ,
        });
    }

    /**
     * Create an explicit Write Session
     *
     * @param {String} database
     * @return {Session}
     */
    writeSession(database = this.database) {
        return this.driver.session({
            database,
            defaultAccessMode: neo4j.session.WRITE,
        });
    }

    /**
     * Create a new Transaction
     *
     * @return {Transaction}
     */
    transaction(mode: 'WRITE' | 'READ' = 'WRITE', database = this.database):TransactionWithCleanup {
        const session = this.driver.session({database, defaultAccessMode: mode});
        const tx: TransactionWithCleanup = session.beginTransaction() as any;

        // Create an 'end' function to commit & close the session
        // TODO: Clean up
        tx.success = () => {
            return tx.commit()
                .then(() => {
                    session.close();
                });
        };

        return tx;
    }

    /**
     * Run a batch of queries within a transaction
     *
     * @type {Array}
     * @return {Promise}
     */
    batch(queries: any) {
        const tx = this.transaction();
        const output: any[] = [];
        const errors: any[] = [];

        return Promise.all(queries.map(query => {
            const params: Record<string, string> = typeof query == 'object' ? query.params : {};
            query = typeof query == 'object' ? query.query : query;

            try {
                return tx.run(query, params)
                    .then(res => {
                        output.push(res);
                    })
                    .catch(error => {
                        errors.push({query, params, error});
                    });
            }
            catch (error) {
                errors.push({query, params, error});
            }
        }))
            .then(() => {
                if (errors.length) {
                    tx.rollback();

                    const error = new TransactionError(errors);

                    throw error;
                }

                return tx.success()
                    .then(() => {
                        return output;
                    });
            });
    }

    /**
     * Close Driver
     *
     * @return {void}
     */
    close() {
        this.driver.close();
    }

    /**
     * Return a new Query Builder
     *
     * @return {Builder}
     */
    query() {
        return new Builder(this);
    }

    /**
     * Get a collection of nodes`
     *
     * @param  {String}              label
     * @param  {Object}              properties
     * @param  {String|Array|Object} order
     * @param  {Int}                 limit
     * @param  {Int}                 skip
     * @return {Promise}
     */
    all(label, properties, order, limit, skip) {
        return this.models.get(label).all(properties, order, limit, skip);
    }

    /**
     * Find a Node by it's label and primary key
     *
     * @param  {String} label
     * @param  {mixed}  id
     * @return {Promise}
     */
    find(label, id) {
        return this.models.get(label).find(id);
    }

    /**
     * Find a Node by it's internal node ID
     *
     * @param  {String} model
     * @param  {int}    id
     * @return {Promise}
     */
    findById(label, id) {
        return this.models.get(label).findById(id);
    }

    /**
     * Find a Node by properties
     *
     * @param  {String} label
     * @param  {mixed}  key     Either a string for the property name or an object of values
     * @param  {mixed}  value   Value
     * @return {Promise}
     */
    first(label, key, value) {
        return this.models.get(label).first(key, value);
    }

    /**
     * Hydrate a set of nodes and return a Collection
     *
     * @param  {Object}          res            Neo4j result set
     * @param  {String}          alias          Alias of node to pluck
     * @param  {Definition|null} definition     Force Definition
     * @return {Collection}
     */
    hydrate(res, alias, definition) {
        return this.factory.hydrate(res, alias, definition);
    }

    /**
     * Hydrate the first record in a result set
     *
     * @param  {Object} res    Neo4j Result
     * @param  {String} alias  Alias of Node to pluck
     * @return {Node}
     */
    hydrateFirst(res, alias, definition) {
        return this.factory.hydrateFirst(res, alias, definition);
    }

    /**
     * Turn an array into a Collection
     *
     * @param  {Array} array An array
     * @return {Collection}
     */
    toCollection(array) {
        return new Collection(this, array);
    }

}

module.exports = Neode;