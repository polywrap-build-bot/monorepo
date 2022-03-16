import { InvokableModules, MetaManifest } from "@web3api/core-js";
import { TypeInfo } from "@web3api/schema-parse";
import { camelCase, upperFirst } from "lodash";

export type PluginContextOptions = {
  typeInfo: TypeInfo;
};

export type PluginContextModules = {
  [module in InvokableModules]?: {
    env?: {
      modulePath: string;
    };
    modulePath: string;
  };
};

export type PluginContext = {
  className: string;
  funcName: string;
  modules: PluginContextModules;
};

export function createPluginContext(opts: PluginContextOptions): PluginContext {
  // Use name from manifest if specified otherwise call it NewPlugin by default
  const funcName = camelCase(
    !opts.metaManifest ? "new" : opts.metaManifest.name
  );
  const className = upperFirst(funcName);
  const modules: PluginContextModules = {};
  for (const [module, paths] of Object.entries(opts.manifest.modules)) {
    const invokableModule = module as InvokableModules;
    if (!paths) {
      throw new Error(
        `Manifest is missing module and schema paths for ${invokableModule}`
      );
    }
    if (!paths.module) {
      throw new Error(
        `Manifest is missing a module path for ${invokableModule}`
      );
    }

    const modulePath = toImportablePath(paths.module);
    let envModulePath: string | undefined;
    if (opts.typeInfo.envTypes[module as InvokableModules]) {
      if (opts.typeInfo.envTypes[invokableModule].sanitized) {
        envModulePath = `${modulePath}/w3`;
      }
    }
    modules[invokableModule] = {
      modulePath: toImportablePath(paths.module),
      env: envModulePath ? { modulePath: envModulePath } : undefined,
    };
  }
  return {
    className,
    funcName,
    modules,
  };
}

// TODO: use path library + move into utils/path
function toImportablePath(path: string): string {
  // Remove the leading `./`
  if (path.startsWith("./")) {
    path = path.substring(2);
  }

  // Remove the trailing index.js/index.ts otherwise remove the file extension
  if (path.endsWith("index.ts") || path.endsWith("index.js")) {
    path = path.substring(0, path.length - 8);
  } else if (path.endsWith(".ts") || path.endsWith(".js")) {
    path = path.substring(0, path.length - 3);
  }

  // Remove trailing slashes
  if (path.endsWith("/")) {
    path = path.substring(0, path.length - 1);
  }

  return path;
}
