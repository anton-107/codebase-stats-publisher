import {
  APIClient,
  Notebook,
} from "notes-webserver-apiclient/dist/api-client.js";

import { File } from "./collect-data.js";

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

interface PublishFilesToNotebookProperties {
  client: APIClient;
  files: File[];
  notebook: Notebook;
}

export async function createFilesInNotebook(
  props: PublishFilesToNotebookProperties
): Promise<void> {
  // publish data:
  const publishBatchSize = 3;
  let i = 0;
  let notes = [];
  for (const file of props.files) {
    i += 1;
    notes.push(buildNote(props.notebook.id, file));
    if (notes.length < publishBatchSize) {
      console.log(
        `Collected note data on ${file.filePath} to publish in batch of ${publishBatchSize}. Progress: ${i} out of ${props.files.length} processed`
      );
      continue;
    }

    const noteResponse = await props.client.createNotes(notes);
    notes = [];
    console.log(
      `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${props.files.length} complete`
    );
  }
  // publish last batch:
  const noteResponse = await props.client.createNotes(notes);
  notes = [];
  console.log(
    `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${props.files.length} complete`
  );
}
