import { exec } from "@actions/exec";

export async function execute(cmd: string, cwd: string): Promise<String> {
  let output = '';

  await exec(cmd, [], {
    cwd,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString().trim();
      },
    }
  });

  return output;
}