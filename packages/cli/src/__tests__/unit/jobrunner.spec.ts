import { GetPathToTestWrappers } from "@polywrap/test-cases";
import { buildWrapper } from "@polywrap/test-env-js";
import { testCases } from "./jobrunner-test-cases";
import { JobRunner } from "../../lib";
import path from "path";
import { ClientConfigBuilder, ClientConfig } from "@polywrap/client-config-builder-js";

jest.setTimeout(200000);

describe("workflow JobRunner", () => {
  let defaultConfig: ClientConfig;

  beforeAll(async () => {
    await buildWrapper(
      path.join(GetPathToTestWrappers(), "wasm-as", "simple-calculator")
    );
    defaultConfig = new ClientConfigBuilder().addDefaults().build();
  });

  for (const testCase of testCases) {
    it(testCase.name, async () => {
      const ids = Object.keys(testCase.workflow.jobs);
      const jobRunner = new JobRunner(
        defaultConfig,
        testCase.onExecution
      );
      await jobRunner.run(testCase.workflow.jobs, ids);
    });
  }
});
