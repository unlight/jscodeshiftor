import { Transform } from 'jscodeshift';

import { getNodeStart } from './utils.ts';

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const source = file.source;

  // Process from bottom to top to avoid position issues
  const objectPaths = j(source)
    .find(j.ObjectExpression)
    .paths()
    .sort((a, b) => (getNodeStart(b.node) || 0) - (getNodeStart(a.node) || 0));

  let modifiedSource = source;

  for (const path of objectPaths) {
    const { node } = path;
    if (!node.properties || node.properties.length <= 1) continue;
    if (!node.loc) continue;

    // Skip single-line objects
    if (node.loc.start.line === node.loc.end.line) continue;

    // Check for extra line breaks at this object level
    let hasExtraLineBreaks = false;
    for (let i = 1; i < node.properties.length; i++) {
      const prev = node.properties[i - 1];
      const curr = node.properties[i];

      if (
        prev?.loc &&
        curr?.loc &&
        curr.loc.start.line > prev.loc.end.line + 1
      ) {
        hasExtraLineBreaks = true;
        break;
      }
    }

    if (hasExtraLineBreaks) {
      // Format just this specific object
      const formatted = formatObject(modifiedSource, node.loc);
      if (formatted) {
        modifiedSource = formatted;
      }
    }
  }

  return modifiedSource;
};

function formatObject(source: string, loc: any): string | null {
  const lines = source.split('\n');
  const startLine = loc.start.line - 1;
  const endLine = loc.end.line - 1;

  // Extract the object content
  const before = lines.slice(0, startLine);
  const after = lines.slice(endLine + 1);
  const objectLines = lines.slice(startLine, endLine + 1);

  // Process to remove extra line breaks at top level
  let braceDepth = 0;
  const resultLines: string[] = [];
  let propertyBuffer: string[] = [];
  let inTopLevelProperty = false;

  for (const line of objectLines) {
    const trimmed = line.trim();

    // Update brace depth
    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;

    if (braceDepth === 1 && trimmed !== '') {
      // We're in a top-level property line
      propertyBuffer.push(line);
      inTopLevelProperty = true;
    } else if (braceDepth === 1 && trimmed === '') {
      // Top-level empty line - skip it (removes extra line breaks)
      if (propertyBuffer.length > 0) {
        resultLines.push(...propertyBuffer);
        propertyBuffer = [];
      }
    } else {
      // Not in top-level (either in nested structure or outside object)
      if (propertyBuffer.length > 0) {
        resultLines.push(...propertyBuffer);
        propertyBuffer = [];
      }
      resultLines.push(line);
    }
  }

  // Add any remaining buffered lines
  if (propertyBuffer.length > 0) {
    resultLines.push(...propertyBuffer);
  }

  const newObjectLines = resultLines;

  // Check if anything changed
  if (objectLines.join('\n') === newObjectLines.join('\n')) {
    return null;
  }

  return [...before, ...newObjectLines, ...after].join('\n');
}

export default transform;
