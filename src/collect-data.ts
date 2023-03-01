import {access} from 'fs';
import { promisify } from 'util';
import {GitRepository} from "codebase-stats-collector/dist/git-reader/git-repository.js";
import {getNumberOfChangesPerFile} from 'codebase-stats-collector/dist/stats/number-of-changes-per-file.js';
import {getNumberOfLines} from 'codebase-stats-collector/dist/stats/number-of-lines.js';
import {getNumberOfContributorsPerFile} from 'codebase-stats-collector/dist/stats/number-of-contributors-per-file.js';

const checkFileExists = promisify(access);

interface File {
  filePath: string;
  numberOfLines: number;
  numberOfChanges: number;
  numberOfContributors: number;
}

export async function collectDataFromGitRepo(gitRepo: string): Promise<File[]> {
  // read data from git:
  const repo = new GitRepository(gitRepo);
  const commitsWithChangedFiles = await repo.getListOfCommitsWithChangedFiles();
  
  // analyze stats:
  const numberOfChangesPerFile = await getNumberOfChangesPerFile(commitsWithChangedFiles, {
    fileIgnorePattern: `^/dist/`
  });
  const numberOfContributorsPerFile = await getNumberOfContributorsPerFile(commitsWithChangedFiles);
  const filePaths = Object.keys(numberOfChangesPerFile);

  const files: File[] = [];
  for (let filePath of filePaths) {
    const fullPath = `${gitRepo}/${filePath}`;

    
    
    let numberOfLines = null;
    try {
      await checkFileExists(fullPath);
      numberOfLines = await getNumberOfLines(fullPath);
    } catch {
      console.log('file does not exist:', fullPath) 
    }
    const numberOfChanges = numberOfChangesPerFile[filePath];
    const numberOfContributors = numberOfContributorsPerFile[filePath];
    console.log(filePath, numberOfLines, numberOfChanges, numberOfContributors);
    files.push({filePath, numberOfLines, numberOfChanges, numberOfContributors});
  }
  
  return files;
}