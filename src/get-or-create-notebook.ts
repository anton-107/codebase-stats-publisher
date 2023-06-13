import { Notebook } from "notes-model/dist/notebook-model.js";
import { APIClient } from "notes-webserver-apiclient/dist/api-client.js";

export async function getOrCreateNotebook(
  client: APIClient,
  notebookName: string
): Promise<Notebook> {
  console.log("listing all notebooks");
  const resp = await client.listNotebooks();
  if (resp.httpCode !== 200) {
    throw Error(`Could not list notebooks. Got response: ${resp}`);
  }
  const notebooks: Notebook[] = resp.body;
  const existingNotebook = notebooks.find((x) => x.name === notebookName);

  if (!existingNotebook) {
    return await createNotebook(client, notebookName);
  }

  console.log("found an existing notebook:", existingNotebook);
  return existingNotebook;
}

async function createNotebook(
  client: APIClient,
  notebookName: string
): Promise<Notebook> {
  const notebookResponse = await client.createNotebook(notebookName);
  if (notebookResponse.httpCode !== 200) {
    throw Error(
      `Could not create notebook: ${notebookResponse.httpCode} - ${notebookResponse.body}`
    );
  }
  console.log("created a new notebook:", notebookResponse.body);
  return notebookResponse.body;
}
