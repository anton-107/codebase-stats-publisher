import { GitRepository } from "codebase-stats-collector/dist/git-reader/git-repository.js";
import fs from "fs";
import {
  APIClient,
  NoteForm,
} from "notes-webserver-apiclient/dist/api-client.js";

import { getOrCreateNotebook } from "./get-or-create-notebook.js";

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

interface PublisherConfiguration {
  containingFolder: string;
  notesEndpoint: string;
  notesUser: string;
  notesPassword: string;
}

function configureFromEnvironment(): PublisherConfiguration {
  const containingFolder = process.env.WORKSPACE_DIR;
  const notesEndpoint = process.env.API_ROOT;
  const notesUser = process.env.NOTES_USER;
  const notesPassword = process.env.NOTES_PASSWORD;
  if (!containingFolder) {
    throw Error(
      "Please define WORKSPACE_DIR to point to your local git repository to collect data from"
    );
  }
  if (!notesEndpoint) {
    throw Error(
      "Please define API_ROOT to point to your local or remote Notes API"
    );
  }
  if (!notesUser) {
    throw Error(
      "Please define NOTES_USER to specify the Notes user to publish the repo data"
    );
  }
  if (!notesPassword) {
    throw Error(
      "Please define NOTES_PASSWORD to specify the Notes user password"
    );
  }
  return {
    containingFolder,
    notesEndpoint,
    notesUser,
    notesPassword,
  };
}

async function main() {
  console.log("collecting from folder containing multiple git repositories");

  // configure:
  const { containingFolder, notesEndpoint, notesUser, notesPassword } =
    configureFromEnvironment();

  if (!containingFolder) {
    throw Error(
      "Please define WORKSPACE_DIR to point to your local folder containing your git repositories to collect data from"
    );
  }

  // authorize client
  console.log(
    `Authorizing client against ${notesEndpoint} as user ${notesUser}`
  );

  const client = new APIClient();
  const isAuthorized = await client.authorize(notesUser, notesPassword);
  if (!isAuthorized) {
    throw Error(
      `Could not authorize Notes API client. Check that you are using correct login/password pair`
    );
  }

  // get or create notebook:
  const notebookName = `${containingFolder} (workspace, v1)`;
  const notebook = await getOrCreateNotebook(client, notebookName);

  const repositories = getFoldersInPath(containingFolder);
  console.log(`found ${repositories.length} sub-folders`);

  const packageNotes: NoteForm[] = [];
  for (const subFolder of repositories) {
    const sourceDir = `${containingFolder}/${subFolder}`;
    console.log("Reading data from", subFolder);

    const repo = new GitRepository(sourceDir);
    const commits = await repo.getListOfCommits();
    const firstCommitDate = new Date(
      commits[commits.length - 1].commit.author.timestamp * 1000
    );
    const lastCommitDate = new Date(commits[0].commit.author.timestamp * 1000);

    const note = {
      id: "",
      "note-type": "date-range",
      "notebook-id": notebook.id,
      "note-content": subFolder,
      "date-range-start": firstCommitDate.toISOString().split("T")[0],
      "date-range-end": lastCommitDate.toISOString().split("T")[0],
    };
    packageNotes.push(note);
  }
  // publish data:
  const publishBatchSize = 3;
  let i = 0;
  let notes: NoteForm[] = [];
  for (const note of packageNotes) {
    i += 1;
    notes.push(note);
    if (notes.length < publishBatchSize) {
      console.log(
        `Collected note data on ${note["note-content"]} to publish in batch of ${publishBatchSize}. Progress: ${i} out of ${packageNotes.length} processed`
      );
      continue;
    }

    const noteResponse = await client.createNotes(notes);
    notes = [];
    console.log(
      `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${packageNotes.length} complete`
    );
  }
  // publish last batch:
  const noteResponse = await client.createNotes(notes);
  console.log(
    `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${packageNotes.length} complete`
  );
}
main();
