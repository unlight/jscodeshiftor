import { JSCodeshift } from 'jscodeshift';

// https://github.com/JamieMason/codemods/blob/master/transforms/lib/helpers.js

export const extendApi = (j: JSCodeshift) => {
  const isTopLevel = path => path.parent.value.type === 'Program';
  const dummy: any = j('');

  if (dummy.getExportsByClassName) return;

  j.registerMethods({
    getExportsByClassName(this: JSCodeshift, className) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: {
          type: 'ClassDeclaration',
          id: { type: 'Identifier', name: className },
        },
      });
    },
    getExportsByFunctionName(this: JSCodeshift, className) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: className },
        },
      });
    },
    getExportsByVarName(this: JSCodeshift, varName) {
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
    getImportsByPackageName(this: JSCodeshift, packageName) {
      return this.find(j.ImportDeclaration, {
        source: {
          value: packageName,
        },
      });
    },
    getNamedExportedClasses(this: JSCodeshift) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: { type: 'ClassDeclaration', id: { type: 'Identifier' } },
      });
    },
    getNamedExportedFunctions(this: JSCodeshift) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier' },
        },
      });
    },
    getNamedExportedVars(this: JSCodeshift) {
      return this.find(j.ExportNamedDeclaration, {
        declaration: { type: 'VariableDeclaration' },
      });
    },
    getTopLevelClasses(this: JSCodeshift) {
      return this.find(j.ClassDeclaration).filter(isTopLevel);
    },
    getTopLevelFunctions(this: JSCodeshift) {
      return this.find(j.FunctionDeclaration).filter(isTopLevel);
    },
    getTopLevelVariables(this: JSCodeshift) {
      return this.find(j.VariableDeclaration).filter(isTopLevel);
    },
    getTopLevelClassByName(this: JSCodeshift, className) {
      return this.find(j.ClassDeclaration, {
        id: { type: 'Identifier', name: className },
      }).filter(isTopLevel);
    },
    getTopLevelFunctionByName(this: JSCodeshift, className) {
      return this.find(j.FunctionDeclaration, {
        id: { type: 'Identifier', name: className },
      }).filter(isTopLevel);
    },
    getTopLevelVariableByName(this: JSCodeshift, varName) {
      return this.find(j.VariableDeclaration, {
        declarations: [
          {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: varName },
          },
        ],
      }).filter(isTopLevel);
    },
    getImportedVarNames(this: JSCodeshift) {
      const identifiers: any[] = [];
      this.find(j.ImportDeclaration).forEach(path => {
        const importDeclaration = path.value;
        importDeclaration.specifiers.forEach(specifier => {
          identifiers.push(specifier.local.name);
        });
      });
      return identifiers;
    },
    getNamedExportedClassNames(this: JSCodeshift) {
      const identifiers: any[] = [];
      this.getNamedExportedClasses().forEach(path => {
        const exportNamedDeclaration = path.value;
        identifiers.push(exportNamedDeclaration.declaration.id.name);
      });
      return identifiers;
    },
    getNamedExportedFunctionNames(this: JSCodeshift) {
      const identifiers: any[] = [];
      this.getNamedExportedFunctions().forEach(path => {
        const exportNamedDeclaration = path.value;
        identifiers.push(exportNamedDeclaration.declaration.id.name);
      });
      return identifiers;
    },
    getNamedExportedVarNames(this: JSCodeshift) {
      const identifiers: any[] = [];
      this.getNamedExportedVars().forEach(path => {
        const exportNamedDeclaration = path.value;
        exportNamedDeclaration.declaration.declarations.forEach(declaration => {
          identifiers.push(declaration.id.name);
        });
      });
      return identifiers;
    },
    getTopLevelClassNames(this: JSCodeshift) {
      const identifiers: any[] = [];
      this.getTopLevelClasses().forEach(path => {
        const classDeclaration = path.value;
        identifiers.push(classDeclaration.id.name);
      });
      return identifiers;
    },
    getTopLevelFunctionNames(this: JSCodeshift) {
      const identifiers: any[] = [];
      this.getTopLevelFunctions().forEach(path => {
        const functionDeclaration = path.value;
        identifiers.push(functionDeclaration.id.name);
      });
      return identifiers;
    },
    getTopLevelVariableNames(this: JSCodeshift) {
      const identifiers: any[] = [];
      this.getTopLevelVariables().forEach(path => {
        const variableDeclaration = path.value;
        variableDeclaration.declarations.forEach(declaration => {
          identifiers.push(declaration.id.name);
        });
      });
      return identifiers;
    },
    getTopLevelVarNames(this: JSCodeshift) {
      return [].concat(
        this.getImportedVarNames(),
        this.getNamedExportedClassNames(),
        this.getNamedExportedFunctionNames(),
        this.getNamedExportedVarNames(),
        this.getTopLevelClassNames(),
        this.getTopLevelFunctionNames(),
        this.getTopLevelVariableNames(),
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
