import jscodeshift from 'jscodeshift';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  return j(file.source).toSource({
    lineTerminator: '\n',
  });
};
