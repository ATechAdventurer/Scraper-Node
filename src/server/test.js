const _ = require('lodash');
function reconsiler(oldData = [{a: 1, b: 2}, {a:2, b:4}], newData = [{a:12, b: 2}, {a:1, b:2}, {a:2, b:4}]){
    let data = [...oldData, ...newData]
    return _.uniqBy(data, 'post_hash');
}

console.log(reconsiler());