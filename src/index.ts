import { APIClient } from "notes-webserver-apiclient/dist/api-client.js";

import { collectDataFromGitRepo, File } from "./collect-data.js";

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

function buildNote(notebookID: string, file: File) {
  return {
    id: "",
    "note-type": "source-file",
    notebookID,
    content: file.filePath,
    "number-of-lines": String(file.numberOfLines),
    "number-of-changes": String(file.numberOfChanges),
    "number-of-contributors": String(
      file.contributors ? file.contributors.length : 0
    ),
    contributors: JSON.stringify(file.contributors),
  };
}

function getProjectName(gitRepo: string): string {
  const gitRepoParts = gitRepo.split("/");
  return gitRepoParts[gitRepoParts.length - 1];
}

async function main() {
  const { gitRepo, notesEndpoint, notesUser, notesPassword } =
    configureFromEnvironment();

  console.log(`Collecting data from git repo: ${gitRepo}`);

  const files = await collectDataFromGitRepo(gitRepo);

  // publish data:
  console.log(
    `Publishing collected data to: ${notesEndpoint} as user ${notesUser}`
  );

  const client = new APIClient();
  const isAuthorized = await client.authorize(notesUser, notesPassword);
  if (!isAuthorized) {
    throw Error(
      `Could not authorize Notes API client. Check that you are using correct login/password pair`
    );
  }
  console.log("Client is authorized");
  const notebookResponse = await client.createNotebook(
    `${getProjectName(gitRepo)} (gitRepo, v4)`
  );
  if (notebookResponse.httpCode !== 200) {
    throw Error(
      `Could not create notebook: ${notebookResponse.httpCode} - ${notebookResponse.body}`
    );
  }

  const publishBatchSize = 3;
  let i = 0;
  let notes = [];
  for (const file of files) {
    i += 1;
    notes.push(buildNote(notebookResponse.body.id, file));
    if (notes.length < publishBatchSize) {
      console.log(
        `Collected note data on ${file.filePath} to publish in batch of ${publishBatchSize}. Progress: ${i} out of ${files.length} processed`
      );
      continue;
    }

    const noteResponse = await client.createNotes(notes);
    notes = [];
    console.log(
      `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${files.length} complete`
    );
  }
  // publish last batch:
  const noteResponse = await client.createNotes(notes);
  notes = [];
  console.log(
    `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${files.length} complete`
  );
}
main();
