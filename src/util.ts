import { exec } from "@actions/exec";
import { rejects } from "assert";

export async function execute(cmd: string, cwd: string): Promise<String> {
  let myOutput = '';
  let myError = '';
  await exec(cmd, [], {
    cwd,
    listeners: {
      stdout: (data: Buffer) => {
        myOutput += data.toString().trim();
      },
      stderr: (data: Buffer) => {
        myError += data.toString().trim();
      }
    }
  });

  if (myError) {
    throw new Error(myError);
  }
  return myOutput;
}