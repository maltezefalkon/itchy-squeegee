var api = require('./api.js');
var meta = require('./metadata.js')();
var collections = require('./collections.js');
var Promise = require('bluebird');
var log = require('./logging.js')('forms');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var fdf = require('fdf');
var exec = require('child_process').exec;
var docfn = require('../biz/document.js');
var DocumentStatus = require('../biz/status.js').DocumentStatus;

var _ = require('lodash');

var Form168 = {
    DocumentDefinitionID: '093076b1-3348-11e5-9a89-180373ea70a8'
};

var Form114 = {
    DocumentDefinitionID: '40291979-5420-4078-8c55-1ca0e535958d'
}

var pdfFillerClientID = process.env.PDF_FILLER_CLIENT_ID || 'f34ab42d7488e7be';
var pdfFillerClientSecret = process.env.PDF_FILLER_CLIENT_SECRET || '3hfBdm757re3PlSuHA0wnKAaxp6Ru7UZ';

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
    ret.UploadDateTime = documentDefinition.HasUpload ? new Date() : null;
    ret.RenewalDate = calculateDocumentRenewalDate(documentDefinition, documentDate);
    ret.Name = calculateDocumentInstanceName(documentDefinition, applicableTenure, referenceTenure);
    var status = ret.DocumentDefinitionID == Form168.DocumentDefinitionID ? DocumentStatus.AwaitingCompletionByEducator : DocumentStatus.Valid;
    ret.StatusID = status.StatusID;
    ret.StatusDescription = _.template(status.DescriptionTemplate)({ educator: educator, applicableTenure: applicableTenure, referenceTenure: referenceTenure, documentDate: documentDate });
    // buildDocumentInstanceFields(documentDefinition, ret, educator, applicableTenure, referenceTenure, documentData);
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
    if (documentDefinition.NewHireValidityPeriod) {
        return docfn.calculateDocumentRenewalDate(documentDefinition.NewHireValidityPeriod, documentDate);
    } else {
        return null;
    }
}

function createFDFDataObject(documentInstance) {
    var ret = {};
    for (var i = 0; i < documentInstance.Definition.Fields.length; i++) {
        var documentDefinitionField = documentInstance.Definition.Fields[i];
        documentInstanceField = findDocumentInstanceField(documentInstance, documentDefinitionField.DocumentDefinitionFieldID);
        var dataValue = null;
        if (documentInstanceField) {
            dataValue = documentInstanceField.FieldValue;
            if (documentDefinitionField.PDFFieldType == 'Button') {
                if (documentInstanceField.FieldValue === 'true') {
                    dataValue = documentDefinitionField.PDFTrueValue;
                } else if (documentInstanceField.FieldValue === 'false') {
                    dataValue = documentDefinitionField.PDFFalseValue;
                } else {
                    dataValue = documentDefinitionField.PDFNullValue;
                }
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
    var baseFileName = path.resolve(__dirname, '../pdf/' + documentInstance.Definition.PDFFileName);
    var signatureFileName = path.resolve(__dirname, '../pdf/signature-' + documentInstance.DocumentInstanceID + '.pdf');
    var filledFileName = path.resolve(__dirname, '../pdf/filled-' + documentInstance.DocumentInstanceID + '.pdf');
    var finalFileName = path.resolve(__dirname, '../pdf/' + documentInstance.DocumentInstanceID + '.pdf');
    log.info({ baseFileName: baseFileName, signatureFileName: signatureFileName, filledFileName: filledFileName, finalFileName: finalFileName }, 'ready to generate pdf');
    
    generateSignaturePDF(documentInstance, signatureFileName);
    var ret = mergeFormDataIntoPDF(baseFileName, filledFileName, data, documentInstance.DocumentInstanceID);
    ret = ret.then(function () {
        return mergeSignaturesIntoPDF(filledFileName, signatureFileName, finalFileName);
    }).then(function () {
        log.debug('reading back merged pdf');
        return fs.readFileAsync(finalFileName);
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
                log.info({ commandLine: commandLine }, 'calling pdftk to do form fill');
                var childProcess = exec(commandLine);
                childProcess.addListener('error', reject);
                childProcess.addListener('exit', resolve);
            });
        });
}

function mergeSignaturesIntoPDF(baseFile, signatureFile, destinationFile) {
    
    log.info('merging signature PDF');

    // determine if we're on Windows
    var isWin = /^win/.test(process.platform);
    var prefix = suffix = (isWin ? '"' : '');
    
    //Call PDFtk to do the merge
    return new Promise(function (resolve, reject) {
        var commandLine = "pdftk " + prefix + baseFile + suffix + " multistamp " + prefix + signatureFile + suffix + " output " + prefix + destinationFile + suffix;
        log.info({ commandLine: commandLine }, 'calling pdftk to do multistamp');
        var childProcess = exec(commandLine);
        childProcess.addListener('error', reject);
        childProcess.addListener('exit', resolve);
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
        } else {
            var descriptor = { DocumentDefinition: definitions[j], ApplicableTenure: null, ReferenceTenure: null };
            descriptor.Documents = _.filter(documents, function (doc) { return doc.DocumentDefinitionID == definitions[j].DocumentDefinitionID; });
            descriptor.Name = calculateDocumentInstanceName(descriptor.DocumentDefinition, descriptor.ApplicableTenure, descriptor.ReferenceTenure);
            ret.push(descriptor);
        }
    }
    return ret;
}

// expects the documentInstance object to have these joins populated:
// ['Signatures', 'Fields.Definition.SignatureRegion']
function generateSignaturePDF(documentInstance, fileName) {
    log.info('generating signature PDF');
    var signatureDataWidth = 500, signatureDataHeight = 200;
    log.debug('creating PDF');
    var PDFDocument = require('pdfkit');

    log.debug('filtering signature fields');
    var signatureFields = _(documentInstance.Fields).filter(function (f) {
        var fieldDef = getFieldDefinition(f, documentInstance);
        return fieldDef.LogicalFieldType == 'Signature';
    }).sortBy('Definition.SignatureRegion.PageNumber').value();
    var doc = new PDFDocument();
    var currentPage = 1;
    for (var i in signatureFields) {
        var fld = signatureFields[i];
        var signature = _.find(documentInstance.Signatures, function (sig) {
            return sig.DocumentDefinitionFieldID == fld.DocumentDefinitionFieldID;
        });
        if (signature) {
            var fieldDef = getFieldDefinition(fld, documentInstance);
            if (!fieldDef.SignatureRegion) {
                log.error('No signature region defined for document definition field ID ' + fieldDef.DocumentDefinitionFieldID);
                throw new Error('No signature region defined for document definition field ID ' + fieldDef.DocumentDefinitionFieldID);
            }
            for (var j = currentPage; j < fieldDef.SignatureRegion.PageNumber; j++) {
                doc.addPage();
            }
            currentPage = fieldDef.SignatureRegion.PageNumber;
            var xfactor = fieldDef.SignatureRegion.Width / signatureDataWidth;
            var yfactor = fieldDef.SignatureRegion.Height / signatureDataHeight;
            var data = JSON.parse(signature.SignatureData);
            var lines = data.lines;
            var paths = [];
            for (var i = 0; i < lines.length; i++) {
                var path = 'M';
                for (var j = 0; j < lines[i].length; j++) {
                    var x = (lines[i][j][0] * xfactor) + fieldDef.SignatureRegion.Left;
                    var y = (lines[i][j][1] * yfactor) + fieldDef.SignatureRegion.Top;
                    path += ' ' + x + ',' + y;
                }
                paths.push(path);
            }
            for (var i in paths) {
                doc.path(paths[i]).stroke();
            }
        }
    }
    for (var k = currentPage; k < documentInstance.Definition.TotalPDFPages; k++) {
        doc.addPage();
    }
    var writeStream = fs.createWriteStream(fileName);
    doc.pipe(writeStream);
    log.debug('writing PDF');
    doc.end();
}

function getFieldDefinition(documentInstanceField, documentInstance) {
    if (documentInstanceField.Definition) {
        return documentInstanceField.Definition;
    } else if (documentInstance.Definition && documentInstance.Definition.Fields) {
        return _.find(documentInstance.Definition.Fields, function (documentDefinitionField) {
            return documentDefinitionField.DocumentDefinitionFieldID == documentInstanceField.DocumentDefinitionFieldID;
        });
    } else {
        throw new Error('Failed to find a field definition for DocumentDefinitionFieldID ' + documentInstanceField.DocumentDefinitionFieldID);
    }
}

function isTenureApplication(tenure) {
    return !tenure.StartDate;
}

function isTenureCurrent(tenure) {
    return tenure.StartDate && !tenure.EndDate;
}

function dateSortDescending(date1, date2) {
    if (date1 > date2) {
        return -1;
    } else if (date1 < date2) {
        return 1;
    } else {
        return 0;
    }
}

module.exports.CreateDocumentStubs = createDocumentStubs;
module.exports.FindDocumentInstanceField = findDocumentInstanceField;
module.exports.Form168 = Form168;
module.exports.GeneratePDF = generatePDF;
module.exports.CalculateRenewalDate = calculateDocumentRenewalDate;
module.exports.CreateDocumentInstance = createDocumentInstance;
module.exports.CalculateDocumentInstanceName = calculateDocumentInstanceName;
module.exports.ConstructRequiredDocumentDescriptors = constructRequiredDocumentDescriptors;
module.exports.GenerateSignaturePDF = generateSignaturePDF;
module.exports.GetDocumentFieldValue = getDocumentFieldValue;