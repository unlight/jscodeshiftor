import jscodeshift from 'jscodeshift';

module.exports = function (file, api, options) {
    // eslint-disable-next-line unicorn/prevent-abbreviations
    const j = api.jscodeshift;
    return j(file.source).toSource({
        lineTerminator: '\n',
    });
} as jscodeshift.Transform;
