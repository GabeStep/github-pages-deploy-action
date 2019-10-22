import * as core from "@actions/core";
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
    await execute(`git checkout ${action.baseBranch || "master"}`, workspace);
    await execute(`git checkout --orphan ${action.branch}`, workspace);
    await execute(`git rm -rf .`, workspace)
    await execute(`touch README.md`, workspace)
    await execute(`git add README.md`, workspace)
    await execute(`git commit -m "Initial ${action.branch} commit"`, workspace)
    await execute(`git push ${repositoryPath} ${action.branch}`, workspace)
  } catch (error) {
    core.setFailed(`There was an error creating the deployment branch: ${error}`);
  } finally {
    console.log("Deployment branch successfully created!");
  }
}

export async function deploy() {
  try {
    const temporaryDeploymentDirectory = 'tmp-deployment-folder';
    const temporaryDeploymentBranch = 'tmp-deployment-branch';
  
    const repositoryPath = `https://${action.accessToken ||
      `x-access-token:${action.gitHubToken}`}@github.com/${
      action.gitHubRepository
    }.git`;
  
    const branchExists = Number(await execute(`git ls-remote --heads ${repositoryPath} ${action.branch} | wc -l`, workspace));
  
    if (!branchExists) {
      console.log('Deployment branch does not exist. Creating....')
      await generateBranch(action, repositoryPath);
    }
  
    console.log('Checking out...')
    await execute(`git checkout ${action.baseBranch || 'master'}`, workspace)
  
    if (action.cname) {
      console.log(`Generating a CNAME file in the ${build} directory...`);
      await execute(`echo ${action.cname} > CNAME`, build);
    }

    await execute(`git add -f ${build}`, workspace)
    await execute(`git commit -m "Deploying to ${action.branch} from ${action.baseBranch || 'master'} ${process.env.GITHUB_SHA}"`, workspace)
    await execute(`git push ${repositoryPath} \`git subtree split --prefix ${build} ${action.baseBranch || 'master'}\`:${action.branch} --force`, workspace)
  } catch(error) {
    core.setFailed(`There was an error in the deployment: ${error}`)
  } finally {
    console.log('Deployment succeeded')
  }
}
