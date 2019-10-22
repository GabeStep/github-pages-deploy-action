"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const io_1 = require("@actions/io");
const util_1 = require("./util");
const constants_1 = require("./constants");
const { pusher, repository } = github.context.payload;
// Returns for testing purposes.
const action = {
    gitHubRepository: repository ? repository.full_name : "",
    gitHubToken: core.getInput("GITHUB_TOKEN"),
    cname: core.getInput("CNAME"),
    accessToken: core.getInput("ACCESS_TOKEN"),
    branch: core.getInput("BRANCH"),
    baseBranch: core.getInput("BASE_BRANCH"),
};
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { pusher, repository } = github.context.payload;
            const accessToken = core.getInput("ACCESS_TOKEN");
            const gitHubToken = core.getInput("GITHUB_TOKEN");
            if (!accessToken && !gitHubToken) {
                core.setFailed("You must provide the action with either a Personal Access Token or the GitHub Token secret in order to deploy.");
            }
            if (constants_1.build.startsWith("/") || constants_1.build.startsWith("./")) {
                core.setFailed(`The deployment folder cannot be prefixed with '/' or './'. Instead reference the folder name directly.`);
            }
            console.log('Starting repo init...');
            yield util_1.execute(`git init`, constants_1.workspace);
            yield util_1.execute(`git config user.name ${pusher.name}`, constants_1.workspace);
            yield util_1.execute(`git config user.email ${pusher.email}`, constants_1.workspace);
            // Returns for testing purposes.
            return {
                gitHubRepository: repository ? repository.full_name : "",
                gitHubToken: core.getInput("GITHUB_TOKEN"),
                cname: core.getInput("CNAME"),
                accessToken: core.getInput("ACCESS_TOKEN"),
                branch: core.getInput("BRANCH"),
                baseBranch: core.getInput("BASE_BRANCH"),
            };
        }
        catch (error) {
            core.setFailed(`There was an error initializing the repository: ${error}`);
        }
    });
}
exports.init = init;
function generateBranch(action, repositoryPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield util_1.execute(`git checkout ${action.baseBranch || "master"}`, constants_1.workspace);
            yield util_1.execute(`git checkout --orphan ${action.branch}`, constants_1.workspace);
            yield util_1.execute(`git reset --hard`, constants_1.workspace);
            yield util_1.execute(`git commit --allow-empty -m "Initial ${action.branch} branch creation"`, constants_1.workspace);
            yield util_1.execute(`git push ${repositoryPath} ${action.branch}`, constants_1.workspace);
        }
        catch (error) {
            core.setFailed(`There was an error creating the deployment branch: ${error}`);
        }
        finally {
            console.log("Deployment branch successfully created!");
        }
    });
}
exports.generateBranch = generateBranch;
function deploy() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const temporaryDeploymentDirectory = 'tmp-deployment-folder';
            const temporaryDeploymentBranch = 'tmp-deployment-branch';
            const repositoryPath = `https://${action.accessToken ||
                `x-access-token:${action.gitHubToken}`}@github.com/${action.gitHubRepository}.git`;
            const branchExists = Number(yield util_1.execute(`git ls-remote --heads ${repositoryPath} ${action.branch} | wc -l`, constants_1.workspace));
            if (!branchExists) {
                console.log('Deployment branch does not exist. Creating....');
                yield generateBranch(action, repositoryPath);
            }
            console.log('Checking out...');
            yield util_1.execute(`git checkout ${action.baseBranch || 'master'}`, constants_1.workspace);
            if (action.cname) {
                console.log(`Generating a CNAME file in the ${constants_1.build} directory...`);
                yield util_1.execute(`echo ${action.cname} > CNAME`, constants_1.build);
            }
            console.log('Preparing for deployment....');
            yield util_1.execute(`git fetch origin`, constants_1.workspace);
            yield util_1.execute(`git worktree add --checkout ${temporaryDeploymentDirectory} origin/${action.branch}`, constants_1.workspace);
            yield io_1.cp(`${constants_1.build}/*`, temporaryDeploymentDirectory, { recursive: true, force: true });
            console.log('Preparing Git Commit...');
            yield util_1.execute(`git add --all .`, temporaryDeploymentDirectory);
            yield util_1.execute(`git checkout -b ${temporaryDeploymentBranch}`, temporaryDeploymentDirectory);
            yield util_1.execute(`git commit -m "Deploying to ${action.branch} from ${action.baseBranch || 'master'} ${process.env.GITHUB_SHA}"`, temporaryDeploymentDirectory);
            console.log('Executing push to GitHub');
            yield util_1.execute(`git push ${repositoryPath} ${temporaryDeploymentBranch}:${action.branch}`, temporaryDeploymentDirectory);
        }
        catch (error) {
            core.setFailed(`There was an error in the deployment: ${error}`);
        }
        finally {
            console.log('Deployment succeeded');
        }
    });
}
exports.deploy = deploy;
