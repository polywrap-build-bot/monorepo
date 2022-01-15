// @ts-noCheck
import {
  Client,
  InvokeApiResult
} from "@web3api/core-js";

export type UInt = number;
export type UInt8 = number;
export type UInt16 = number;
export type UInt32 = number;
export type Int = number;
export type Int8 = number;
export type Int16 = number;
export type Int32 = number;
export type Bytes = Uint8Array;
export type BigInt = string;
export type Json = string;
export type String = string;
export type Boolean = boolean;

export interface QueryEnv {
  queryProp: String;
  prop: String;
  optProp?: String | null;
}

export interface MutationEnv {
  mutProp: String;
  prop: String;
  optProp?: String | null;
}

export interface CustomType {
  str: String;
  optStr?: String | null;
  u: UInt;
  optU?: UInt | null;
  u8: UInt8;
  u16: UInt16;
  u32: UInt32;
  i: Int;
  i8: Int8;
  i16: Int16;
  i32: Int32;
  bigint: BigInt;
  optBigint?: BigInt | null;
  json: Json;
  optJson?: Json | null;
  bytes: Bytes;
  optBytes?: Bytes | null;
  boolean: Boolean;
  optBoolean?: Boolean | null;
  uArray: Array<UInt>;
  uOptArray?: Array<UInt> | null;
  optUOptArray?: Array<UInt | null> | null;
  optStrOptArray?: Array<String | null> | null;
  uArrayArray: Array<Array<UInt>>;
  uOptArrayOptArray: Array<Array<UInt32 | null> | null>;
  uArrayOptArrayArray: Array<Array<Array<UInt32>> | null>;
  crazyArray?: Array<Array<Array<Array<UInt32> | null>> | null> | null;
  object: AnotherType;
  optObject?: AnotherType | null;
  objectArray: Array<AnotherType>;
  optObjectArray?: Array<AnotherType | null> | null;
  en: CustomEnum;
  optEnum?: CustomEnum | null;
  enumArray: Array<CustomEnum>;
  optEnumArray?: Array<CustomEnum | null> | null;
}

export interface AnotherType {
  prop?: String | null;
  circular?: CustomType | null;
  const?: String | null;
}

export enum CustomEnumEnum {
  STRING,
  BYTES,
}

export type CustomEnumString =
  | "STRING"
  | "BYTES"

export type CustomEnum = CustomEnumEnum | CustomEnumString;

/// Imported Objects START ///

/* URI: "testimport.uri.eth" */
export interface TestImport_Object {
  object: TestImport_AnotherObject;
  optObject?: TestImport_AnotherObject | null;
  objectArray: Array<TestImport_AnotherObject>;
  optObjectArray?: Array<TestImport_AnotherObject | null> | null;
  en: TestImport_Enum;
  optEnum?: TestImport_Enum | null;
  enumArray: Array<TestImport_Enum>;
  optEnumArray?: Array<TestImport_Enum | null> | null;
}

/* URI: "testimport.uri.eth" */
export interface TestImport_AnotherObject {
  prop: String;
}

/* URI: "testimport.uri.eth" */
export enum TestImport_EnumEnum {
  STRING,
  BYTES,
}

export type TestImport_EnumString =
  | "STRING"
  | "BYTES"

export type TestImport_Enum = TestImport_EnumEnum | TestImport_EnumString;

/// Imported Objects END ///

/// Imported Queries START ///

/* URI: "testimport.uri.eth" */
interface TestImport_Query_Input_importedMethod extends Record<string, unknown> {
  str: String;
  optStr?: String | null;
  u: UInt;
  optU?: UInt | null;
  uArrayArray: Array<Array<UInt | null> | null>;
  object: TestImport_Object;
  optObject?: TestImport_Object | null;
  objectArray: Array<TestImport_Object>;
  optObjectArray?: Array<TestImport_Object | null> | null;
  en: TestImport_Enum;
  optEnum?: TestImport_Enum | null;
  enumArray: Array<TestImport_Enum>;
  optEnumArray?: Array<TestImport_Enum | null> | null;
}

/* URI: "testimport.uri.eth" */
interface TestImport_Query_Input_anotherMethod extends Record<string, unknown> {
  arg: Array<String>;
}

/* URI: "testimport.uri.eth" */
export const TestImport_Query = {
  importedMethod: async (
    input: TestImport_Query_Input_importedMethod,
    client: Client
  ): Promise<InvokeApiResult<TestImport_Object | null>> => {
    return client.invoke<TestImport_Object | null>({
      uri: "testimport.uri.eth",
      module: "query",
      method: "importedMethod",
      input
    });
  },

  anotherMethod: async (
    input: TestImport_Query_Input_anotherMethod,
    client: Client
  ): Promise<InvokeApiResult<Int32>> => {
    return client.invoke<Int32>({
      uri: "testimport.uri.eth",
      module: "query",
      method: "anotherMethod",
      input
    });
  }
}

/* URI: "testimport.uri.eth" */
interface TestImport_Mutation_Input_importedMethod extends Record<string, unknown> {
  str: String;
  object: TestImport_Object;
  objectArray: Array<TestImport_Object>;
}

/* URI: "testimport.uri.eth" */
interface TestImport_Mutation_Input_anotherMethod extends Record<string, unknown> {
  arg: Array<String>;
}

/* URI: "testimport.uri.eth" */
export const TestImport_Mutation = {
  importedMethod: async (
    input: TestImport_Mutation_Input_importedMethod,
    client: Client
  ): Promise<InvokeApiResult<TestImport_Object | null>> => {
    return client.invoke<TestImport_Object | null>({
      uri: "testimport.uri.eth",
      module: "mutation",
      method: "importedMethod",
      input
    });
  },

  anotherMethod: async (
    input: TestImport_Mutation_Input_anotherMethod,
    client: Client
  ): Promise<InvokeApiResult<Int32>> => {
    return client.invoke<Int32>({
      uri: "testimport.uri.eth",
      module: "mutation",
      method: "anotherMethod",
      input
    });
  }
}

/// Imported Queries END ///
