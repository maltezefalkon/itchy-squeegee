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

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = {
            calculateDocumentRenewalDate: calculateDocumentRenewalDate
        };
    }
    exports = {
        calculateDocumentRenewalDate: calculateDocumentRenewalDate
    };
}

