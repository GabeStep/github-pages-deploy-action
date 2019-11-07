import * as core from "@actions/core";
import {cp} from "@actions/io"
import { execute } from "./util";
import { workspace, build, action, repositoryPath } from './constants';

/** Generates the branch if it doesn't exist on the remote. */
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
  
    await execute(`git init`, workspace);
    await execute(`git config user.name ${action.pusher.name}`, workspace);
    await execute(`git config user.email ${action.pusher.email}`, workspace);

  } catch (error) {
    core.setFailed(`There was an error initializing the repository: ${error}`)
  } finally {
    Promise.resolve("Initializion Step Complete...")
  }
}

/** Generates the branch if it doesn't exist on the remote. */
export async function generateBranch() {
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
    Promise.resolve("Deployment branch creation step complete...");
  }
}

/** Runs the neccersary steps to make the deployment. */
export async function deploy(): Promise<any> {
    const temporaryDeploymentDirectory = 'temp-deployment-folder';
    const temporaryDeploymentBranch = 'temp-deployment-branch';

    /*
      Checks to see if the remote exists prior to deploying.
      If the branch doesn't exist it gets created here as an orphan.
    */
    const branchExists = await execute(`git ls-remote --heads ${repositoryPath} ${action.branch} | wc -l`, workspace)
    if (!branchExists) {
      console.log('Deployment branch does not exist. Creating....')
      await generateBranch();
    }
  
    // Checks out the base branch to begin the deployment process.
    await execute(`git checkout ${action.baseBranch || 'master'}`, workspace)
    await execute(`git fetch origin`, workspace);
    await execute(`git worktree add --checkout ${temporaryDeploymentDirectory} origin/${action.branch}`, workspace);

    /*
      Pushes all of the build files into the deployment directory.
      Allows the user to specify the root if '.' is provided. */
    await cp(`${build}/.`, temporaryDeploymentDirectory, {recursive: true, force: true});

    // Commits to GitHub.
    await execute(`git add --all .`, temporaryDeploymentDirectory)
    await execute(`git checkout -b ${temporaryDeploymentBranch}`, temporaryDeploymentDirectory);
    await execute(`git commit -m "Deploying to ${action.branch} from ${action.baseBranch} ${process.env.GITHUB_SHA}" --quiet`, temporaryDeploymentDirectory);
    await execute(`git push ${repositoryPath} ${temporaryDeploymentBranch}:${action.branch}`, temporaryDeploymentDirectory)

    return Promise.resolve('Files commit step complete...')
}
