"use strict"

// logger
var log = require('./logging.js')('metadata');
var sqlLog = require('./logging.js')('sql');

// sequelize ORM
var Sequelize = require('sequelize');
var sequelize = new Sequelize('safedb', 'readwrite', 'readwrite', { define: { timestamps: false, underscored: true  }, logging: function (msg) { sqlLog.info(msg); } });

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
    log.debug('setting up relationsips');
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
        metadata.FieldDefinitions[f].type = Sequelize[metadata.FieldDefinitions[f].type]();
        if (metadata.FieldDefinitions[f].defaultValue === "NOW") {
            metadata.FieldDefinitions[f].defaultValue = sequelize.fn('CURRENT_TIMESTAMP');
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
                opts['foreignKey'] = relationship.ForeignKey;
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
        boFunctionDictionary[typeKey] = function () {
            this._TypeKey = typeKey;
        };
    }
}