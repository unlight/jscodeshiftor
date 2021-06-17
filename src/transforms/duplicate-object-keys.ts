import jscodeshift from 'jscodeshift';

module.exports = function (file, api, options) {
    // eslint-disable-next-line unicorn/prevent-abbreviations
    const j = api.jscodeshift;
    return j(file.source)
        .find(j.ObjectExpression)
        .forEach(objectExpression => {
            const names = new Map<string, number>();
            const nodes = (name: string) =>
                j(objectExpression).find(j.Property, {
                    key: {
                        type: 'Identifier',
                        name,
                    },
                    computed: false,
                });
            j(objectExpression)
                .find(j.Property)
                .forEach(property => {
                    const name = j(property).find(j.Identifier).nodes()[0]?.name;
                    if (name) {
                        if (!names.has(name)) {
                            names.set(name, 0);
                        }
                        const count = names.get(name)! + 1;
                        names.set(name, count);
                    }
                });

            for (const [name, count] of names.entries()) {
                if (count === 1) continue;
                while (nodes(name).size() > 1) {
                    nodes(name).at(0).remove();
                }
            }
        })
        .toSource({
            lineTerminator: '\n',
        });
} as jscodeshift.Transform;
