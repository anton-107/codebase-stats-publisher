import {access} from 'fs';
import { promisify } from 'util';
import {GitRepository} from "codebase-stats-collector/dist/git-reader/git-repository.js";
import {getNumberOfChangesPerFile} from 'codebase-stats-collector/dist/stats/number-of-changes-per-file.js';
import {getNumberOfLines} from 'codebase-stats-collector/dist/stats/number-of-lines.js';
import {getNumberOfContributorsPerFile} from 'codebase-stats-collector/dist/stats/number-of-contributors-per-file.js';
import {APIClient} from "notes-webserver-apiclient/dist/api-client.js";

const checkFileExists = promisify(access);

interface File {
  filePath: string;
  numberOfLines: number;
  numberOfChanges: number;
  numberOfContributors: number;
}

async function main() {

  const gitRepo = process.env.SOURCE_DIR;
  const notesEndpoint = process.env.API_ROOT;
  const notesUser = process.env.NOTES_USER;
  const notesPassword = process.env.NOTES_PASSWORD;
  if (!gitRepo) {
    throw Error('Please define SOURCE_DIR to point to your local git repository to collect data from');
  }
  if (!notesEndpoint) {
    throw Error('Please define API_ROOT to point to your local or remote Notes API');
  }
  if (!notesUser) {
    throw Error('Please define NOTES_USER to specify the Notes user to publish the repo data');
  }
  if (!notesPassword) {
    throw Error('Please define NOTES_PASSWORD to specify the Notes user password');
  }
  console.log(`Collecting data from git repo: ${gitRepo}`);

  // read data from git:
  const repo = new GitRepository(gitRepo);
  const commits = await repo.getListOfCommits();
  const commitsWithChangedFiles = await repo.getListOfCommitsWithChangedFiles();
  
  // analyze stats:
  const numberOfChangesPerFile = await getNumberOfChangesPerFile(commitsWithChangedFiles);
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

  // publish data:
  console.log(`Publishing collected data to: ${notesEndpoint} as user ${notesUser}`);

  const client = new APIClient();
  const isAuthorized = await client.authorize(notesUser, notesPassword);
  if (!isAuthorized) {
    throw Error(`Could not authorize Notes API client. Check that you are using correct login/password pair`);
  }
  console.log('Client is authorized');
  const notebookResponse = await client.createNotebook(`Git repo (test)`);
  if (notebookResponse.httpCode !== 200) {
    throw Error(`Could not create notebook: ${notebookResponse.httpCode} - ${notebookResponse.body}`);
  }
  let i = 0;
  for (let file of files) {
    const noteResponse = await client.createNote(notebookResponse.body.id, JSON.stringify(file));
    i += 1;
    console.log(`Response from note creation ${file.filePath}: ${noteResponse.httpCode}. Progress: ${i} out of ${files.length} complete`);
  }
}
main();
