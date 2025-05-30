import expect from 'expect';
import { it } from 'mocha';

import plugin from './replace-utils';
import { runTransform } from './testing';

it('import path', async () => {
  const result = await runTransform(
    plugin,
    `import { env } from "@noodoo/utils"`,
  );

  expect(result.lines[0]).toEqual('import { env } from "@flow/utils"');
});

it('require path', async () => {
  const result = await runTransform(
    plugin,
    `const { env } = require("@noodoo/utils")`,
  );

  expect(result.lines[0]).toEqual('const { env } = require("@flow/utils")');
});

it('import default', async () => {
  const result = await runTransform(
    plugin,
    `
import utils from '@noodoo/utils'
const { env, G } = utils;
    `,
  );
  expect(result.lines[0]).toEqual('import { env, G } from "@flow/utils"');
  expect(result.lines[1]?.trim()).toBeFalsy();
});

it('replace with destructuring', async () => {
  const result = await runTransform(
    plugin,
    `
import * as utils from "@flow/utils";
const { seq: sequence, G } = utils;
    `,
  );

  expect(result.lines[0]).toEqual(
    'import { seq as sequence, G } from "@flow/utils"',
  );
  expect(result.lines[1]?.trim()).toBeFalsy();
});

it('replace no destructuring', async () => {
  const result = await runTransform(
    plugin,
    `
import utils from "@noodoo/utils"

const sum = utils.sum
const getter = utils.G
    `,
  );

  expect(result.lines[0]).toEqual(
    'import { sum, G as getter } from "@flow/utils"',
  );
  expect(result.lines[1]?.trim()).toBeFalsy();
});

it('require no destructuring', async () => {
  const result = await runTransform(
    plugin,
    `
var utils = require('@noodoo/utils');

var getter = utils.G;
var eql = utils.eql;
    `,
  );

  expect(result.content?.replaceAll(/\s+/g, ' ')).toContain(
    'var { G: getter, eql } = require("@flow/utils")',
  );
});
