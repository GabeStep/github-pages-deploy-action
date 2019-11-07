import * as core from "@actions/core";
import { init, deploy } from "./git";

(async function() {
  try {
    // Initializes the action.
    await init();
    await deploy();
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    console.log("Deployment Successful!");
  }
})