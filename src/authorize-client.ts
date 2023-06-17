import { APIClient } from "notes-webserver-apiclient/dist/api-client.js";

export async function authorizeClient(
  notesEndpoint: string,
  notesUser: string,
  notesPassword: string
): Promise<APIClient> {
  // authorize client
  console.log(
    `Authorizing client against endpoint ${notesEndpoint} as user ${notesUser}`
  );

  const client = new APIClient();
  const isAuthorized = await client.authorize(notesUser, notesPassword);
  if (!isAuthorized) {
    throw Error(
      `Could not authorize Notes API client. Check that you are using correct login/password pair`
    );
  }
  return client;
}
