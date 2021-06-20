import jscodeshift from 'jscodeshift';

export default <jscodeshift.Transform>function (file, api, options) {
    // eslint-disable-next-line unicorn/prevent-abbreviations
    const j = api.jscodeshift;
    return j(file.source)
        .find(j.ObjectExpression)
        .forEach(objectExpression => {
            iterateObjectExpression({ j, objectExpression });
        })
        .toSource();
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
        j(objectExpression).find(j.Property, {
            key: {
                type: 'Identifier',
                name,
            },
            computed: false,
        });
    // Literals
    const literalNodes = (name: string) =>
        j(objectExpression).find(j.Property, {
            key: {
                type: 'Literal',
                value: name,
            },
            computed: false,
        });

    j(objectExpression)
        .find(j.Property)
        .filter(p => p.value.computed === false)
        .forEach(property => {
            const identifier = getIdentifierValue(property);
            const count =
                identifierNodes(identifier).size() + literalNodes(identifier).size();
            if (count > 1) {
                j(property).remove();
            }
        });
}

function getIdentifierValue(property: jscodeshift.ASTPath<jscodeshift.Property>) {
    switch (property.node.key.type) {
        case 'Identifier':
            return property.node.key.name;
        case 'Literal':
            return String(property.node.key.value);
    }
    throw new TypeError(`Unknow type ${property.node.key.type}`);
}
