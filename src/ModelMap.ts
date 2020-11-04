import {Model} from './Model';
import {Neode} from "./index";
import {SchemaObject} from "./Types";

export class ModelMap {
    private _neode: Neode;
    private models: Map<string, Model>;
    /**
     * @constuctor
     *
     * @param {Neode} neode
     */
    constructor(neode) {
        this._neode = neode;
        this.models = new Map();
    }

    /**
     * Check if a model has been defined
     *
     * @param  {String} key
     * @return {bool}
     */
    has(key) {
        return this.models.has(key);
    }

    /**
     * Namesof the models defined.
     *
     * @return {Array<String>}
     */
    keys() {
        return [...this.models.keys() ];
    }

    /**
     * Getter
     *
     * @param  {String}
     * @return {Model|false}
     */
    get(key): Model {
        return this.models.get(key) as Model;
    }

    /**
     * Setter
     *
     * @param  {String} key
     * @param  {Model}  value
     * @return {ModelMap}
     */
    set(key, value) {
        this.models.set(key, value);

        return this;
    }

    /**
     * Run a forEach function on the models
     *
     * @param  {Function}
     * @return {void}
     */
    forEach(fn) {
        return this.models.forEach(fn);
    }

    /**
     * Get the definition for an array labels
     *
     * @param  {Array} labels
     * @return {Definition}
     */
    getByLabels(labels: string[]): Model {
        if ( !Array.isArray(labels) ) {
            labels = [ labels ];
        }

        for (let entry of this.models) {
            const [ name, definition ] = entry;

            if ( definition.labels().sort().join(':') == labels.sort().join(':') ) {
                return definition;
            }
        }

        throw new Error('Model not found');
    }

    /**
     * Extend a model with extra configuration
     *
     * @param  {String} name   Original Model to clone
     * @param  {String} as     New Model name
     * @param  {Object} using  Schema changes
     * @return {Model}
     */
    extend(name:string, as: string, using: SchemaObject) {
        // Get Original Model
        const original = this.models.get(name);
        if (!original) throw new Error('Model not found');

        // Add new Labels
        const labels = original.labels().slice(0);
        labels.push(as);
        labels.sort();

        // Merge Schema
        const schema = Object.assign({}, original.schema(), using);

        // Create and set
        const model = new Model(this._neode, as, schema);

        model.setLabels(...labels);

        this.models.set(as, model);

        return model;
    }

}