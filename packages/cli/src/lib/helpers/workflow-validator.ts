import { runCommand } from "../system";

import fs from "fs";
import { InvokeApiResult } from "@web3api/core-js";

export async function cueExists(): Promise<boolean> {
  try {
    const { stdout } = await runCommand("cue version");
    return stdout.startsWith("cue version ");
  } catch (e) {
    return false;
  }
}

export async function validateOutput(
  id: string,
  result: InvokeApiResult,
  validateScriptPath: string
): Promise<void> {
  const index = id.lastIndexOf(".");
  const jobId = id.substring(0, index);
  const stepId = id.substring(index + 1);

  const selector = `${jobId}.\\$${stepId}`;
  const jsonOutput = `${process.env.TMPDIR}/${id}.json`;

  await fs.promises.writeFile(jsonOutput, JSON.stringify(result, null, 2));

  try {
    await runCommand(
      `cue vet -d ${selector} ${validateScriptPath} ${jsonOutput}`
    );
  } catch (e) {
    console.error(e.message);
    console.log("-----------------------------------");
    process.exitCode = 1;
  }

  if (fs.existsSync(jsonOutput)) {
    await fs.promises.unlink(jsonOutput);
  }
}
