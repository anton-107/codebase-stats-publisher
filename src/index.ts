async function main() {
  const gitRepo = process.env.SOURCE_DIR;
  const notesEndpoint = process.env.NOTES_API_ENDPOINT;
  const notesUser = process.env.NOTES_USER;
  const notesPassword = process.env.NOTES_PASSWORD;
  if (!gitRepo) {
    throw Error('Please define SOURCE_DIR to point to your local git repository to collect data from');
  }
  if (!notesEndpoint) {
    throw Error('Please define NOTES_API_ENDPOINT to point to your local or remote Notes API');
  }
  if (!notesUser) {
    throw Error('Please define NOTES_USER to specify the Notes user to publish the repo data');
  }
  if (!notesPassword) {
    throw Error('Please define NOTES_PASSWORD to specify the Notes user password');
  }
  console.log(`Collecting data from git repo: ${gitRepo}`);

  // TODO: collect data

  console.log(`Publishing collected data to: ${notesEndpoint} as user ${notesUser}`);
}
main();
