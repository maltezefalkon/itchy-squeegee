// these should be folded into status.js because we need status logic in here and can't know how to include it and stay portable

function calculateDocumentRenewalDate(timeframeString, documentDate) {
    var pieces = timeframeString.split(" ");
    if (pieces.length == 2 && (pieces[1] == 'years' || pieces[1] == 'year')) {
        return new Date(documentDate.getFullYear() + Number(pieces[0]), documentDate.getMonth(), documentDate.getDate());
    } else if (pieces.length == 2 && (pieces[1] == 'months' || pieces[1] == 'month')) {
        var newYear = documentDate.getFullYear();
        var newMonth = documentDate.getMonth() + Number(pieces[0]);
        if (newMonth > 11) {
            newMonth -= 12;
            newYear += 1;
        }
        return new Date(newYear, newMonth, documentDate.getDate());
    } else if (pieces.length == 2 && (pieces[1] == 'days' || pieces[1] == 'day')) {
        var dat = new Date(documentDate.valueOf());
        dat.setDate(dat.getDate() + Number(pieces[0]));
        return dat;
    } else {
        throw new Error('Unsupported timeframe descriptor: "' + timeframeString + '"');
    }
}

function isDocumentReadyToSubmit(doc, def, sub) {
    if (!doc || sub) {
        return false;
    } else if (def.HasUpload && !doc.BinaryFileID) {
        return false;
    } else if (doc.StatusID == 100) {
        return true;
    }
}

function getStatusDescriptionTemplateRenderingData(doc) {
    return {
        referenceTenure: doc.ReferenceTenure, 
        applicableTenure: doc.ApplicableTenure, 
        educator: doc.Educator, 
        documentDate: doc.DocumentDate
    };
}

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = {
            calculateDocumentRenewalDate: calculateDocumentRenewalDate,
            isDocumentReadyToSubmit: isDocumentReadyToSubmit,
            getStatusDescriptionTemplateRenderingData: getStatusDescriptionTemplateRenderingData
        };
    }
    exports = {
        calculateDocumentRenewalDate: calculateDocumentRenewalDate,
        isDocumentReadyToSubmit: isDocumentReadyToSubmit,
        getStatusDescriptionTemplateRenderingData: getStatusDescriptionTemplateRenderingData
    };
}

