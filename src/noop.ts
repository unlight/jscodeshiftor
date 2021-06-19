import jscodeshift from 'jscodeshift';

export default <jscodeshift.Transform>function (file, api, options) {
    // eslint-disable-next-line unicorn/prevent-abbreviations
    const j = api.jscodeshift;
    return j(file.source).toSource({
        lineTerminator: '\n',
    });
};
