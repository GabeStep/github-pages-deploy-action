import * as core from "@actions/core";
import {cp} from "@actions/io"
import { execute } from "./util";
import { workspace, build, action, repositoryPath } from './constants';

export async function init() {
  try {

    const accessToken = core.getInput("ACCESS_TOKEN");
    const gitHubToken = core.getInput("GITHUB_TOKEN");
  
    if (!accessToken && !gitHubToken) {
      core.setFailed(
        "You must provide the action with either a Personal Access Token or the GitHub Token secret in order to deploy."
      );
    }
  
    if (build.startsWith("/") || build.startsWith("./")) {
      core.setFailed(
        `The deployment folder cannot be prefixed with '/' or './'. Instead reference the folder name directly.`
      );
    }
  
    console.log('Starting repo init...')
    await execute(`git init`, workspace);
    await execute(`git config user.name ${action.pusher.name}`, workspace);
    await execute(`git config user.email ${action.pusher.email}`, workspace);

  } catch (error) {
    core.setFailed(`There was an error initializing the repository: ${error}`)
  }
}

export async function generateBranch(action, repositoryPath) {
  try {
    console.log(`Creating ${action.branch} branch...`)
    await execute(`git checkout ${action.baseBranch || "master"}`, workspace);
    await execute(`git checkout --orphan ${action.branch}`, workspace);
    await execute(`git reset --hard`, workspace)
    await execute(`git commit --allow-empty -m "Initial ${action.branch} commit."`, workspace)
    await execute(`git push ${repositoryPath} ${action.branch}`, workspace)
  } catch (error) {
    core.setFailed(`There was an error creating the deployment branch: ${error}`);
  } finally {
    console.log("Deployment branch successfully created!");
  }
}

export async function deploy() {
    const temporaryDeploymentDirectory = 'tmp-deployment-folder';
    const temporaryDeploymentBranch = 'tmp-deployment-branch';
    const branchExists = Number(await execute(`git ls-remote --heads ${repositoryPath} ${action.branch} | wc -l`, workspace));
  
    if (!branchExists) {
      console.log('Deployment branch does not exist. Creating....')
      await generateBranch(action, repositoryPath);
    }
  
    await execute(`git checkout ${action.baseBranch || 'master'}`, workspace)
    await execute(`git fetch origin`, workspace);
    await execute(`git worktree add --checkout ${temporaryDeploymentDirectory} origin/${action.branch}`, workspace);

    if (action.cname) {
      console.log(`Generating a CNAME file in the ${build} directory...`);
      await execute(`printf ${action.cname} > CNAME`, build);
    }

    await cp(`${build}/.`, temporaryDeploymentDirectory, {recursive: true, force: true});
    await execute(`git add --all .`, temporaryDeploymentDirectory)

    await execute(`git checkout -b ${temporaryDeploymentBranch}`, temporaryDeploymentDirectory);
    await execute(`git status`, workspace)
    await execute(`git commit -m "Deploying to ${action.branch} from ${action.baseBranch} ${process.env.GITHUB_SHA}" --quiet`, temporaryDeploymentDirectory);
    await execute(`git push ${repositoryPath} ${temporaryDeploymentBranch}:${action.branch}`, temporaryDeploymentDirectory)
}
