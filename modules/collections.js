module.exports.clone = clone;
module.exports.findSingle = findSingle;


function findSingle(arrayLike, propertiesToMatch) {
    var ret = undefined;
    var broken = undefined;
    for (var i in arrayLike) {
        broken = false;
        for (var f in propertiesToMatch) {
            if (propertiesToMatch[f]) {
                if (!arrayLike[i][f] || arrayLike[i][f] != propertiesToMatch[f]) {
                    broken = true;
                    break;
                }
            } else {
                if (arrayLike[i][f]) {
                    broken = true;
                    break;
                }
            }
        }
        if (!broken) {
            ret = arrayLike[i];
            break;
        }
    }
    return ret;
}

function clone(o, seenObjects) {
    var ret = {};
    var seenObjects = seenObjects || [o];
    var val = null;
    for (var f in o) {
        try {
            val = o[f]
        } catch (e) {
            continue;
        }
        if (val === null) {
            ret[f] = null;
        } else if (typeof val === 'object') {
            var idx = seenObjects.indexOf(val);
            if (idx == -1) {
                seenObjects.push(val);
                ret[f] = clone(val, seenObjects);
            } else {
                ret[f] = seenObjects[idx];
            }
        } else {
            ret[f] = val;
        }
    }
    return ret;
}
