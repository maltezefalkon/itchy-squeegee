var api = require('./api.js');
var meta = require('./metadata.js')();

var documentDefinitionID = '093076b1-3348-11e5-9a89-180373ea70a8';
var documentDefinition = api.query('DocumentDefinition', 'Fields', { DocumentDefinitionID: documentDefinitionID });

module.exports.DocumentDefinitionID = documentDefinitionID;
module.exports.DocumentDefinition = documentDefinition;

moudle.exports.create = function (applicableTenureID, referenceTenureID) {
    var ret = meta.bo.DocumentInstance();
    ret.DocumentDefinitionID = documentDefinitionID;
    ret.ApplicableTenureID = applicableTenureID;
    ret.ReferenceTenureID = referenceTenureID;
    buildDocumentInstanceFields(documentDefinition, ret);
    return ret;
}

function buildDocumentInstanceFields(documentDefinition, documentInstance, data, educator, tenure) {
    documentInstance.Fields = [];
    for (var i = 0; i < documentDefinition.Fields.length; i++) {
        var documentDefinitionField = documentDefinition.Fields[i];
        // if data isn't supplied, it won't provide values
        var documentInstanceField = {
            DocumentInstanceID: documentInstance.DocumentInstanceID,
            DocumentDefinitionFieldID: documentDefinitionField.DocumentDefinitionFieldID,
            FieldValue: data ? getDocumentFieldValue(documentDefinitionField, data, educator, tenure) : null
        };
        documentInstance.Fields.push(documentInstanceField);
    }
}

function getDocumentFieldValue(documentDefinitionField, data, educator, tenure) {
    if (documentDefinitionField.FieldSection == 'Educator') {
        if (documentDefinitionField.FieldExpression) {
            return eval(documentDefinitionField.EducatorFieldExpression);
        } else {
            return data[documentDefinitionField.DocumentDefinitionFieldID];
        }
    } else {
        return null;
    }
}