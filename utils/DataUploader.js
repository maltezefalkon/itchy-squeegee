/*
 * 
 * DATA UPLOADER
 * 
 * This script populates data in the database by loading JSON files
 * and posting it to the data server using XMLHTTP.
 * 
 * This is written the WScript way.  I should rewrite it the node way.
 * 
 */


var list = [
    'Address',
    'AddressType',
    'DocumentDefinition',
    'DocumentDefinitionField',
    'DocumentInstance',
    'DocumentInstanceField',
    'Educator',
    'EducatorAddress',
    'OrganizationType',
    'User',
    'Organization',
    'OrganizationAddress',
    'Tenure',
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
    var path = 'C:\\Users\\Dan\\Documents\\Visual Studio 2013\\Projects\\NodejsWebApp1\\NodejsWebApp1\\data\\' + tk + '.json';
    var file = fso.OpenTextFile(path, 1, false);
    var contents = file.ReadAll();
    if (contents.length > 6) {
        var request = WScript.CreateObject("MSXML2.XMLHTTP");
        request.open("POST", url, false);
        request.setRequestHeader("Content-type", "application/json");
        // request.onreadystatechange = createCallback(request, tk, url);
        WScript.Echo('POSTing to ' + url);
        request.send(contents); // Send the request now
        WScript.Echo('Response: ' + request.responseText);
    }
}
