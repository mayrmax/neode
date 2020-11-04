import {Entity} from './Entity';
import UpdateRelationship from './Services/UpdateRelationship';
import DeleteRelationship from './Services/DeleteRelationship';
import {DIRECTION_IN, RelationshipType,} from './RelationshipType';
import {Neode} from "./index";
import {Integer} from "neo4j-driver";
import * as neo4j from "neo4j-driver";

import {Node} from "./Node";
import {Property} from "./Property";

export class Relationship extends Entity {

    private _type: any;
    private _start: Node;
    private _end: Node;
    private _node_alias: string | undefined;

    /**
     *
     * @param {Neode}            neode          Neode instance
     * @param {RelationshipType} definition     Relationship type definition
     * @param {Integer}          identity       Identity
     * @param {String}           relationshipName   Relationship type
     * @param {Map}              properties     Map of properties for the relationship
     * @param {Node}             start          Start Node
     * @param {Node}             end            End Node
     * @param {String}           node_alias     Alias given to the Node when converting to JSON
     */
    constructor(neode:Neode, definition: RelationshipType, identity: Integer, relationshipName: string, properties: Map<string, Property>, start: Node, end: Node, node_alias?:string) {
        super();

        this._neode = neode;
        this._definition = definition;
        this._identity = identity;
        this._type = relationshipName;
        this._properties = properties || new Map;
        this._start = start;
        this._end = end;
        this._node_alias = node_alias;
    }

    /**
     * Get the definition for this relationship
     *
     * @return {Definition}
     */
    definition() {
        return this._definition;
    }

    /**
     * Get the relationship type
     */
    type() {
        return this._type;
    }

    /**
     * Get the start node for this relationship
     *
     * @return {Node}
     */
    startNode() {
        return this._start;
    }

    /**
     * Get the start node for this relationship
     *
     * @return {Node}
     */
    endNode() {
        return this._end;
    }

    /**
     * Get the node on the opposite end of the Relationship to the subject
     * (ie if direction is in, get the end node, otherwise get the start node)
     */
    otherNode() {
        return this._definition.direction() == DIRECTION_IN
            ? this.startNode()
            : this.endNode();
    }

    /**
     * Convert Relationship to a JSON friendly Object
     *
     * @return {Promise}
     */
    toJson() {
        const output = {
            _id: this.id(),
            _type: this.type(),
        };

        const definition = this.definition();

        // Properties
        definition.properties().forEach((property, key) => {
            if ( property.hidden() ) {
                return;
            }

            if ( this._properties.has(key) ) {
                output[ key ] = this.valueToJson(property, this._properties.get( key ));
            }
        });

        // Get Other Node
        return this.otherNode().toJson()
            .then(json => {
                output[ definition.nodeAlias() ] = json;

                return output;
            });
    }

    /**
     * Update the properties for this relationship
     *
     * @param {Object} properties  New properties
     * @return {Node}
     */
    update(properties) {
        // TODO: Temporary fix, add the properties to the properties map
        // Sorry, but it's easier than hacking the validator
        this._definition.properties().forEach(property => {
            const name = property.name();

            if ( property.required() && !properties.hasOwnProperty(name) ) {
                properties[ name ] = this._properties.get( name );
            }
        });

        return UpdateRelationship(this._neode, this._definition, this._identity, properties)
            .then((properties: object) => {
                Object.entries(properties).forEach(( [key, value] ) => {
                    this._properties.set( key, value );
                });
            })
            .then(() => {
                return this;
            });
    }

    /**
     * Delete this relationship from the Graph
     *
     * @return {Promise}
     */
    delete() {
        return DeleteRelationship(this._neode, this._identity)
            .then(() => {
                this._deleted = true;

                return this;
            });
    }
}
