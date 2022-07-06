/* eslint-disable */
/**
 * This file was automatically generated by scripts/manifest/deserialize-ts.mustache.
 * DO NOT MODIFY IT BY HAND. Instead, modify scripts/manifest/deserialize-ts.mustache,
 * and run node ./scripts/manifest/generateFormatTypes.js to regenerate this file.
 */

import {
  InfraManifest,
  AnyInfraManifest,
  migrateInfraManifest,
  validateInfraManifest,
  latestInfraManifestFormat,
} from ".";
import { DeserializeManifestOptions } from "../../";

import { compare } from "semver";
import YAML from "js-yaml";

export function deserializeInfraManifest(
  manifest: string,
  options?: DeserializeManifestOptions
): InfraManifest {
  let anyInfraManifest: AnyInfraManifest | undefined;
  try {
    anyInfraManifest = JSON.parse(manifest) as AnyInfraManifest;
  } catch (e) {
    anyInfraManifest = YAML.safeLoad(manifest) as
    | AnyInfraManifest
    | undefined;
  }

  if (!anyInfraManifest) {
    throw Error(`Unable to parse InfraManifest: ${manifest}`);
  }

  if (!options || !options.noValidate) {
    validateInfraManifest(anyInfraManifest, options?.extSchema);
  }

  anyInfraManifest.__type = "InfraManifest";

  const versionCompare = compare(
    anyInfraManifest.format,
    latestInfraManifestFormat
  );

  if (versionCompare === -1) {
    // Upgrade
    return migrateInfraManifest(anyInfraManifest, latestInfraManifestFormat);
  } else if (versionCompare === 1) {
    // Downgrade
    throw Error(
      `Cannot downgrade Polywrap version ${anyInfraManifest.format}, please upgrade your PolywrapClient package.`
    );
  } else {
    // Latest
    return anyInfraManifest as InfraManifest;
  }
}
