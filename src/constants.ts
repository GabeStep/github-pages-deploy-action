import * as core from "@actions/core";

export const workspace: any = process.env.GITHUB_WORKSPACE
export const build = core.getInput("FOLDER", { required: true });

    // Returns for testing purposes.
    const action = {
      gitHubRepository: repository ? repository.full_name : "",
      gitHubToken: core.getInput("GITHUB_TOKEN"),
      cname: core.getInput("CNAME"),
      accessToken: core.getInput("ACCESS_TOKEN"),
      branch: core.getInput("BRANCH"),
      baseBranch: core.getInput("BASE_BRANCH"),
    }