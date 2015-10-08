var api = require('./api.js');
var meta = require('./metadata.js')();
var collections = require('./collections.js');
var Status = require('../biz/status.js');
var Promise = require('bluebird');
var log = require('./logging.js')('forms');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var fdf = require('fdf');
var exec = require('child_process').exec;

var _ = require('lodash');

var Form168 = {
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
            if (documentDefinition.DocumentDefinitionID == Form168.DocumentDefinitionID) {
                Form168.DocumentDefinition = documentDefinition;
            }
        });
    });

Form168.create = function (educator, applicableTenure, referenceTenure, documentData, documentDate) {
    return createDocumentInstance(Form168.DocumentDefinitionID, educator, applicableTenure, referenceTenure, documentData, documentDate);
};

function createDocumentInstance(documentDefinitionID, educator, applicableTenure, referenceTenure, documentData, documentDate) {
    var ret = new meta.bo.DocumentInstance();
    var docDef = module.exports.DocumentDefinitions[documentDefinitionID];
    ret.DocumentDefinitionID = documentDefinitionID;
    ret.ApplicableTenureID = applicableTenure.TenureID;
    ret.ReferenceTenureID = referenceTenure ? referenceTenure.TenureID : null;
    ret.EducatorID = educator.EducatorID;
    ret.DocumentDate = documentDate;
    ret.StatusID = Status.Missing.ID;
    ret.StatusDescription = _.template(Status.Missing.DescriptionTemplate)(ret);
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
            documentInstanceField = this.findDocumentInstanceField(documentInstance, documentDefinitionField.DocumentDefinitionFieldID);
        }
        if (!documentInstanceField) {
            documentInstanceField = new meta.bo.DocumentInstanceField();
            documentInstanceField.DocumentInstanceID = documentInstance.DocumentInstanceID;
            documentInstanceField.DocumentDefinitionFieldID = documentDefinitionField.DocumentDefinitionFieldID;
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
        if (documentDefinitions[i].RenewDuringEmployment || !documentTenure.StartDate) {
            if (documentDefinitions[i].DocumentDefinitionID == Form168.DocumentDefinitionID) {
                for (var j = 0; j < allTenures.length; j++) {
                    if (allTenures[j].StartDate) {
                        doc = createDocumentInstance(documentDefinitions[i].DocumentDefinitionID, educator, documentTenure, allTenures[j], null, documentDate);
                        ret.push(doc);
                    }
                }
            } else {
                doc = createDocumentInstance(documentDefinitions[i].DocumentDefinitionID, educator, documentTenure, null, null, documentDate);
                doc.NextRenewalDate = calculateDocumentRenewalDate(documentDefinitions[i], documentDate);
                ret.push(doc);
            }
        }
    }
    return ret;
}

function formatDate(d) {
    var date = d ? ((d instanceof Date) ? d : new Date(d)) : new Date();
    return (date.getMonth() + 1).toString() + '/' + date.getDate() + '/' + date.getFullYear();
}

function findDocumentInstanceField(documentInstance, documentDefinitionFieldID) {
    return collections.findSingle(documentInstance.Fields, { DocumentDefinitionFieldID: documentDefinitionFieldID })
}

function calculateDocumentRenewalDate(documentDefinition, documentDate) {
    if (documentDefinition.RenewalPeriod) {
        var pieces = documentDefinition.RenewalPeriod.split(" ");
        if (pieces.length == 2 && pieces[1] == 'years') {
            return new Date(documentDate.getFullYear() + Number(pieces[0]), documentDate.getMonth(), documentDate.getDate());
        } else if (pieces.length == 2 && pieces[1] == 'months') {
            var newYear = documentDate.getFullYear();
            var newMonth = documentDate.getMonth() + Number(pieces[0]);
            if (newMonth > 11) {
                newMonth -= 12;
                newYear += 1;
            }
            return new Date(newYear, newMonth, documentDate.getDate());
        } else {
            throw new Error('Unsupported time span descriptor: "' + documentDefinition.RenewalPeriod + '"');
        }
    } else {
        return null;
    }
}

function createFDFDataObject(documentInstance) {
    var ret = {};
    for (var i = 0; i < documentInstance.Definition.Fields.length; i++) {
        var documentDefinitionField = documentInstance.Definition.Fields[i];
        documentInstanceField = findDocumentInstanceField(documentInstance, documentDefinitionField.DocumentDefinitionFieldID);
        var dataValue = documentInstanceField.FieldValue;
        if (documentDefinitionField.PDFFieldType == 'Button') {
            if (documentInstanceField.FieldValue === 'true') {
                dataValue = documentDefinitionField.PDFTrueValue;
            } else if (documentInstanceField.FieldValue === 'false') {
                dataValue = documentDefinitionField.PDFFalseValue;
            } else {
                dataValue = documentDefinitionField.PDFNullValue;
            }
        }
        ret[documentDefinitionField.FieldName] = dataValue;
    }
    log.debug({ fdf: ret }, 'Generated FDF data');
    return ret;
}

/// returns a promise
function generatePDF(documentInstance) {
    
    var data = createFDFDataObject(documentInstance);
    var inputFileName = path.resolve(__dirname, '../pdf/Form-DPTT.pdf');
    var outputFileName = path.resolve(__dirname, '../pdf/' + documentInstance.DocumentInstanceID + '.pdf');
    log.info({ inputFile: inputFileName, outputFile: outputFileName }, 'ready to generate pdf');

    var ret = mergeFormDataIntoPDF(inputFileName, outputFileName, data, documentInstance.DocumentInstanceID)
        .then(function () {
            log.debug('reading back filled pdf');
            return fs.readFileAsync(outputFileName);
        });
    return ret;
}

function mergeFormDataIntoPDF(sourceFile, destinationFile, fieldValues, id) {
    
    // determine if we're on Windows
    var isWin = /^win/.test(process.platform);
    var prefix = suffix = (isWin ? '"' : '');

    //Generate the data from the field values.
    var formData = fdf.generate(fieldValues),
        tempFDF = "data-" + id + ".fdf";
    
    //Write the temp fdf file.
    return fs.writeFileAsync(tempFDF, formData)
        .then(function () {
            return new Promise(function (resolve, reject) {
                var commandLine = "pdftk " + prefix + sourceFile + suffix + " fill_form " + prefix + tempFDF + suffix + " output " + prefix + destinationFile + suffix + " flatten";
                log.info({ commandLine: commandLine }, 'calling pdftk');
                var childProcess = exec(commandLine);
                childProcess.addListener('error', reject);
                childProcess.addListener('exit', resolve);
            });
        });
}

module.exports.CreateDocumentStubs = createDocumentStubs;
module.exports.FindDocumentInstanceField = findDocumentInstanceField;
module.exports.Form168 = Form168;
module.exports.GeneratePDF = generatePDF;
module.exports.CalculateRenewalDate = calculateDocumentRenewalDate;
