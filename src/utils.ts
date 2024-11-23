import {
  ASTPath,
  Collection,
  FunctionDeclaration,
  JSCodeshift,
  VariableDeclaration,
} from 'jscodeshift';

// https://github.com/JamieMason/codemods/blob/master/transforms/lib/helpers.js

function isTopLevel(path: ASTPath) {
  return path.parent.value.type === 'Program';
}

export function getTopLevelVariables(j: JSCodeshift, collection: Collection) {
  return collection.find(j.VariableDeclaration).filter(isTopLevel);
}

export function getTopLevelVariableNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  getTopLevelVariables(j, collection).forEach(path => {
    const variableDeclaration = path.value;

    variableDeclaration.declarations.forEach(declaration => {
      if (declaration.type === 'VariableDeclarator') {
        if (declaration.id.type === 'Identifier') {
          identifiers.push(declaration.id.name);
        }
        if (declaration.id.type === 'ObjectPattern') {
          declaration.id.properties.forEach(p => {
            if (p.type === 'Property' && p.value.type === 'Identifier')
              identifiers.push(p.value.name);
          });
        }
      }
    });
  });

  return identifiers;
}

export function getImportedVarNames(j: JSCodeshift, collection: Collection) {
  const identifiers: string[] = [];
  collection.find(j.ImportDeclaration).forEach(path => {
    const importDeclaration = path.value;
    importDeclaration.specifiers?.forEach(specifier => {
      if (specifier.local?.name) identifiers.push(specifier.local?.name);
    });
  });

  return identifiers;
}

export function getExportsByFunctionName(
  j: JSCodeshift,
  collection: Collection,
  className: string,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: className },
    },
  });
}

export function getNamedExportedClasses(
  j: JSCodeshift,
  collection: Collection,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: { type: 'ClassDeclaration', id: { type: 'Identifier' } },
  });
}

export function getNamedExportedClassNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  getNamedExportedClasses(j, collection).forEach(path => {
    const exportNamedDeclaration: any = path.value;
    if (exportNamedDeclaration.declaration?.id) {
      identifiers.push(exportNamedDeclaration.declaration.id.name);
    }
  });

  return identifiers;
}

export function getNamedExportedFunctions(
  j: JSCodeshift,
  collection: Collection,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier' },
    },
  });
}

export function getNamedExportedFunctionNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  getNamedExportedFunctions(j, collection).forEach(path => {
    const exportNamedDeclaration: any = path.value;
    if (exportNamedDeclaration.declaration?.id) {
      identifiers.push(exportNamedDeclaration.declaration.id.name);
    }
  });

  return identifiers;
}

export function getExportsByClassName(
  j: JSCodeshift,
  collection: Collection,
  className,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: {
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: className },
    },
  });
}

export function getNamedExportedVars(j: JSCodeshift, collection: Collection) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: { type: 'VariableDeclaration' },
  });
}

export function getTopLevelClasses(j: JSCodeshift, collection: Collection) {
  return collection.find(j.ClassDeclaration).filter(isTopLevel);
}

export function getTopLevelFunctions(j: JSCodeshift, collection: Collection) {
  return collection.find(j.FunctionDeclaration).filter(isTopLevel);
}

export function getTopLevelClassByName(
  j: JSCodeshift,
  collection: Collection,
  className,
) {
  return collection
    .find(j.ClassDeclaration, {
      id: { type: 'Identifier', name: className },
    })
    .filter(isTopLevel);
}

export function getTopLevelFunctionByName(
  j: JSCodeshift,
  collection: Collection,
  className,
) {
  return collection
    .find(j.FunctionDeclaration, {
      id: { type: 'Identifier', name: className },
    })
    .filter(isTopLevel);
}

export function getTopLevelVariableByName(
  j: JSCodeshift,
  collection: Collection,
  varName,
) {
  return collection
    .find(j.VariableDeclaration, {
      declarations: [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: varName },
        },
      ],
    })
    .filter(isTopLevel);
}

export function getNamedExportedVarNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];

  getNamedExportedVars(j, collection).forEach(path => {
    const exportNamedDeclaration = path.value;
    if (exportNamedDeclaration.declaration?.type === 'VariableDeclaration')
      exportNamedDeclaration.declaration.declarations?.forEach(declaration => {
        if (declaration.type === 'VariableDeclarator') {
          if (declaration.id.type === 'Identifier') {
            identifiers.push(declaration.id.name);
          }
          if (declaration.id.type === 'ObjectPattern') {
            declaration.id.properties.forEach(p => {
              if (p.type === 'Property' && p.value.type === 'Identifier')
                identifiers.push(p.value.name);
            });
          }
        }
      });
  });

  return identifiers;
}

export function getTopLevelClassNames(j: JSCodeshift, collection: Collection) {
  const identifiers: string[] = [];
  getTopLevelClasses(j, collection).forEach(path => {
    const classDeclaration = path.value;
    if (classDeclaration?.id) {
      identifiers.push(classDeclaration.id.name);
    }
  });
  return identifiers;
}

export function getTopLevelFunctionNames(
  j: JSCodeshift,
  collection: Collection,
) {
  const identifiers: string[] = [];
  getTopLevelFunctions(j, collection).forEach(path => {
    const functionDeclaration = path.value;
    if (functionDeclaration.id) {
      identifiers.push(functionDeclaration.id.name);
    }
  });
  return identifiers;
}

export function getTopLevelVarNames(j: JSCodeshift, collection: Collection) {
  return ([] as string[]).concat(
    getImportedVarNames(j, collection),
    getNamedExportedClassNames(j, collection),
    getNamedExportedFunctionNames(j, collection),
    getNamedExportedVarNames(j, collection),
    getTopLevelClassNames(j, collection),
    getTopLevelFunctionNames(j, collection),
    getTopLevelVariableNames(j, collection),
  );
}

export function exportClass(j: JSCodeshift, path) {
  const classDeclaration = path.value;
  return j.exportNamedDeclaration(
    j.classDeclaration(
      j.identifier(classDeclaration.id.name),
      classDeclaration.body,
      classDeclaration.superClass,
    ),
  );
}

export function getExportsByVarName(
  j: JSCodeshift,
  collection: Collection,
  varName: string,
) {
  return collection.find(j.ExportNamedDeclaration, {
    declaration: {
      type: 'VariableDeclaration',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: varName },
        },
      ],
    },
  });
}

export function getImportsByPackageName(
  j: JSCodeshift,
  collection: Collection,
  packageName: string,
) {
  return collection.find(j.ImportDeclaration, {
    source: {
      value: packageName,
    },
  });
}

export function exportFunction(
  j: JSCodeshift,
  path: ASTPath<FunctionDeclaration>,
) {
  const functionDeclaration = path.value;

  return j.exportNamedDeclaration(
    j.functionDeclaration(
      j.identifier(functionDeclaration.id!.name),
      functionDeclaration.params,
      functionDeclaration.body,
    ),
  );
}

export function exportVariable(
  j: JSCodeshift,
  path: ASTPath<VariableDeclaration>,
) {
  const variableDeclaration = path.value;

  return j.exportNamedDeclaration(
    j.variableDeclaration('const', variableDeclaration.declarations),
  );
}

export function exportDefaultAsNamed(j: JSCodeshift, path, name) {
  const exportDefaultDeclaration = path.value;
  const varName = j.identifier(name);
  const varValue = exportDefaultDeclaration.declaration;
  return j.exportNamedDeclaration(
    j.variableDeclaration('const', [j.variableDeclarator(varName, varValue)]),
  );
}

export function exportVarNameAsDefault(j: JSCodeshift, name) {
  return j.exportDefaultDeclaration(j.identifier(name));
}
