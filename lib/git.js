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
const io_1 = require("@actions/io");
const util_1 = require("./util");
const constants_1 = require("./constants");
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
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
            yield util_1.execute(`git config user.name ${constants_1.action.pusher.name}`, constants_1.workspace);
            yield util_1.execute(`git config user.email ${constants_1.action.pusher.email}`, constants_1.workspace);
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
            yield util_1.execute(`git rm -rf .`, constants_1.workspace);
            yield util_1.execute(`touch README.md`, constants_1.workspace);
            yield util_1.execute(`git add README.md`, constants_1.workspace);
            yield util_1.execute(`git commit -m "Initial ${action.branch} commit"`, constants_1.workspace);
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
        const temporaryDeploymentDirectory = 'tmp-deployment-folder';
        const temporaryDeploymentBranch = 'tmp-deployment-branch';
        const repositoryPath = `https://${constants_1.action.accessToken ||
            `x-access-token:${constants_1.action.gitHubToken}`}@github.com/${constants_1.action.gitHubRepository}.git`;
        const branchExists = Number(yield util_1.execute(`git ls-remote --heads ${repositoryPath} ${constants_1.action.branch} | wc -l`, constants_1.workspace));
        if (!branchExists) {
            console.log('Deployment branch does not exist. Creating....');
            //await generateBranch(action, repositoryPath);
        }
        console.log('Checking out...');
        yield util_1.execute(`git checkout ${constants_1.action.baseBranch || 'master'}`, constants_1.workspace);
        if (constants_1.action.cname) {
            console.log(`Generating a CNAME file in the ${constants_1.build} directory...`);
            yield util_1.execute(`echo ${constants_1.action.cname} > CNAME`, constants_1.build);
        }
        yield util_1.execute(`git fetch origin`, constants_1.workspace);
        yield util_1.execute(`git worktree add --checkout ${temporaryDeploymentDirectory} origin/${constants_1.action.branch}`, constants_1.workspace);
        yield io_1.cp(`${constants_1.build}/*`, temporaryDeploymentDirectory, { recursive: true, force: true });
        yield util_1.execute(`git add --all`, temporaryDeploymentDirectory);
        yield util_1.execute(`git checkout -b ${temporaryDeploymentBranch}`, temporaryDeploymentDirectory);
        yield util_1.execute(`git commit -m "Deploying to ${constants_1.action.branch} from ${constants_1.action.baseBranch} ${process.env.GITHUB_SHA}`, temporaryDeploymentDirectory);
        yield util_1.execute(`git push ${repositoryPath} ${temporaryDeploymentBranch}:${constants_1.action.branch}`, temporaryDeploymentDirectory);
    });
}
exports.deploy = deploy;
