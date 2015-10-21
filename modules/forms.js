var api = require('./api.js');
var meta = require('./metadata.js')();
var collections = require('./collections.js');
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
    return createDocumentInstance(Form168.DocumentDefinition, educator, applicableTenure, referenceTenure, documentData, documentDate);
};

function createDocumentInstance(documentDefinition, educator, applicableTenure, referenceTenure, documentData, documentDate) {
    var ret = new meta.bo.DocumentInstance();
    ret.DocumentDefinitionID = documentDefinition.DocumentDefinitionID;
    ret.EducatorID = educator.EducatorID;
    ret.ApplicableTenureID = applicableTenure ? applicableTenure.TenureID : null;
    ret.ReferenceTenureID = referenceTenure ? referenceTenure.TenureID : null;
    ret.DocumentDate = documentDate;
    ret.UploadDateTime = documentDefinition.IsUpload ? new Date() : null;
    ret.RenewalDate = calculateDocumentRenewalDate(documentDefinition, documentDate);
    ret.Name = calculateDocumentInstanceName(documentDefinition, applicableTenure, referenceTenure);
    buildDocumentInstanceFields(documentDefinition, ret, educator, applicableTenure, referenceTenure, documentData);
    return ret;
}

function calculateDocumentInstanceName(documentDefinition, applicableTenure, referenceTenure) {
    var ret = documentDefinition.Name;
    if (applicableTenure) {
        ret += ' for ' + applicableTenure.Organization.Name;
    }
    if (referenceTenure) {
        ret += ' regarding ' + referenceTenure.Organization.Name;
    }
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

function createDocumentStubs(allTenures, educator, applicableTenure) {
    var ret = [];
    var doc = null;
    for (var i = 0; i < documentDefinitions.length; i++) {
        if (documentDefinitions[i].DocumentDefinitionID == Form168.DocumentDefinitionID) {
            if (applicableTenure) {
                for (var j = 0; j < allTenures.length; j++) {
                    if (allTenures[j].StartDate) {
                        doc = createDocumentInstance(documentDefinitions[i], educator, applicableTenure, allTenures[j], null, applicableTenure.ApplicationDate);
                        ret.push(doc);
                    }
                }
            }
        } else {
            doc = createDocumentInstance(documentDefinitions[i], educator, applicableTenure, null, null, new Date());
            doc.NextRenewalDate = calculateDocumentRenewalDate(documentDefinitions[i], new Date());
            ret.push(doc);
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
        ret[documentDefinitionField.FieldName] = (dataValue === null ? '' : dataValue);
    }
    log.debug({ fdf: ret }, 'Generated FDF data');
    return ret;
}

/// returns a promise
function generatePDF(documentInstance) {
    
    var data = createFDFDataObject(documentInstance);
    var inputFileName = path.resolve(__dirname, '../pdf/' + documentInstance.Definition.PDFFileName);
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

function constructRequiredDocumentDescriptors(displayTenures, definitions, allTenures, documents) {
    var ret = [];
    for (var j in definitions) {
        if (definitions[j].HasInstancePerEmployer) {
            for (var i in displayTenures) {
                if (isTenureApplication(displayTenures[i]) || definitions[j].RenewDuringEmployment) {
                    if (definitions[j].HasInstancePerPreviousTenure) {
                        var filteredTenures = _.filter(allTenures, function (t) { return t.StartDate; });
                        for (var k in filteredTenures) {
                            var descriptor = { DocumentDefinition: definitions[j], ApplicableTenure: displayTenures[i], ReferenceTenure: filteredTenures[k] };
                            descriptor.Documents = _.filter(documents, function (doc) { return doc.DocumentDefinitionID == definitions[j].DocumentDefinitionID && doc.ApplicableTenureID == displayTenures[i].TenureID; }).sort(function (a, b) { return dateSortDescending(a.DocumentDate, b.DocumentDate); });
                            descriptor.Name = calculateDocumentInstanceName(descriptor.DocumentDefinition, descriptor.ApplicableTenure, descriptor.ReferenceTenure);
                            ret.push(descriptor);
                        }
                    } else {
                        var descriptor = { DocumentDefinition: definitions[j], ApplicableTenure: displayTenures[i], ReferenceTenure: null };
                        descriptor.Documents = _.filter(documents, function (doc) { return doc.DocumentDefinitionID == definitions[j].DocumentDefinitionID && doc.ApplicableTenureID == displayTenures[i].TenureID; });
                        descriptor.Name = calculateDocumentInstanceName(descriptor.DocumentDefinition, descriptor.ApplicableTenure, descriptor.ReferenceTenure);
                        ret.push(descriptor);
                    }
                }
            }
        } else if (definitions[j].RenewDuringEmployment) {
            var descriptor = { DocumentDefinition: definitions[j], ApplicableTenure: null, ReferenceTenure: null };
            descriptor.Documents = _.filter(documents, function (doc) { return doc.DocumentDefinitionID == definitions[j].DocumentDefinitionID; });
            descriptor.Name = calculateDocumentInstanceName(descriptor.DocumentDefinition, descriptor.ApplicableTenure, descriptor.ReferenceTenure);
            ret.push(descriptor);
        }
    }
    return ret;
}

function isTenureApplication(tenure) {
    return !tenure.StartDate;
}

function isTenureCurrent(tenure) {
    return tenure.StartDate && !tenure.EndDate;
}

module.exports.CreateDocumentStubs = createDocumentStubs;
module.exports.FindDocumentInstanceField = findDocumentInstanceField;
module.exports.Form168 = Form168;
module.exports.GeneratePDF = generatePDF;
module.exports.CalculateRenewalDate = calculateDocumentRenewalDate;
module.exports.CreateDocumentInstance = createDocumentInstance;
module.exports.CalculateDocumentInstanceName = calculateDocumentInstanceName;
module.exports.ConstructRequiredDocumentDescriptors = constructRequiredDocumentDescriptors;
