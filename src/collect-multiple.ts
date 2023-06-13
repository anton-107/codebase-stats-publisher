import { GitRepository } from "codebase-stats-collector/dist/git-reader/git-repository.js";
import fs from "fs";

function getFoldersInPath(path: string): string[] {
  try {
    const folderNames = fs
      .readdirSync(path, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    return folderNames;
  } catch (error) {
    // Handle any potential errors here
    console.error("Error occurred while reading directory:", error);
    return [];
  }
}

async function main() {
  console.log("collecting from folder containing multiple git repositories");

  const containingFolder = process.env.WORKSPACE_DIR;

  if (!containingFolder) {
    throw Error(
      "Please define WORKSPACE_DIR to point to your local folder containing your git repositories to collect data from"
    );
  }

  const repositories = getFoldersInPath(containingFolder);
  console.log(`found ${repositories.length} sub-folders`);

  for (const subFolder of repositories) {
    const sourceDir = `${containingFolder}/${subFolder}`;
    console.log("Reading data from", subFolder);

    const repo = new GitRepository(sourceDir);
    const commits = await repo.getListOfCommits();
    const firstCommitDate = new Date(
      commits[commits.length - 1].commit.author.timestamp * 1000
    );
    const lastCommitDate = new Date(commits[0].commit.author.timestamp * 1000);

    console.log(
      `Found ${commits.length} commits. First commit: ${firstCommitDate}. Last commit: ${lastCommitDate}`
    );
  }
}
main();
