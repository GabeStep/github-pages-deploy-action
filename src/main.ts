import * as core from '@actions/core';
import * as github from '@actions/github';
import {exec} from '@actions/exec';

async function init() {
  const {pusher, repository} = github.context.payload;
  const accessToken = core.getInput('ACCESS_TOKEN');
  const githubToken = core.getInput('GITHUB_TOKEN');
  const baseBranch = core.getInput('BASE_BRANCH');
  const branch = core.getInput('BRANCH');
  const folder = core.getInput('FOLDER');

  if (!accessToken && !githubToken) {
    core.setFailed('You must provide the action with either a Personal Access Token or the GitHub Token secret in order to deploy.')
  }

  if (!branch) {
    core.setFailed('You must provide the action with a branch name it should deploy to, for example gh-pages or docs.')
  }

  if (!folder) {
    core.setFailed('You must provide the action with the folder name in the repository where your compiled page lives.')
  }

  const gitHubEvent = require(`${process.env.GITHUB_EVENT_PATH}`);
  let commitEmail = gitHubEvent.pusher.email || null;
  let commitName = gitHubEvent.pusher.name || null;

  if (!commitEmail) {
    commitEmail = process.env.GITHUB_ACTOR || 'github-pages-deploy-action';
  }

  if (!commitName) {
    commitName = process.env.GITHUB_ACTOR || 'Github Pages Deploy Action';
  }

  await exec('git init')
  await exec(`git config user.name ${pusher.name}`)
  await exec(`git config user.email ${pusher.email}`)

  const githubRepository = repository ? repository.name : '';

  // Returns for testing purposes.
  return Promise.resolve({
    githubRepository,
    commitName,
    commitEmail,
    accessToken,
    githubToken,
    branch,
    baseBranch,
    folder,
  });
}

async function createBranch() {
}

async function deploy(action) {
  const repositoryPath = `https://${action.accessToken || `x-access-token:${action.githubToken}`}@github.com/${process.env.GITHUB_REPOSITORY}.git`
  const gitStatus = await exec(`git status --porcelain`);

  await exec(`cd ${action.folder}`)

  if (gitStatus) {
    console.log('There is currently nothing to deploy, aborting...')
    return;
  }

  await exec(`git add .`)
  await exec(`git commit -m "Deploying to GitHub Pages"`)
  await exec(`git push --force ${repositoryPath} ${action.baseBranch ? action.baseBranch : 'master'}:${action.branch}`)

  //await exec(`git checkout ${action.baseBranch || 'master'}`)
  //await exec(`git add -f ${action.folder}`)
  //await exec(`git commit -m "Deploying to ${action.branch} from ${action.baseBranch || 'master'} ${process.env.GITHUB_SHA}"`)
  //await exec(`git push $REPOSITORY_PATH 'git subtree split --prefix ${action.folder} ${action.baseBranch || 'master'}':${action.baseBranch} --force`)
}


async function run() {
  try {
    // Initializes the action.
    const action = await init();

    await deploy(action)
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
