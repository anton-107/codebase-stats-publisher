# Codebase stats collector module

Module to publish a codebase collected by codebase-stats-collector module into [notes-webserver](https://github.com/anton-107/notes-webserver).

# Usage:

Run `SOURCE_DIR=<YOUR GIT REPO> NOTES_ENDPOINT=<YOUR NOTES API ENDPOINT> NOTES_USER=<YOUR USERNAME> NOTES_PASSWORD=<YOUR PASSWORD> npm run publish-data`

# How the data is published:

- Each time a new notebook is created
- Each file in the repo is added to the notebook as a note
- The following information is added to each file as a note attribute:

  - Lines of code
  - Number of contributors
  - Number of times changed
