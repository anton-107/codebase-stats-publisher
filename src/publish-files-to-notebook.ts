import { Note } from "notes-model/dist/note-model.js";
import { Notebook } from "notes-model/dist/notebook-model.js";
import {
  APIClient,
  NoteForm,
} from "notes-webserver-apiclient/dist/api-client.js";

import { File } from "./collect-data.js";
import { arraysHaveSameContent } from "./compare-objects.js";

function areEqual(note: Note, file: File): boolean {
  if (
    String(note.extensionProperties.numberOfLines) !==
    String(file.numberOfLines)
  ) {
    return false;
  }
  if (
    String(note.extensionProperties.numberOfChanges) !==
    String(file.numberOfChanges)
  ) {
    return false;
  }
  if (
    String(note.extensionProperties.numberOfContributors) !==
    String(file.contributors?.length)
  ) {
    return false;
  }
  if (
    !arraysHaveSameContent(
      note.extensionProperties.contributors as unknown as Record<
        string,
        unknown
      >[],
      file.contributors as unknown as Record<string, unknown>[]
    )
  ) {
    console.log(
      "arrays do not have the same content: ",
      note.extensionProperties.contributors,
      file.contributors
    );
    return false;
  }
  return true;
}

function buildNote(notebookID: string, file: File): NoteForm {
  return {
    id: "",
    "note-type": "source-file",
    "notebook-id": notebookID,
    "note-content": file.filePath,
    "number-of-lines": String(file.numberOfLines),
    "number-of-changes": String(file.numberOfChanges),
    "number-of-contributors": String(
      file.contributors ? file.contributors.length : 0
    ),
    contributors: JSON.stringify(file.contributors),
  };
}

interface CreateFilesInNotebookProperties {
  client: APIClient;
  files: File[];
  notebook: Notebook;
}

export async function createFilesInNotebook(
  props: CreateFilesInNotebookProperties
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

interface UpdateFilesInNotebookProperties {
  client: APIClient;
  notebookID: string;
  existingNotes: Note[];
  files: File[];
}

export async function updateFilesInNotebook(
  props: UpdateFilesInNotebookProperties
): Promise<void> {
  // Find items that need to be updated
  const itemsToCreate: NoteForm[] = [];
  const itemsToUpdate: NoteForm[] = [];
  props.files.forEach((file) => {
    const existingNote = props.existingNotes.find(
      (note) => file.filePath === note.content
    );
    if (!existingNote) {
      itemsToCreate.push(buildNote(props.notebookID, file));
      return;
    }
    if (!areEqual(existingNote, file)) {
      const noteToUpdate = buildNote(props.notebookID, file);
      noteToUpdate["note-id"] = existingNote.id;
      itemsToUpdate.push(noteToUpdate);
      return;
    }
  });

  console.log("Found the following items to create:", itemsToCreate.length);
  for (const item of itemsToCreate) {
    console.log("Item creation attempt: ", item);
    const resp = await props.client.createNote(
      item["notebook-id"],
      item["note-content"],
      item
    );
    console.log("Item creation status code: ", resp.httpCode, resp.body);
  }

  console.log("Found the following items to update:", itemsToUpdate.length);
  for (const item of itemsToUpdate) {
    console.log("Item update attempt: ", item);
    const resp = await props.client.updateNote(item["note-id"], item);
    console.log("Item update status code: ", resp.httpCode, resp.body);
  }
}
