import {
  step,
  withSpinner,
  isTypescriptFile,
  importTypescriptModule,
  web3apiManifestLanguages,
  isWeb3ApiManifestLanguage,
  web3apiManifestLanguageToBindLanguage,
  pluginManifestLanguages,
  isPluginManifestLanguage,
  pluginManifestLanguageToBindLanguage,
  appManifestLanguages,
  isAppManifestLanguage,
  appManifestLanguageToBindLanguage,
  Project,
  AnyManifest,
  SchemaComposer,
  intlMsg,
} from "./";

import { InvokableModules, TypeInfo } from "@web3api/schema-parse";
import {
  OutputDirectory,
  writeDirectory,
  bindSchema,
  BindLanguage,
  GenerateBindingFn,
} from "@web3api/schema-bind";
import path from "path";
import fs, { readFileSync, existsSync, mkdirSync } from "fs";
import * as gluegun from "gluegun";
import { Ora } from "ora";
import Mustache from "mustache";
import { ComposerOutput } from "@web3api/schema-compose";
import { Manifest, PluginManifest, Web3ApiManifest } from "@web3api/core-js";
import rimraf from "rimraf";

export { OutputDirectory };

type ModulesToBuild = Record<InvokableModules, boolean>;

export interface CustomScriptConfig {
  typeInfo: TypeInfo;
  generate: (templatePath: string, config: unknown) => string;
}

export type CustomScriptRunFn = (
  output: OutputDirectory,
  config: CustomScriptConfig
) => void;

export interface CodeGeneratorState {
  manifest: PluginManifest | Web3ApiManifest;
  composerOutput: ComposerOutput;
  modulesToBuild: ModulesToBuild;
}

export interface CodeGeneratorConfig {
  outputDir: string;
  project: Project<AnyManifest>;
  schemaComposer: SchemaComposer;
  customScript?: string;
  mustacheView?: Record<string, unknown>;
}

export class CodeGenerator {
  private _schema: string | undefined = "";

  constructor(private _config: CodeGeneratorConfig) {}

  public async generate(config?: Record<string, unknown>): Promise<boolean> {
    try {
      // Compile the API
      await this._generateCode(config);

      return true;
    } catch (e) {
      gluegun.print.error(e);
      return false;
    }
  }

  private async _generateCode(config?: Record<string, unknown>) {
    const { schemaComposer, project } = this._config;

    const run = async (spinner?: Ora) => {
      const language = await project.getManifestLanguage();
      let bindLanguage: BindLanguage | undefined;

      if (isWeb3ApiManifestLanguage(language)) {
        bindLanguage = web3apiManifestLanguageToBindLanguage(language);
      } else if (isPluginManifestLanguage(language)) {
        bindLanguage = pluginManifestLanguageToBindLanguage(language);
      } else if (isAppManifestLanguage(language)) {
        bindLanguage = appManifestLanguageToBindLanguage(language);
      }

      if (!bindLanguage) {
        throw Error(
          intlMsg.lib_language_unsupportedManifestLanguage({
            language: language,
            supported: [
              ...Object.keys(web3apiManifestLanguages),
              ...Object.keys(pluginManifestLanguages),
              ...Object.keys(appManifestLanguages),
            ].join(", "),
          })
        );
      }

      // Make sure the output dir is reset
      this._resetDir(this._config.outputDir);

      // Get the fully composed schema
      const composed = await schemaComposer.getComposedSchemas();

      if (!composed.combined) {
        throw Error(intlMsg.lib_codeGenerator_noComposedSchema());
      }

      const typeInfo = composed.combined.typeInfo;
      this._schema = composed.combined.schema;

      if (!typeInfo) {
        throw Error(intlMsg.lib_codeGenerator_typeInfoMissing());
      }

      if (this._config.customScript) {
        const output: OutputDirectory = {
          entries: [],
        };
        const customScript = this._config.customScript;

        // Check the generation file if it has the proper run() method
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const generator = isTypescriptFile(customScript)
          ? await importTypescriptModule(customScript)
          : // eslint-disable-next-line @typescript-eslint/no-require-imports
            await require(customScript);

        if (!generator) {
          throw Error(intlMsg.lib_codeGenerator_wrongGenFile());
        }

        const { generateBinding } = generator as {
          generateBinding: GenerateBindingFn;
        };
        if (!generateBinding) {
          throw Error(intlMsg.lib_codeGenerator_nogenerateBindingMethod());
        }

        await generateBinding(
          output,
          typeInfo,
          this._schema || "",
          config || {}
        );

        writeDirectory(this._config.outputDir, output, (templatePath: string) =>
          this._generateTemplate(templatePath, typeInfo, spinner)
        );
      } else {
        const { project } = this._config;

        // Get the Web3ApiManifest
        const manifest = await project.getManifest<PluginManifest>();
        const metaManifest = await project.getMetaManifest();
        const modulesToBuild = this._getModulesToBuild(manifest);
        const entrypoint = manifest.entrypoint;
        const entrypointDirectory = manifest.entrypoint
          ? this._getGenerationDirectory(entrypoint, "")
          : undefined;

        const queryModule = manifest.modules.query?.module as string;
        const queryDirectory = manifest.modules.query
          ? this._getGenerationDirectory(entrypoint, queryModule)
          : undefined;
        const mutationModule = manifest.modules.mutation?.module as string;
        const mutationDirectory = manifest.modules.mutation
          ? this._getGenerationDirectory(entrypoint, mutationModule)
          : undefined;

        // Clean the code generation
        if (entrypointDirectory) {
          this._resetDir(entrypointDirectory);
        }

        if (queryDirectory) {
          this._resetDir(queryDirectory);
        }

        if (mutationDirectory) {
          this._resetDir(mutationDirectory);
        }

        const content = bindSchema({
          entrypoint: this._schema
            ? {
                manifest,
                metaManifest,
                typeInfo: composed.combined?.typeInfo as TypeInfo,
                schema: this._schema,
                outputDirAbs: entrypointDirectory as string,
              }
            : undefined,
          query: modulesToBuild.query
            ? {
                typeInfo: composed.query?.typeInfo as TypeInfo,
                outputDirAbs: queryDirectory as string,
              }
            : undefined,
          mutation: modulesToBuild.mutation
            ? {
                typeInfo: composed.mutation?.typeInfo as TypeInfo,
                outputDirAbs: mutationDirectory as string,
              }
            : undefined,
          bindLanguage,
        });

        // Output the bindings
        const filesWritten: string[] = [];

        if (content.entrypoint && entrypointDirectory) {
          filesWritten.push(
            ...writeDirectory(
              entrypointDirectory,
              content.entrypoint as OutputDirectory
            )
          );
        }

        if (content.query && queryDirectory) {
          filesWritten.push(
            ...writeDirectory(queryDirectory, content.query as OutputDirectory)
          );
        }

        if (content.mutation && mutationDirectory) {
          filesWritten.push(
            ...writeDirectory(
              mutationDirectory,
              content.mutation as OutputDirectory
            )
          );
        }

        // return filesWritten;
      }
    };

    if (project.quiet) {
      await run();
    } else {
      await withSpinner(
        intlMsg.lib_codeGenerator_genCodeText(),
        intlMsg.lib_codeGenerator_genCodeError(),
        intlMsg.lib_codeGenerator_genCodeWarning(),
        async (spinner) => {
          return run(spinner);
        }
      );
    }
  }

  private _getModulesToBuild(manifest: Manifest): ModulesToBuild {
    const manifestMutation = manifest.modules.mutation;
    const manifestQuery = manifest.modules.query;
    const modulesToBuild: ModulesToBuild = {
      mutation: false,
      query: false,
    };

    if (manifestMutation) {
      modulesToBuild.mutation = true;
    }

    if (manifestQuery) {
      modulesToBuild.query = true;
    }

    return modulesToBuild;
  }

  private _getGenerationDirectory(
    entrypoint: string,
    modulePath: string
  ): string {
    const { project } = this._config;

    const absolute = path.isAbsolute(entrypoint)
      ? entrypoint
      : path.join(project.getRootDir(), entrypoint, modulePath);

    const genDir = !path.extname(absolute)
      ? path.join(absolute, "w3")
      : path.join(path.dirname(absolute), "w3");

    if (!existsSync(genDir)) {
      mkdirSync(genDir);
    }
    return genDir;
  }

  private _generateTemplate(
    templatePath: string,
    config: unknown,
    spinner?: Ora
  ): string {
    const { project } = this._config;

    if (!project.quiet && spinner) {
      const stepMessage = intlMsg.lib_codeGenerator_genTemplateStep({
        path: `${templatePath}`,
      });
      step(spinner, stepMessage);
    }

    if (this._config.customScript) {
      // Update template path when the generation file is given
      templatePath = path.join(
        path.dirname(this._config.customScript),
        templatePath
      );
    }

    const template = readFileSync(templatePath);
    const types =
      typeof config === "object" && config !== null ? config : { config };
    let content = Mustache.render(template.toString(), {
      ...types,
      schema: this._schema,
      ...this._config.mustacheView,
    });

    content = `// ${intlMsg.lib_codeGenerator_templateNoModify()}

${content}
`;

    return content;
  }

  private _resetDir(dir: string) {
    if (fs.existsSync(dir)) {
      rimraf.sync(dir);
    }

    fs.mkdirSync(dir, { recursive: true });
  }
}
