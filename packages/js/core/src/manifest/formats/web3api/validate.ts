/* eslint-disable */
/**
 * This file was automatically generated by scripts/manifest/validate-ts.mustache.
 * DO NOT MODIFY IT BY HAND. Instead, modify scripts/manifest/validate-ts.mustache,
 * and run node ./scripts/manifest/generateFormatTypes.js to regenerate this file.
 */
import {
  AnyWeb3ApiManifest,
  Web3ApiManifestFormats
} from ".";
import * as Validators from "../../validators";

import schema_0_0_1_prealpha_1 from "@web3api/manifest-schemas/formats/web3api/0.0.1-prealpha.1.json";
import schema_0_0_1_prealpha_2 from "@web3api/manifest-schemas/formats/web3api/0.0.1-prealpha.2.json";
import schema_0_0_1_prealpha_3 from "@web3api/manifest-schemas/formats/web3api/0.0.1-prealpha.3.json";
import schema_0_0_1_prealpha_4 from "@web3api/manifest-schemas/formats/web3api/0.0.1-prealpha.4.json";
import schema_0_0_1_prealpha_5 from "@web3api/manifest-schemas/formats/web3api/0.0.1-prealpha.5.json";
import { Tracer } from "@web3api/tracing-js"

import {
  Schema,
  Validator,
  ValidationError,
  ValidatorResult
} from "jsonschema";

type Web3ApiManifestSchemas = {
  [key in Web3ApiManifestFormats]: Schema | undefined
};

const schemas: Web3ApiManifestSchemas = {
  "0.0.1-prealpha.1": schema_0_0_1_prealpha_1,
  "0.0.1-prealpha.2": schema_0_0_1_prealpha_2,
  "0.0.1-prealpha.3": schema_0_0_1_prealpha_3,
  "0.0.1-prealpha.4": schema_0_0_1_prealpha_4,
  "0.0.1-prealpha.5": schema_0_0_1_prealpha_5,
};

const validator = new Validator();

Validator.prototype.customFormats.file = Validators.file;
Validator.prototype.customFormats.wasmLanguage = Validators.wasmLanguage;
Validator.prototype.customFormats.yamlFile = Validators.yamlFile;
Validator.prototype.customFormats.graphqlFile = Validators.graphqlFile;

export const validateWeb3ApiManifest = Tracer.traceFunc(
  "core: validateWeb3ApiManifest",
  (
    manifest: AnyWeb3ApiManifest,
    extSchema: Schema | undefined = undefined
  ): void => {
    const schema = schemas[manifest.format as Web3ApiManifestFormats];

    if (!schema) {
      throw Error(`Unrecognized Web3ApiManifest schema format "${manifest.format}"`);
    }

    const throwIfErrors = (result: ValidatorResult) => {
      if (result.errors.length) {
        throw new Error([
          `Validation errors encountered while sanitizing Web3ApiManifest format ${manifest.format}`,
          ...result.errors.map((error: ValidationError) => error.toString())
        ].join("\n"));
      }
    };

    throwIfErrors(validator.validate(manifest, schema));

    if (extSchema) {
      throwIfErrors(validator.validate(manifest, extSchema));
    }
  }
);
