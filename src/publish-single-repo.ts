import { Note } from "notes-model/dist/note-model.js";

import { authorizeClient } from "./authorize-client.js";
import { collectDataFromGitRepo } from "./collect-data.js";
import { getOrCreateNotebook } from "./get-or-create-notebook.js";
import {
  createFilesInNotebook,
  updateFilesInNotebook,
} from "./publish-files-to-notebook.js";

interface PublisherConfiguration {
  gitRepo: string;
  notesEndpoint: string;
  notesUser: string;
  notesPassword: string;
}

function configureFromEnvironment(): PublisherConfiguration {
  const gitRepo = process.env.SOURCE_DIR;
  const notesEndpoint = process.env.API_ROOT;
  const notesUser = process.env.NOTES_USER;
  const notesPassword = process.env.NOTES_PASSWORD;
  if (!gitRepo) {
    throw Error(
      "Please define SOURCE_DIR to point to your local git repository to collect data from"
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
    gitRepo,
    notesEndpoint,
    notesUser,
    notesPassword,
  };
}

function getProjectName(gitRepo: string): string {
  const gitRepoParts = gitRepo.split("/");
  return gitRepoParts[gitRepoParts.length - 1];
}

async function main() {
  // configure:
  const { gitRepo, notesEndpoint, notesUser, notesPassword } =
    configureFromEnvironment();

  // collect data from git:
  console.log(`Collecting data from git repo: ${gitRepo}`);
  const files = await collectDataFromGitRepo(gitRepo);

  // authorize client:
  const client = await authorizeClient(notesEndpoint, notesUser, notesPassword);

  // get or create notebook:
  const notebookName = `${getProjectName(gitRepo)} (gitRepo, v8)`;
  const notebook = await getOrCreateNotebook(client, notebookName);

  // list existing notes in that notebook
  const resp = await client.listNotes(notebook.id);
  if (resp.httpCode !== 200) {
    throw Error(`Could not list existing items in notebook ${resp}`);
  }
  const existingItems: Note[] = resp.body;

  if (existingItems.length === 0) {
    console.log("publishing all files to an empty notebook");
    await createFilesInNotebook({
      client,
      files,
      notebook,
    });
    return;
  }

  console.log("publishing only new / updated items to an existing notebook");
  await updateFilesInNotebook({
    client,
    notebookID: notebook.id,
    existingNotes: existingItems,
    files,
  });
}
main();
