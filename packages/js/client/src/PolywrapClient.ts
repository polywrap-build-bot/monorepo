import {
  Wrapper,
  Client,
  ClientConfig,
  Env,
  GetFileOptions,
  GetImplementationsOptions,
  InterfaceImplementations,
  InvokeOptions,
  InvokerOptions,
  PluginRegistration,
  QueryOptions,
  SubscribeOptions,
  Subscription,
  Uri,
  UriRedirect,
  createQueryDocument,
  getImplementations,
  parseQuery,
  TryResolveUriOptions,
  IUriResolver,
  GetManifestOptions,
  IUriResolutionContext,
  UriPackageOrWrapper,
  UriResolutionContext,
  getEnvFromUriHistory,
  PluginPackage,
  QueryResult,
  InvokeResult,
  buildCleanUriHistory,
  WrapError,
  WrapErrorCode,
} from "@polywrap/core-js";
import { IWrapperCache } from "@polywrap/uri-resolvers-js";
import { msgpackEncode, msgpackDecode } from "@polywrap/msgpack-js";
import {
  DeserializeManifestOptions,
  WrapManifest,
} from "@polywrap/wrap-manifest-types-js";
import { Tracer, TracerConfig, TracingLevel } from "@polywrap/tracing-js";
import { ClientConfigBuilder } from "@polywrap/client-config-builder-js";
import { Result, ResultErr, ResultOk } from "@polywrap/result";

export interface PolywrapClientConfig<TUri extends Uri | string = string>
  extends ClientConfig<TUri> {
  readonly tracerConfig: Readonly<Partial<TracerConfig>>;
  readonly wrapperCache?: Readonly<IWrapperCache>;
}

export class PolywrapClient implements Client {
  private _config: PolywrapClientConfig<Uri> = ({
    redirects: [],
    plugins: [],
    interfaces: [],
    envs: [],
    tracerConfig: {},
  } as unknown) as PolywrapClientConfig<Uri>;

  /**
   * Instantiate a PolywrapClient
   *
   * @param config - a whole or partial client configuration
   * @param options - { noDefaults?: boolean }
   */
  constructor(
    config?: Partial<PolywrapClientConfig<string | Uri>>,
    options?: { noDefaults?: boolean }
  ) {
    try {
      this.setTracingEnabled(config?.tracerConfig);

      Tracer.startSpan("PolywrapClient: constructor");

      const builder = new ClientConfigBuilder();

      if (!options?.noDefaults) {
        builder.addDefaults(config?.wrapperCache);
      }

      if (config) {
        builder.add(config);
      }

      const sanitizedConfig = builder.build();

      this._config = {
        ...sanitizedConfig,
        tracerConfig: {
          consoleEnabled: !!config?.tracerConfig?.consoleEnabled,
          consoleDetailed: config?.tracerConfig?.consoleDetailed,
          httpEnabled: !!config?.tracerConfig?.httpEnabled,
          httpUrl: config?.tracerConfig?.httpUrl,
          tracingLevel: config?.tracerConfig?.tracingLevel,
        },
      };

      this._validateConfig();

      Tracer.setAttribute("config", this._config);
    } catch (error) {
      Tracer.recordException(error);
      throw error;
    } finally {
      Tracer.endSpan();
    }
  }

  /**
   * Returns the configuration used to instantiate the client
   *
   * @returns an immutable Polywrap client config
   */
  public getConfig(): PolywrapClientConfig<Uri> {
    return this._config;
  }

  /**
   * Enable tracing for intricate debugging
   *
   * @remarks
   * Tracing uses the @polywrap/tracing-js package
   *
   * @param tracerConfig - configure options such as the tracing level
   * @returns void
   */
  public setTracingEnabled(tracerConfig?: Partial<TracerConfig>): void {
    if (tracerConfig?.consoleEnabled || tracerConfig?.httpEnabled) {
      Tracer.enableTracing("PolywrapClient", tracerConfig);
    } else {
      Tracer.disableTracing();
    }
    this._config = {
      ...this._config,
      tracerConfig: tracerConfig ?? {},
    };
  }

  /**
   * returns all uri redirects from the configuration used to instantiate the client
   *
   * @returns an array of uri redirects
   */
  @Tracer.traceMethod("PolywrapClient: getRedirects")
  public getRedirects(): readonly UriRedirect<Uri>[] {
    return this._config.redirects;
  }

  /**
   * returns all plugin registrations from the configuration used to instantiate the client
   *
   * @returns an array of plugin registrations
   */
  @Tracer.traceMethod("PolywrapClient: getPlugins")
  public getPlugins(): readonly PluginRegistration<Uri>[] {
    return this._config.plugins;
  }

  /**
   * returns a plugin package from the configuration used to instantiate the client
   *
   * @param uri - the uri used to register the plugin
   * @returns a plugin package, or undefined if a plugin is not found at the given uri
   */
  @Tracer.traceMethod("PolywrapClient: getPlugin")
  public getPluginByUri<TUri extends Uri | string>(
    uri: TUri
  ): PluginPackage<unknown> | undefined {
    return this.getPlugins().find((x) => Uri.equals(x.uri, Uri.from(uri)))
      ?.plugin;
  }

  /**
   * returns all interfaces from the configuration used to instantiate the client
   *
   * @returns an array of interfaces and their registered implementations
   */
  @Tracer.traceMethod("PolywrapClient: getInterfaces")
  public getInterfaces(): readonly InterfaceImplementations<Uri>[] {
    return this._config.interfaces;
  }

  /**
   * returns all env registrations from the configuration used to instantiate the client
   *
   * @returns an array of env objects containing wrapper environmental variables
   */
  @Tracer.traceMethod("PolywrapClient: getEnvs")
  public getEnvs(): readonly Env<Uri>[] {
    return this._config.envs;
  }

  /**
   * returns the URI resolver from the configuration used to instantiate the client
   *
   * @returns an object that implements the IUriResolver interface
   */
  @Tracer.traceMethod("PolywrapClient: getUriResolver")
  public getUriResolver(): IUriResolver<unknown> {
    return this._config.resolver;
  }

  /**
   * returns an env (a set of environmental variables) from the configuration used to instantiate the client
   *
   * @param uri - the URI used to register the env
   * @returns an env, or undefined if an env is not found at the given URI
   */
  @Tracer.traceMethod("PolywrapClient: getEnvByUri")
  public getEnvByUri<TUri extends Uri | string>(
    uri: TUri
  ): Env<Uri> | undefined {
    const uriUri = Uri.from(uri);

    return this.getEnvs().find((environment) =>
      Uri.equals(environment.uri, uriUri)
    );
  }

  /**
   * returns a package's wrap manifest
   *
   * @param uri - a wrap URI
   * @param options - { noValidate?: boolean }
   * @returns a Result containing the WrapManifest if the request was successful
   */
  @Tracer.traceMethod("PolywrapClient: getManifest")
  public async getManifest<TUri extends Uri | string>(
    uri: TUri,
    options: GetManifestOptions = {}
  ): Promise<Result<WrapManifest, WrapError>> {
    const load = await this.loadWrapper(Uri.from(uri), undefined);
    if (!load.ok) {
      return load;
    }
    const wrapper = load.value;
    const manifest = wrapper.getManifest(options);

    return ResultOk(manifest);
  }

  /**
   * returns a file contained in a wrap package
   *
   * @param uri - a wrap URI
   * @param options - { path: string; encoding?: "utf-8" | string }
   * @returns a Promise of a Result containing a file if the request was successful
   */
  @Tracer.traceMethod("PolywrapClient: getFile")
  public async getFile<TUri extends Uri | string>(
    uri: TUri,
    options: GetFileOptions
  ): Promise<Result<string | Uint8Array, WrapError>> {
    const load = await this.loadWrapper(Uri.from(uri), undefined);
    if (!load.ok) {
      return load;
    }
    const wrapper = load.value;

    const result = await wrapper.getFile(options);
    if (!result.ok) {
      const error = new WrapError(result.error?.message, {
        code: WrapErrorCode.CLIENT_GET_FILE_ERROR,
        uri: uri.toString(),
      });
      return ResultErr(error);
    }
    return ResultOk(result.value);
  }

  /**
   * returns the interface implementations associated with an interface URI
   *  from the configuration used to instantiate the client
   *
   * @param uri - a wrap URI
   * @param options - { applyRedirects?: boolean }
   * @returns a Result containing URI array if the request was successful
   */
  @Tracer.traceMethod("PolywrapClient: getImplementations")
  public getImplementations<TUri extends Uri | string>(
    uri: TUri,
    options: GetImplementationsOptions = {}
  ): Result<TUri[], WrapError> {
    const isUriTypeString = typeof uri === "string";
    const applyRedirects = !!options.applyRedirects;

    const getImplResult = getImplementations(
      Uri.from(uri),
      this.getInterfaces(),
      applyRedirects ? this.getRedirects() : undefined
    );

    if (!getImplResult.ok) {
      return getImplResult;
    }

    const uris = isUriTypeString
      ? (getImplResult.value.map((x: Uri) => x.uri) as TUri[])
      : (getImplResult.value as TUri[]);

    return ResultOk(uris);
  }

  /**
   * Invoke a wrapper using GraphQL query syntax
   *
   * @remarks
   * This method behaves similar to the invoke method and allows parallel requests,
   * but the syntax is more verbose. If the query is successful, data will be returned
   * and the `error` value of the returned object will be undefined. If the query fails,
   * the data property will be undefined and the error property will be populated.
   *
   * @param options - {
   *   // The Wrapper's URI
   *   uri: TUri;
   *
   *   // The GraphQL query to parse and execute, leading to one or more Wrapper invocations.
   *   query: string | QueryDocument;
   *
   *   // Variables referenced within the query string via GraphQL's '$variable' syntax.
   *   variables?: TVariables;
   * }
   *
   * @returns A Promise containing an object with either the data or an error
   */
  @Tracer.traceMethod("PolywrapClient: query", TracingLevel.High)
  public async query<
    TData extends Record<string, unknown> = Record<string, unknown>,
    TVariables extends Record<string, unknown> = Record<string, unknown>,
    TUri extends Uri | string = string
  >(options: QueryOptions<TVariables, TUri>): Promise<QueryResult<TData>> {
    let result: QueryResult<TData>;

    try {
      const typedOptions: QueryOptions<TVariables, Uri> = {
        ...options,
        uri: Uri.from(options.uri),
      };

      const { uri, query, variables } = typedOptions;

      // Convert the query string into a query document
      const queryDocument =
        typeof query === "string" ? createQueryDocument(query) : query;

      // Parse the query to understand what's being invoked
      const parseResult = parseQuery(uri, queryDocument, variables);
      if (!parseResult.ok) {
        const error = new WrapError(
          `Failed to parse query: ${parseResult.error}`,
          {
            code: WrapErrorCode.WRAPPER_ARGS_MALFORMED,
            uri: options.uri.toString(),
          }
        );
        return { errors: [error] };
      }
      const queryInvocations = parseResult.value;

      // Execute all invocations in parallel
      const parallelInvocations: Promise<{
        name: string;
        result: InvokeResult<unknown>;
      }>[] = [];

      for (const invocationName of Object.keys(queryInvocations)) {
        parallelInvocations.push(
          this.invoke({
            ...queryInvocations[invocationName],
            uri: queryInvocations[invocationName].uri,
          }).then((result) => ({
            name: invocationName,
            result,
          }))
        );
      }

      // Await the invocations
      const invocationResults = await Promise.all(parallelInvocations);

      Tracer.addEvent("invocationResults", invocationResults);

      // Aggregate all invocation results
      const data: Record<string, unknown> = {};
      const errors: WrapError[] = [];

      for (const invocation of invocationResults) {
        if (invocation.result.ok) {
          data[invocation.name] = invocation.result.value;
        } else {
          errors.push(invocation.result.error as WrapError);
        }
      }

      result = {
        data: data as TData,
        errors: errors.length === 0 ? undefined : errors,
      };
    } catch (error: unknown) {
      const unknownQueryErrorToWrapError = (e: Error): WrapError =>
        new WrapError((e as Error)?.message, {
          code: WrapErrorCode.WRAPPER_INVOKE_FAIL,
          uri: options.uri.toString(),
          cause: e as Error,
        });
      if (Array.isArray(error)) {
        result = { errors: error.map(unknownQueryErrorToWrapError) };
      } else {
        result = { errors: [unknownQueryErrorToWrapError(error as Error)] };
      }
    }

    return result;
  }

  /**
   * Invoke a wrapper using standard syntax and an instance of the wrapper
   *
   * @param options - {
   *   // The Wrapper's URI
   *   uri: TUri;
   *
   *   // Method to be executed.
   *   method: string;
   *
   *   //Arguments for the method, structured as a map, removing the chance of incorrectly ordering arguments.
   *    args?: Record<string, unknown> | Uint8Array;
   *
   *   // Env variables for the wrapper invocation.
   *    env?: Record<string, unknown>;
   *
   *   resolutionContext?: IUriResolutionContext;
   *
   *   // if true, return value is a msgpack-encoded byte array
   *   encodeResult?: boolean;
   * }
   *
   * @returns A Promise with a Result containing the return value or an error
   */
  @Tracer.traceMethod("PolywrapClient: invokeWrapper")
  public async invokeWrapper<
    TData = unknown,
    TUri extends Uri | string = string
  >(
    options: InvokerOptions<TUri> & { wrapper: Wrapper }
  ): Promise<InvokeResult<TData>> {
    try {
      const typedOptions: InvokeOptions<Uri> = {
        ...options,
        uri: Uri.from(options.uri),
      };

      const wrapper = options.wrapper;
      const invocableResult = await wrapper.invoke(typedOptions, this);

      if (!invocableResult.ok) {
        return ResultErr(invocableResult.error);
      }

      const value = invocableResult.value;

      if (options.encodeResult && !invocableResult.encoded) {
        const encoded = msgpackEncode(value);
        return ResultOk((encoded as unknown) as TData);
      } else if (invocableResult.encoded && !options.encodeResult) {
        const decoded = msgpackDecode(value as Uint8Array);
        return ResultOk(decoded as TData);
      } else {
        return ResultOk(value as TData);
      }
    } catch (error) {
      return ResultErr(error);
    }
  }

  /**
   * Invoke a wrapper using standard syntax.
   * Unlike `invokeWrapper`, this method automatically retrieves and caches the wrapper.
   *
   * @param options - {
   *   // The Wrapper's URI
   *   uri: TUri;
   *
   *   // Method to be executed.
   *   method: string;
   *
   *   //Arguments for the method, structured as a map, removing the chance of incorrectly ordering arguments.
   *    args?: Record<string, unknown> | Uint8Array;
   *
   *   // Env variables for the wrapper invocation.
   *    env?: Record<string, unknown>;
   *
   *   resolutionContext?: IUriResolutionContext;
   *
   *   // if true, return value is a msgpack-encoded byte array
   *   encodeResult?: boolean;
   * }
   *
   * @returns A Promise with a Result containing the return value or an error
   */
  @Tracer.traceMethod("PolywrapClient: invoke")
  public async invoke<TData = unknown, TUri extends Uri | string = string>(
    options: InvokerOptions<TUri>
  ): Promise<InvokeResult<TData>> {
    try {
      const typedOptions: InvokeOptions<Uri> = {
        ...options,
        uri: Uri.from(options.uri),
      };

      const resolutionContext =
        options.resolutionContext ?? new UriResolutionContext();

      const loadWrapperResult = await this.loadWrapper(
        typedOptions.uri,
        resolutionContext
      );
      if (!loadWrapperResult.ok) {
        return ResultErr(loadWrapperResult.error);
      }
      const wrapper = loadWrapperResult.value;

      const env = getEnvFromUriHistory(
        resolutionContext.getResolutionPath(),
        this
      );

      const invokeResult = await this.invokeWrapper<TData, Uri>({
        env: env?.env,
        ...typedOptions,
        wrapper,
      });

      if (!invokeResult.ok) {
        return ResultErr(invokeResult.error);
      }

      return invokeResult;
    } catch (error) {
      return ResultErr(error);
    }
  }

  /**
   * Invoke a wrapper at a regular frequency (within ~16ms)
   *
   * @param options - {
   *   // The Wrapper's URI
   *   uri: TUri;
   *
   *   // Method to be executed.
   *   method: string;
   *
   *   //Arguments for the method, structured as a map, removing the chance of incorrectly ordering arguments.
   *    args?: Record<string, unknown> | Uint8Array;
   *
   *   // Env variables for the wrapper invocation.
   *    env?: Record<string, unknown>;
   *
   *   resolutionContext?: IUriResolutionContext;
   *
   *   // if true, return value is a msgpack-encoded byte array
   *   encodeResult?: boolean;
   *
   *   // the frequency at which to perform the invocation
   *   frequency?: {
   *     ms?: number;
   *     sec?: number;
   *     min?: number;
   *     hours?: number;
   *   }
   * }
   *
   * @returns A Promise with a Result containing the return value or an error
   */
  @Tracer.traceMethod("PolywrapClient: subscribe")
  public subscribe<TData = unknown, TUri extends Uri | string = string>(
    options: SubscribeOptions<TUri>
  ): Subscription<TData> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const thisClient: PolywrapClient = this;

    const typedOptions: SubscribeOptions<Uri> = {
      ...options,
      uri: Uri.from(options.uri),
    };
    const { uri, method, args, frequency: freq } = typedOptions;

    // calculate interval between invokes, in milliseconds, 1 min default value
    /* eslint-disable prettier/prettier */
    let frequency: number;
    if (freq && (freq.ms || freq.sec || freq.min || freq.hours)) {
      frequency =
        (freq.ms ?? 0) +
        ((freq.hours ?? 0) * 3600 + (freq.min ?? 0) * 60 + (freq.sec ?? 0)) *
          1000;
    } else {
      frequency = 60000;
    }
    /* eslint-enable  prettier/prettier */

    const subscription: Subscription<TData> = {
      frequency: frequency,
      isActive: false,
      stop(): void {
        subscription.isActive = false;
      },
      async *[Symbol.asyncIterator](): AsyncGenerator<InvokeResult<TData>> {
        let timeout: NodeJS.Timeout | undefined = undefined;
        subscription.isActive = true;

        try {
          let readyVals = 0;
          let sleep: ((value?: unknown) => void) | undefined;

          timeout = setInterval(() => {
            readyVals++;
            if (sleep) {
              sleep();
              sleep = undefined;
            }
          }, frequency);

          while (subscription.isActive) {
            if (readyVals === 0) {
              await new Promise((r) => (sleep = r));
            }

            for (; readyVals > 0; readyVals--) {
              if (!subscription.isActive) {
                break;
              }

              const result = await thisClient.invoke<TData, Uri>({
                uri: uri,
                method: method,
                args: args,
              });

              yield result;
            }
          }
        } finally {
          if (timeout) {
            clearInterval(timeout);
          }
          subscription.isActive = false;
        }
      },
    };

    return subscription;
  }

  /**
   * Resolve a URI to a wrap package, a wrapper, or a uri
   *
   * @param options - { uri: TUri; resolutionContext?: IUriResolutionContext }
   * @returns A Promise with a Result containing either a wrap package, a wrapper, or a URI if successful
   */
  @Tracer.traceMethod("PolywrapClient: tryResolveUri", TracingLevel.High)
  public async tryResolveUri<TUri extends Uri | string>(
    options: TryResolveUriOptions<TUri>
  ): Promise<Result<UriPackageOrWrapper, unknown>> {
    const uri = Uri.from(options.uri);

    const uriResolver = this.getUriResolver();

    const resolutionContext =
      options.resolutionContext ?? new UriResolutionContext();

    const response = await uriResolver.tryResolveUri(
      uri,
      this,
      resolutionContext
    );

    if (options.resolutionContext) {
      Tracer.setAttribute(
        "label",
        buildCleanUriHistory(options.resolutionContext.getHistory()),
        TracingLevel.High
      );
    }

    return response;
  }

  /**
   * Resolve a URI to a wrap package or wrapper.
   * If the URI resolves to wrap package, load the wrapper.
   *
   * @remarks
   * Unlike other methods, `loadWrapper` does not accept a string URI.
   * You can create a Uri (from the `@polywrap/core-js` package) using `Uri.from("wrap://...")`
   *
   * @param uri: the Uri to resolve
   * @param resolutionContext? a resolution context
   * @param options - { noValidate?: boolean }
   * @returns A Promise with a Result containing either a wrapper if successful
   */
  @Tracer.traceMethod("PolywrapClient: loadWrapper", TracingLevel.High)
  public async loadWrapper(
    uri: Uri,
    resolutionContext?: IUriResolutionContext,
    options?: DeserializeManifestOptions
  ): Promise<Result<Wrapper, WrapError>> {
    Tracer.setAttribute("label", `Wrapper loaded: ${uri}`, TracingLevel.High);

    if (!resolutionContext) {
      resolutionContext = new UriResolutionContext();
    }

    const result = await this.tryResolveUri({
      uri,
      resolutionContext,
    });

    if (!result.ok) {
      const history = buildCleanUriHistory(resolutionContext.getHistory());

      let error: WrapError;
      if (result.error) {
        error = new WrapError("A URI Resolver returned an error.", {
          code: WrapErrorCode.URI_RESOLVER_ERROR,
          uri: uri.uri,
          resolutionStack: history,
          cause: result.error,
        });
      } else {
        error = new WrapError("Error resolving URI", {
          code: WrapErrorCode.URI_RESOLUTION_ERROR,
          uri: uri.uri,
          resolutionStack: history,
        });
      }

      return ResultErr(error);
    }

    const uriPackageOrWrapper = result.value;

    if (uriPackageOrWrapper.type === "uri") {
      const message = `Unable to find URI ${uriPackageOrWrapper.uri.uri}.`;
      const history = buildCleanUriHistory(resolutionContext.getHistory());
      const error = new WrapError(message, {
        code: WrapErrorCode.URI_NOT_FOUND,
        uri: uri.uri,
        resolutionStack: history,
      });
      return ResultErr(error);
    }

    if (uriPackageOrWrapper.type === "package") {
      const result = await uriPackageOrWrapper.package.createWrapper(options);

      if (!result.ok) {
        const error = new WrapError(result.error?.message, {
          code: WrapErrorCode.CLIENT_LOAD_WRAPPER_ERROR,
          uri: uri.uri,
          cause: result.error,
        });
        return ResultErr(error);
      }

      return ResultOk(result.value);
    } else {
      return ResultOk(uriPackageOrWrapper.wrapper);
    }
  }

  @Tracer.traceMethod("PolywrapClient: validateConfig")
  private _validateConfig(): void {
    // Require plugins to use non-interface URIs
    const pluginUris = this.getPlugins().map((x) => x.uri.uri);
    const interfaceUris = this.getInterfaces().map((x) => x.interface.uri);

    const pluginsWithInterfaceUris = pluginUris.filter((plugin) =>
      interfaceUris.includes(plugin)
    );

    if (pluginsWithInterfaceUris.length) {
      throw Error(
        `Plugins can't use interfaces for their URI. Invalid plugins: ${pluginsWithInterfaceUris}`
      );
    }
  }
}
