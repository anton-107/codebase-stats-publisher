import {
  APIClient,
  NoteForm,
} from "notes-webserver-apiclient/dist/api-client.js";

interface PublishNotesProperties {
  client: APIClient;
  notes: NoteForm[];
}
export async function publishNotes(
  props: PublishNotesProperties
): Promise<void> {
  // publish data:
  const publishBatchSize = 3;
  let i = 0;
  let notes: NoteForm[] = [];
  for (const note of props.notes) {
    i += 1;
    notes.push(note);
    if (notes.length < publishBatchSize) {
      console.log(
        `Collected note data on ${note["note-content"]} to publish in batch of ${publishBatchSize}. Progress: ${i} out of ${props.notes.length} processed`
      );
      continue;
    }

    const noteResponse = await props.client.createNotes(notes);
    notes = [];
    console.log(
      `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${props.notes.length} complete`
    );
  }
  // publish last batch:
  const noteResponse = await props.client.createNotes(notes);
  console.log(
    `Response from note creation : ${noteResponse.httpCode}. Progress: ${i} out of ${props.notes.length} complete`
  );
}
