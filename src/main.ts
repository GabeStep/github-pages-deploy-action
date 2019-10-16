import * as core from '@actions/core';
import * as github from '@actions/github';
import {exec} from 'child_process';


export function execute(command: string):Promise<String> {
	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(stdout.trim());
		});
	});
};

async function init() {
  const {pusher, repository} = github.context.payload;
  const accessToken = core.getInput('ACCESS_TOKEN');
  const gitHubToken = core.getInput('GITHUB_TOKEN');
  const baseBranch = core.getInput('BASE_BRANCH');
  const branch = core.getInput('BRANCH');
  const folder = core.getInput('FOLDER');

  if (!accessToken && !gitHubToken) {
    core.setFailed('You must provide the action with either a Personal Access Token or the GitHub Token secret in order to deploy.')
  }

  if (!branch) {
    core.setFailed('You must provide the action with a branch name it should deploy to, for example gh-pages or docs.')
  }

  if (!folder) {
    core.setFailed('You must provide the action with the folder name in the repository where your compiled page lives.')
  }


  await execute(`cd ${folder}`)
  await execute('git init')
  await execute(`git config user.name ${pusher.name}`)
  await execute(`git config user.email ${pusher.email}`)

  const gitHubRepository = repository ? repository.name : '';

  // Returns for testing purposes.
  return Promise.resolve({
    gitHubRepository,
    accessToken,
    gitHubToken,
    branch,
    baseBranch,
    folder,
  });
}

async function createBranch() {
}

async function deploy(action) {
  console.log(action.gitHubRepository)
  const repositoryPath = `https://${action.accessToken || `x-access-token:${action.gitHubToken}`}@github.com/${action.gitHubRepository}.git`
  const status = await execute(`git status --porcelain`);

  await execute(`git add .`)
  await execute(`git commit -m "Deploying to GitHub Pages"`)
  await execute(`git push --force ${repositoryPath} master:gh-pages`)

  //await execute(`git checkout ${action.baseBranch || 'master'}`)
  //await execute(`git add -f ${action.folder}`)
  //await execute(`git commit -m "Deploying to ${action.branch} from ${action.baseBranch || 'master'} ${process.env.GITHUB_SHA}"`)
  //await execute(`git push $REPOSITORY_PATH 'git subtree split --prefix ${action.folder} ${action.baseBranch || 'master'}':${action.baseBranch} --force`)
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
