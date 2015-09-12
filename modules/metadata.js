"use strict"

// logger
var log = require('./logging.js')('metadata');
var sqlLog = require('./logging.js')('sql');
var collections = require('./collections.js');

// parse connection info from the DATABASE_URL environment variable 
// postgres://user:pass@host:port/database
if (!process.env.DATABASE_URL) {
    throw new Error('No DATABASE_URL environment variable defined');
}
var parsed = process.env.DATABASE_URL.match(/^postgres:\/\/(\w+?):(\w+?)@(.+?):(\d+?)\/(\w+?)$/);
if (parsed.length < 6) {
    throw new Error('Failed to parse DATABASE_URL environment variable');
}
var sequelizeOptions = { host: parsed[3], port: parsed[4], dialect: 'postgres', define: { timestamps: false, underscored: true }, logging: function (msg) { sqlLog.info(msg); } };


// sequelize ORM
var Sequelize = require('sequelize')
var sequelize = new Sequelize(parsed[5], parsed[1], parsed[2], sequelizeOptions);

// file system access
var fs = require('fs');

// update the database to match our metadata
// sequelize.sync({ force: true });

module.exports = function (metadataFolder) {
    log.info('setting up database');
    var ret = 
 {
        Sequelize: sequelize,
        db: {},
        Metadata: {},
        bo: {}
    };
    var metadataPath = metadataFolder || 'metadata';
    var metadataFiles = fs.readdirSync(metadataPath);
    for (var i = 0; i < metadataFiles.length; i++) {
        log.debug('processing metadata file ' + metadataFiles[i]);
        DbDefine(sequelize, ret.db, ret.Metadata, fs, metadataPath + '/' + metadataFiles[i]);
    }
    log.debug('setting up relationships');
    SetupRelationships(ret.db, ret.Metadata);
    SetupClasses(ret.Metadata, ret.bo);
    return ret;
};

// ====================================================================================================================================================

function DbDefine(sequelize, dbDictionary, metadataDictionary, fs, filePath) {
    var content = fs.readFileSync(filePath, "utf8");
    var metadata = null;
    try {
        metadata = JSON.parse(content.trim());
    } catch (err) {
        throw new Error('Error parsing ' + filePath + ': ' + err);
    }
    metadata.PrimaryKeyFields = [];
    for (var f in metadata.FieldDefinitions) {
        if (metadata.FieldDefinitions[f].type == 'STRING' && metadata.FieldDefinitions[f].maximumStringLength) {
            metadata.FieldDefinitions[f].type = Sequelize.STRING(metadata.FieldDefinitions[f].maximumStringLength);
        } else {
            metadata.FieldDefinitions[f].type = Sequelize[metadata.FieldDefinitions[f].type]();
        }
        if (metadata.FieldDefinitions[f].defaultValue === "NOW") {
            metadata.FieldDefinitions[f].defaultValue = sequelize.fn(sequelizeOptions.dialect === 'postgres' ? 'NOW' : 'CURRENT_TIMESTAMP');
        }
        if (metadata.FieldDefinitions[f].primaryKey) {
            metadata.PrimaryKeyFields.push(f);
        }
    }
    metadataDictionary[metadata.TypeKey] = metadata;
    dbDictionary[metadata.TypeKey] = sequelize.define(metadata.TypeKey, metadata.FieldDefinitions, { tableName: metadata.TableName });
}

function SetupRelationships(dbDictionary, metadataDictionary) {
    for (var typeKey in metadataDictionary) {
        var sequelizeModel = dbDictionary[typeKey];
        for (var rel in metadataDictionary[typeKey].Relationships) {
            var relationship = metadataDictionary[typeKey].Relationships[rel];
            var opts = { as: rel };
            if (relationship.Through) {
                opts['through'] = relationship.Through;
            }
            if (relationship.ForeignKey) {
                var foreignKeyMetadata = 
                    relationship.RelationshipType == 'belongsToMany' 
                    || 
                    relationship.RelationshipType == 'belongsTo' 
                    ?
                    metadataDictionary[typeKey] 
                    : 
                    metadataDictionary[relationship.RelatedTypeKey];
                var foreignKeyField = collections.findSingle(foreignKeyMetadata.FieldDefinitions, { field: relationship.ForeignKey });
                if (foreignKeyField) {
                    opts.foreignKey = foreignKeyField;
                } else {
                    opts.foreignKey = relationship.ForeignKey;
                }
            }
            if (relationship.TargetKey) {
                opts['targetKey'] = relationship.TargetKey;
            }
            if (relationship.RelationshipType == 'hasMany') {
                log.debug(typeKey + ' hasMany ' + relationship.RelatedTypeKey);
                sequelizeModel.hasMany(dbDictionary[relationship.RelatedTypeKey], opts);
            } else if (relationship.RelationshipType == 'belongsToMany') {
                log.debug(typeKey + ' belongsToMany ' + relationship.RelatedTypeKey);
                sequelizeModel.belongsToMany(dbDictionary[relationship.RelatedTypeKey], opts);
            } else if (relationship.RelationshipType == 'hasOne') {
                log.debug(typeKey + ' hasOne ' + relationship.RelatedTypeKey);
                sequelizeModel.hasOne(dbDictionary[relationship.RelatedTypeKey], opts);
            } else if (relationship.RelationshipType == 'belongsTo') {
                log.debug(typeKey + ' belongsTo ' + relationship.RelatedTypeKey);
                sequelizeModel.belongsTo(dbDictionary[relationship.RelatedTypeKey], opts);
            } else {
                throw 'Unrecognized RelationshipType: "' + relationship.RelationshipType + '"';
            }
        }
    }
}

function SetupClasses(metadataDictionary, boFunctionDictionary) {
    for (var typeKey in metadataDictionary) {
        boFunctionDictionary[typeKey] = createClassConstructor(typeKey);
    }
}

function createClassConstructor(typeKey) {
    return function () {
        this._TypeKey = typeKey;
    };
}