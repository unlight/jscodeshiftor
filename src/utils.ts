import { ASTPath, Collection, JSCodeshift } from 'jscodeshift';

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

export const extendApi = (j: JSCodeshift) => {
  const isTopLevel = path => path.parent.value.type === 'Program';
  const dummy: any = j('');

  if (dummy.getExportsByClassName) return;

  j.registerMethods({
    getExportsByClassName(this: Collection, className) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: {
          type: 'ClassDeclaration',
          id: { type: 'Identifier', name: className },
        },
      });
    },
    getExportsByFunctionName(this: Collection, className) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: className },
        },
      });
    },
    getExportsByVarName(this: Collection, varName) {
      return this.find(j.ExportNamedDeclaration, {
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
    },
    getImportsByPackageName(this: Collection, packageName) {
      return this.find(j.ImportDeclaration, {
        source: {
          value: packageName,
        },
      });
    },
    getNamedExportedClasses(this: Collection) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: { type: 'ClassDeclaration', id: { type: 'Identifier' } },
      });
    },
    getNamedExportedFunctions(this: Collection) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier' },
        },
      });
    },
    getNamedExportedVars(this: Collection) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: { type: 'VariableDeclaration' },
      });
    },
    getTopLevelClasses(this: Collection) {
      return this.find(j.ClassDeclaration).filter(isTopLevel);
    },
    getTopLevelFunctions(this: Collection) {
      return this.find(j.FunctionDeclaration).filter(isTopLevel);
    },
    getTopLevelClassByName(this: Collection, className) {
      return this.find(j.ClassDeclaration, {
        id: { type: 'Identifier', name: className },
      }).filter(isTopLevel);
    },
    getTopLevelFunctionByName(this: Collection, className) {
      return this.find(j.FunctionDeclaration, {
        id: { type: 'Identifier', name: className },
      }).filter(isTopLevel);
    },
    getTopLevelVariableByName(this: Collection, varName) {
      return this.find(j.VariableDeclaration, {
        declarations: [
          {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: varName },
          },
        ],
      }).filter(isTopLevel);
    },
    getImportedVarNames(this: Collection) {
      const identifiers: any[] = [];
      this.find(j.ImportDeclaration).forEach(path => {
        const importDeclaration = path.value;
        importDeclaration.specifiers?.forEach(specifier => {
          identifiers.push(specifier.local?.name);
        });
      });
      return identifiers;
    },
    getNamedExportedClassNames(this: Collection) {
      const identifiers: any[] = [];
      this['getNamedExportedClasses']().forEach(path => {
        const exportNamedDeclaration = path.value;
        identifiers.push(exportNamedDeclaration.declaration.id.name);
      });
      return identifiers;
    },
    getNamedExportedFunctionNames(this: Collection) {
      const identifiers: any[] = [];
      this['getNamedExportedFunctions']().forEach(path => {
        const exportNamedDeclaration = path.value;
        identifiers.push(exportNamedDeclaration.declaration.id.name);
      });
      return identifiers;
    },
    getNamedExportedVarNames(this: Collection) {
      const identifiers: any[] = [];
      this['getNamedExportedVars']().forEach(path => {
        const exportNamedDeclaration = path.value;
        exportNamedDeclaration.declaration.declarations.forEach(declaration => {
          identifiers.push(declaration.id.name);
        });
      });
      return identifiers;
    },
    getTopLevelClassNames(this: Collection) {
      const identifiers: any[] = [];
      this['getTopLevelClasses']().forEach(path => {
        const classDeclaration = path.value;
        identifiers.push(classDeclaration.id.name);
      });
      return identifiers;
    },
    getTopLevelFunctionNames(this: Collection) {
      const identifiers: any[] = [];
      this['getTopLevelFunctions']().forEach(path => {
        const functionDeclaration = path.value;
        identifiers.push(functionDeclaration.id.name);
      });
      return identifiers;
    },
    getTopLevelVariableNames(this: Collection) {
      return getTopLevelVariableNames(j, this);
    },
    getTopLevelVarNames(this: Collection) {
      return [].concat(
        this['getImportedVarNames'](),
        this['getNamedExportedClassNames'](),
        this['getNamedExportedFunctionNames'](),
        this['getNamedExportedVarNames'](),
        this['getTopLevelClassNames'](),
        this['getTopLevelFunctionNames'](),
        this['getTopLevelVariableNames'](),
      );
    },
    exportClass(path) {
      const classDeclaration = path.value;
      return j.exportNamedDeclaration(
        j.classDeclaration(
          j.identifier(classDeclaration.id.name),
          classDeclaration.body,
          classDeclaration.superClass,
        ),
      );
    },
    exportDefaultAsNamed(path, name) {
      const exportDefaultDeclaration = path.value;
      const varName = j.identifier(name);
      const varValue = exportDefaultDeclaration.declaration;
      return j.exportNamedDeclaration(
        j.variableDeclaration('const', [
          j.variableDeclarator(varName, varValue),
        ]),
      );
    },
    exportVarNameAsDefault(name) {
      return j.exportDefaultDeclaration(j.identifier(name));
    },
    exportFunction(path) {
      const functionDeclaration = path.value;
      return j.exportNamedDeclaration(
        j.functionDeclaration(
          j.identifier(functionDeclaration.id.name),
          functionDeclaration.params,
          functionDeclaration.body,
        ),
      );
    },
    exportVariable(path) {
      const variableDeclaration = path.value;
      return j.exportNamedDeclaration(
        j.variableDeclaration('const', variableDeclaration.declarations),
      );
    },
  });
};
