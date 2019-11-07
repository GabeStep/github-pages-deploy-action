import * as core from "@actions/core";
import { init, deploy } from "./git";

/** Initializes and runs the action.
 * @returns {Promise}
 */
async function run (): Promise<any> {
  try {
    // Initializes the action.
    await init();
    await deploy();
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    Promise.resolve("Deployment Successful!");
  }
}

run()