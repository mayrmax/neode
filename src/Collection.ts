import {Node} from "./Node";
import {Neode} from "./index";

export class Collection<T = any> {

    private _neode: Neode;
    private _values: Node<T>[];

    /**
     * @constructor
     * @param  {Neode} neode    Neode Instance
     * @param  {Node[]} values  Array of Node
     * @return {Collection}
     */
    constructor(neode: Neode, values: Node<T>[]) {
        this._neode = neode;
        this._values = values || [];
    }

    /**
     * Get length property
     *
     * @return {Int}
     */
    get length() {
        return this._values.length;
    }

    /**
     * Iterator
     */
    [Symbol.iterator](): IterableIterator<Node<T>> {
        return this._values.values();
    }


    /**
     * Get a value by it's index
     *
     * @param  {Int} index
     * @return {Node}
     */
    get(index):Node<T> {
        return this._values[index];
    }

    /**
     * Get the first Node in the Collection
     *
     * @return {Node}
     */
    first():Node<T> {
        return this._values[0];
    }

    /**
     * Map a function to all values
     *
     * @param  {Function} fn
     * @return {mixed}
     */
    map<T, K>(fn: (node:Node<T>) => K):K[] {
        return this._values.map(fn);
    }

    /**
     * Find value in collection
     *
     * @param  {Function} fn
     * @return {mixed}
     */
    find(fn):Node<T>|undefined {
        return this._values.find(fn);
    }

    /**
     * Run a function on all values
     * @param  {Function} fn
     * @return {mixed}
     */
    forEach(fn):void {
        return this._values.forEach(fn);
    }

    /**
     * Map the 'toJson' function on all values
     *
     * @return {Promise}
     */
    toJson():Promise<any> {
        return Promise.all(this._values.map(value => {
            return value.toJson();
        }));
    }
}
