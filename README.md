# CHS Pages

CHS Pages is a build-free short-story library for CHS Literacy Days in grades 9–12. It includes four selectable volumes of nine complete stories, a searchable catalog, a paginated reader and personal five-star ratings. Bookmarks, reading position, appearance settings and ratings stay in the current browser profile.

## Run locally

Open a terminal in the folder containing `index.html`. If you downloaded a ZIP, extract it first.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit http://localhost:8000/ in your browser. Serve the files over localhost or HTTPS so JavaScript modules and the service worker can load.

## Deploy on Netlify

This folder is the git repository for https://github.com/chagoyan/chspages, and its root is the site root. Netlify hosts the site from that repository. There is no build step, and `netlify.toml` tells Netlify to publish the repository root as it is.

To connect the site once, sign in to Netlify and import an existing project from GitHub. Select `chagoyan/chspages` and the `main` branch, leave the build command empty, and deploy. Netlify reads the publish directory from `netlify.toml`. [Netlify build settings](https://docs.netlify.com/build/configure-builds/overview/)

After that, every push to `main` publishes a new version automatically. Netlify assigns an address ending in `netlify.app`, which you can rename in the project's domain settings.

## Install and read offline

Open the deployed site online once and let the service worker finish preparing the library and all available stories. Use the browser’s install or Add to Home Screen command when supported. After setup, the library and all 36 stories can reopen offline.

Increment the cache version in `service-worker.js` whenever you release changes to app assets, the catalog or story texts. A newly installed worker takes over after older tabs or app windows on that site close. The service worker uses its own cache namespace and version, so a new cache version does not clear reader data.

Keep the storage key in `js/storage.js` (`chs-pages:v1`) unchanged so returning readers retain their bookmarks, progress, preferences and ratings. Data saved by earlier builds under `thursday-pages:v1` moves to the current key automatically the first time a reader opens the site.

## Story catalog and attribution

All 36 stories are complete texts in the U.S. public domain. Each has an individual source credit, shown in the reader and recorded in `data/stories.json`. Most are from Project Gutenberg. The Chopin and Twain transcriptions credited to Wikisource follow historical editions. *The Open Window* uses David Price’s transcription of the 1914 edition of *Beasts and Super-Beasts*. *The Necklace* uses an English translation published in 1916 in *Short Stories Old and New*. Each story file in `stories/` is plain text with a blank line between paragraphs.

Each catalog record has a short `description` in three brief phrases that avoid spoiling the ending. The home page shows the description of the story marked `featured: true`, currently *The Open Window*. To feature a different story, move that flag to its record.

To publish another story, verify the exact edition and its U.S. public-domain status, then add the full plain-text file under `stories/`. Add its record to `data/stories.json` with `status: "available"`, a description, an actual word count, edition label and path, and the source and rights metadata. Reading time is rounded up at 220 words per minute. Each story currently has one edition. The reader displays an edition selector when a story has multiple editions. Check the rights for any translation or adaptation independently and label it clearly.

## Ratings

The end of each available story has a five-star rating that can be changed. `js/ratings.js` is the integration point for future shared ratings. A future Apps Script service would need server-side rating validation, one updatable record per anonymous reader and story, concurrency-safe writes, and aggregate counts and averages. The starter stores personal ratings locally and sends no rating data over the network.
