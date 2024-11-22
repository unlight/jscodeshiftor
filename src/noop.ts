import jscodeshift from 'jscodeshift';

export default <jscodeshift.Transform>function (file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  return root.toSource({
    lineTerminator: '\n',
  });
};
