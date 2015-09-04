/*
 * 
 * DATA DOWNLOADER
 * 
 * This script calls to the data server for all of the data of a given type
 * and writes it into separate JSON data files so that they can be loaded
 * back into the database using the Data Uploader.
 * 
 * This is written the WScript way.  I should rewrite it the node way.
 * 
 */


var request = WScript.CreateObject("MSXML2.XMLHTTP");

var list = [
    'Address',
    'AddressType',
    'DocumentDefinition',
    'DocumentDefinitionField',
    'DocumentInstance',
    'DocumentInstanceField',
    'Educator',
    'EducatorAddress',
    'Organization',
    'OrganizationAddress',
    'OrganizationType',
    'Tenure',
    'User',
    'UserEducatorAuthorization',
    'UserOrganizationAuthorization'
];

if (WScript.Arguments.length > 0) {
    list = [];
    for (var i = 0; i < WScript.Arguments.length; i++) {
        list.push(WScript.Arguments.item(i));
    }
}

var written = 0;

var fso = WScript.CreateObject("Scripting.FileSystemObject");
for (var i = 0; i < list.length; i++) {
    var tk = list[i];
    var url = 'http://localhost:1337/' + tk;
    request.open("GET", url);
    request.onreadystatechange = createCallback(request, tk, url);
    request.send(null); // Send the request now
    WScript.Echo(url);
}

WScript.Echo('Spooled');

function createCallback(request, tk, url) {
    return function () {
        if (request.readyState === 4 && request.status === 200) {
            var path = 'C:\\Users\\Dan\\Documents\\Visual Studio 2013\\Projects\\NodejsWebApp1\\NodejsWebApp1\\data\\' + tk + '.json';
            var file = fso.CreateTextFile(path, true);
            file.WriteLine(request.responseText);
            file.Close();
            WScript.Echo(path);
            written++;
        }
    };
}