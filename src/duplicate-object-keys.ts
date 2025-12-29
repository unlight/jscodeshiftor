import jscodeshift from 'jscodeshift';

export default <jscodeshift.Transform>function (file, api) {
  const j = api.jscodeshift;
  return j(file.source)
    .find(j.ObjectExpression)
    .forEach(objectExpression => {
      iterateObjectExpression({ j, objectExpression });
    })
    .toSource({ lineTerminator: '\n' });
};

function iterateObjectExpression({
  j,
  objectExpression,
}: {
  j: jscodeshift.JSCodeshift;
  objectExpression: jscodeshift.ASTPath<jscodeshift.ObjectExpression>;
}) {
  // Find nodes where propert is identifier
  const identifierNodes = (name: string) =>
    j(objectExpression)
      .find(j.Property, {
        computed: false,
        key: {
          name,
          type: 'Identifier',
        },
      })
      .filter(p => p.parent === objectExpression);
  // Literals
  const literalNodes = (name: string) =>
    j(objectExpression)
      .find(j.Property, {
        computed: false,
        key: {
          type: 'Literal',
          value: name,
        },
      })
      .filter(p => p.parent === objectExpression);

  for (const property of j(objectExpression)
    .find(j.Property)
    .filter(p => p.parent === objectExpression)
    .filter(p => p.value.computed === false)
    .paths()) {
    const identifier = getIdentifierValue(property);
    // console.log({
    //     identifier,
    //     toSource: j(property).toSource(),
    //     parent: j(property.parent).toSource(),
    // });
    const count =
      identifierNodes(identifier).size() + literalNodes(identifier).size();
    if (count > 1) {
      j(property).remove();
    }
  }
}

function getIdentifierValue(
  property: jscodeshift.ASTPath<jscodeshift.Property>,
) {
  switch (property.node.key.type) {
    case 'Identifier': {
      return property.node.key.name;
    }
    case 'Literal': {
      return String(property.node.key.value);
    }
  }
  throw new TypeError(`Unknow type ${property.node.key.type}`);
}
