﻿var api = require('./api.js');
var meta = require('./metadata.js')();
var status = {
    Missing: 'MISSING',
    Queued: 'QUEUED',
    AwaitingResponse: 'AWAITING RESPONSE',
    Complete: 'COMPLETE',
    Expired: 'EXPIRED'
};

var form168 = {
    DocumentDefinitionID: '093076b1-3348-11e5-9a89-180373ea70a8'
};

var documentDefinitions = null;

api
    .query('DocumentDefinition', ['Fields'], null, null)
    .then(function (data) {
        documentDefinitions = data;
        module.exports.DocumentDefinitions = {};
        documentDefinitions.forEach(function (documentDefinition) {
            module.exports.DocumentDefinitions[documentDefinition.DocumentDefinitionID] = documentDefinition;
            if (documentDefinition.DocumentDefinitionID == form168.DocumentDefinitionID) {
                form168.DocumentDefinition = documentDefinition;
            }
        });
    });

form168.create = function (educator, applicableTenure, referenceTenure, documentData, documentDate) {
    return createDocumentInstance(form168.DocumentDefinitionID, educator, applicableTenure, referenceTenure, documentData, documentDate);
};

function createDocumentInstance(documentDefinitionID, educator, applicableTenure, referenceTenure, documentData, documentDate) {
    var ret = new meta.bo.DocumentInstance();
    var docDef = module.exports.DocumentDefinitions[documentDefinitionID];
    ret.DocumentDefinitionID = documentDefinitionID;
    ret.ApplicableTenureID = applicableTenure.TenureID;
    ret.ReferenceTenureID = referenceTenure ? referenceTenure.TenureID : null;
    ret.EducatorID = educator.EducatorID;
    ret.DocumentDate = documentDate;
    ret.Status = status.Pending;
    ret.Name = docDef.Name;
    if (referenceTenure) {
        ret.Name += ' (' + referenceTenure.Organization.Name + ')';
    }
    buildDocumentInstanceFields(module.exports.DocumentDefinitions[documentDefinitionID], ret, educator, applicableTenure, referenceTenure, documentData);
    return ret;
}

function buildDocumentInstanceFields(documentDefinition, documentInstance, educator, applicableTenure, referenceTenure, documentData) {
    var search = true;
    var documentInstanceField = null;

    if (!documentInstance.Fields) {
        documentInstance.Fields = [];
        search = false;
    }
    for (var i = 0; i < documentDefinition.Fields.length; i++) {
        var documentDefinitionField = documentDefinition.Fields[i];
        if (search) {
            documentInstanceField = findSingle(documentInstance.Fields, { DocumentDefinitionFieldID: documentDefinition.Fields[i].DocumentDefinitionFieldID });
        }
        if (!documentInstanceField) {
            documentInstanceField = {
                DocumentInstanceID: documentInstance.DocumentInstanceID,
                DocumentDefinitionFieldID: documentDefinitionField.DocumentDefinitionFieldID,
            };
            documentInstance.Fields.push(documentInstanceField);
        }
        documentInstanceField.FieldValue = getDocumentFieldValue(documentDefinitionField, educator, applicableTenure, referenceTenure, documentData);
        documentInstanceField = null;
    }
}

function getDocumentFieldValue(documentDefinitionField, educator, applicableTenure, referenceTenure, documentData) {
    if (documentDefinitionField.FieldExpression) {
        // expression can reference any of the objects passed in
        // tenures are expected to have organizations populated
        return eval(documentDefinitionField.FieldExpression);
    } else if (documentData && documentData[documentDefinitionField.DocumentDefinitionFieldID]) {
        return documentData[documentDefinitionField.DocumentDefinitionFieldID];
    } else {
        return null;
    }
}

function createDocumentStubs(documentTenure, allTenures, educator) {
    var ret = [];
    var doc = null;
    var documentDate = documentTenure.ApplicationDate || new Date();
    for (var i = 0; i < documentDefinitions.length; i++) {
        if (documentDefinitions[i].DocumentDefinitionID == form168.DocumentDefinitionID) {
            for (var j = 0; j < allTenures.length; j++) {
                if (allTenures[j].StartDate) {
                    doc = createDocumentInstance(documentDefinitions[i].DocumentDefinitionID, educator, documentTenure, allTenures[j], null, documentDate);
                    ret.push(doc);
                }
            }
        } else {
            doc = createDocumentInstance(documentDefinitions[i].DocumentDefinitionID, educator, documentTenure, null, null, documentDate);
            ret.push(doc);
        }
    }
    return ret;
}

function formatDate(d) {
    var date = (d instanceof Date) ? d : new Date(d);
    return (date.getMonth() + 1).toString() + '/' + date.getDate() + '/' + date.getFullYear();
}

function findSingle(array, propertiesToMatch) {
    var ret = undefined;
    var broken = undefined;
    for (var i = 0; i < array.length; i++) {
        broken = false;
        for (var f in propertiesToMatch) {
            if (propertiesToMatch[f]) {
                if (!array[i][f] || array[i][f] != propertiesToMatch[f]) {
                    broken = true;
                    break;
                }
            } else {
                if (array[i][f]) {
                    broken = true;
                    break;
                }
            }
        }
        if (!broken) {
            ret = array[i];
            break;
        }
    }
    return ret;
}

module.exports.Form168 = form168;
module.exports.CreateDocumentStubs = createDocumentStubs;
module.exports.Status = status;