#!/bin/sh -l
if [ -z "$BRANCH" ]
then
  echo "Which branch should this push to?"
  exit 1
fi

if [ -z "$FOLDER" ]
then
  echo "Which folder should this push to?"
fi

# Installs Git.
apt-get update && \
apt-get install -y git && \

# Re-directs to the the Github workspace.
cd $GITHUB_WORKSPACE && \

# Configures Git and checks out the base branch.
git config --global user.email "${COMMIT_EMAIL:-gh-pages-deploy@jives.dev}" && \
git config --global user.name "${COMMIT_NAME:-Github Pages Deploy}" && \
git checkout master && \
git push $GITHUB_REPOSITORY $BRANCH:$BRANCH

# Builds the project.
npm install && \
npm run-script build && \

# Commits the data to Github.
git add -f $FOLDER && 
git commit -m "Deploying $(date +"%T")" && \
git push origin `git subtree split --prefix $FOLDER master`:$BRANCH --force
