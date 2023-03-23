import { GitRepository } from "codebase-stats-collector/dist/git-reader/git-repository.js";
import { getListOfContributorsPerFile } from "codebase-stats-collector/dist/stats/list-of-contributors-per-file.js";
import { getNumberOfChangesPerFile } from "codebase-stats-collector/dist/stats/number-of-changes-per-file.js";
import { getNumberOfLines } from "codebase-stats-collector/dist/stats/number-of-lines.js";
import { access } from "fs";
import { promisify } from "util";

const checkFileExists = promisify(access);

interface Contributor {
  name: string;
  numberOfChanges: number;
  firstChangeTimestamp: number;
  lastChangeTimestamp: number;
}

export interface File {
  filePath: string;
  numberOfLines: number;
  numberOfChanges: number;
  contributors: Contributor[];
}

export async function collectDataFromGitRepo(gitRepo: string): Promise<File[]> {
  // read data from git:
  const repo = new GitRepository(gitRepo);
  const commitsWithChangedFiles = await repo.getListOfCommitsWithChangedFiles();

  // analyze stats:
  const numberOfChangesPerFile = await getNumberOfChangesPerFile(
    commitsWithChangedFiles,
    {
      fileIgnorePattern: `^/dist/`,
    }
  );
  const listOfContributorsPerFile = await getListOfContributorsPerFile(
    commitsWithChangedFiles
  );
  const filePaths = Object.keys(numberOfChangesPerFile);

  const files: File[] = [];
  for (const filePath of filePaths) {
    const fullPath = `${gitRepo}/${filePath}`;

    let numberOfLines = null;
    try {
      await checkFileExists(fullPath);
      numberOfLines = await getNumberOfLines(fullPath);
    } catch {
      console.warn("file does not exist:", fullPath);
    }
    const numberOfChanges = numberOfChangesPerFile[filePath];
    const contributors = listOfContributorsPerFile[filePath];
    files.push({
      filePath,
      numberOfLines,
      numberOfChanges,
      contributors,
    });
  }

  return files;
}
