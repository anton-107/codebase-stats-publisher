import { GitRepository } from "codebase-stats-collector/dist/git-reader/git-repository.js";
import fs from "fs";
import {
  APIClient,
  NoteForm,
} from "notes-webserver-apiclient/dist/api-client.js";

import { getOrCreateNotebook } from "./get-or-create-notebook.js";
import { publishNotes } from "./publish-notes.js";
import { Commit } from "codebase-stats-collector/dist/interfaces.js";

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

async function buildNotesForRepo(
  repoPaths: string[],
  containingFolder: string,
  notebookID: string
): Promise<NoteForm[]> {
  const repoNotes: NoteForm[] = [];
  for (const subFolder of repoPaths) {
    const sourceDir = `${containingFolder}/${subFolder}`;
    console.log("Reading data from", subFolder);

    const repo = new GitRepository(sourceDir);
    let commits: Commit[] = [];
    try {
      commits = await repo.getListOfCommits();
    } catch (e) {
      console.warn("Could not read commits for ", sourceDir);
    }
    if (commits.length < 1) {
      continue;
    }
    const firstCommitDate = new Date(
      commits[commits.length - 1].commit.author.timestamp * 1000
    );
    const lastCommitDate = new Date(commits[0].commit.author.timestamp * 1000);

    const note = {
      id: "",
      "note-type": "date-range",
      "notebook-id": notebookID,
      "note-content": subFolder,
      "date-range-start": firstCommitDate.toISOString().split("T")[0],
      "date-range-end": lastCommitDate.toISOString().split("T")[0],
    };
    repoNotes.push(note);
  }
  return repoNotes;
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

  // form notes:
  const repoNotes: NoteForm[] = await buildNotesForRepo(
    repositories,
    containingFolder,
    notebook.id
  );

  await publishNotes({
    client,
    notes: repoNotes,
  });
}
main();
