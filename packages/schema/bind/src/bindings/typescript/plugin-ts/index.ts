/* eslint-disable @typescript-eslint/naming-convention */
import * as Functions from "../functions";
import { GenerateBindingFn } from "../..";
import { OutputDirectory } from "../../..";

import { Manifest, MetaManifest } from "@web3api/core-js";
import {
  addFirstLast,
  extendType,
  ImportedQueryDefinition,
  interfaceUris,
  TypeInfo,
  ModuleDefinition,
} from "@web3api/schema-parse";
import { readFileSync } from "fs";
import Mustache from "mustache";
import path from "path";

export { Functions };

export function generateEntrypointBinding(
  typeInfo: TypeInfo,
  schema: string,
  manifest: Manifest,
  metaManifest?: MetaManifest
): OutputDirectory {
  const entries: OutputEntry[] = [];

  renderTemplate("./templates/entrypoint/index-ts.mustache", {}, entries);
  renderTemplate("./templates/entrypoint/manifest-ts.mustache", {}, entries);
  renderTemplate(
    "./templates/entrypoint/schema-ts.mustache",
    { schema },
    entries
  );
  renderTemplate(
    "./templates/entrypoint/plugin-ts.mustache",
    createPluginContext({ typeInfo, manifest, metaManifest }),
    entries
  );

  return { entries };
}

export const generateBinding: GenerateBindingFn = (
  output: OutputDirectory,
  typeInfo: TypeInfo,
  schema: string,
  _config: Record<string, unknown>
): void => {
  // Transform the TypeInfo to our liking
  const transforms = [
    extendType(Functions),
    addFirstLast,
    toPrefixedGraphQLType,
    methodParentPointers(),
    interfaceUris(),
  ];

  for (const transform of transforms) {
    typeInfo = transformTypeInfo(typeInfo, transform);
  }

  const renderTemplate = (
    subPath: string,
    context: unknown,
    fileName?: string
  ) => {
    const absPath = path.join(__dirname, subPath);
    const template = readFileSync(absPath, { encoding: "utf-8" });
    fileName =
      fileName ||
      absPath
        .replace(path.dirname(absPath), "")
        .replace(".mustache", "")
        .replace("/", "")
        .replace("\\", "")
        .replace("-", ".");

    output.entries.push({
      type: "File",
      name: fileName,
      data: Mustache.render(template, context),
    });
  };

  const queryContext = typeInfo.moduleTypes.find((def: ModuleDefinition) => {
    return def.type === "Query";
  });
  const mutationContext = typeInfo.moduleTypes.find((def: ModuleDefinition) => {
    return def.type === "Mutation";
  });

  const rootContext = {
    ...typeInfo,
    __mutation: !!mutationContext,
    __query: !!queryContext,
  };

  renderTemplate("./templates/index-ts.mustache", rootContext);
  renderTemplate("./templates/manifest-ts.mustache", rootContext);
  if (mutationContext) {
    renderTemplate(
      "./templates/module_ts.mustache",
      mutationContext,
      "mutation.ts"
    );
  }
  if (queryContext) {
    renderTemplate("./templates/module_ts.mustache", queryContext, "query.ts");
  }
  renderTemplate("./templates/schema-ts.mustache", rootContext);
  renderTemplate("./templates/types-ts.mustache", rootContext);
};
