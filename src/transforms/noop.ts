import jscodeshift from 'jscodeshift';

module.exports = function (fileInfo, api, options) {
    const { source } = fileInfo;
    return source;
} as jscodeshift.Transform;
