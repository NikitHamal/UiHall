/* UI Hall — data layer.
   Loads the corpus once and exposes it to every module through one object.
   Dependency-free, and it works from file:// as well as from a server.

   Why there are two load paths: a browser blocks `fetch()` on file:// URLs
   (the origin is "null", so every request is cross-origin). Opening index.html
   straight off disk is a normal thing to do, so on file:// we load the generated
   `data/corpus.js` through a classic <script> tag instead — those are not
   blocked. On http(s) we fetch the JSON, which streams and can be cached. */

const DATA = (() => {
  let corpus = null;
  let byId = new Map();
  let loadPromise = null;

  function ingest(data) {
    corpus = data;
    byId = new Map(corpus.assets.map((a) => [a.id, a]));
    return corpus;
  }

  function loadViaFetch() {
    return fetch('data/corpus.json', { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error('corpus.json ' + res.status);
        return res.json();
      })
      .then(ingest);
  }

  /** Inject data/corpus.js and resolve once it has defined the global. */
  function loadViaScript() {
    return new Promise((resolve, reject) => {
      if (window.STORMY_CORPUS) return resolve(ingest(window.STORMY_CORPUS));
      const s = document.createElement('script');
      s.src = 'data/corpus.js';
      s.onload = () => {
        if (window.STORMY_CORPUS) resolve(ingest(window.STORMY_CORPUS));
        else reject(new Error('data/corpus.js loaded but defined no corpus'));
      };
      s.onerror = () => reject(new Error(
        'could not load data/corpus.js - run tools/build_corpus.py, ' +
        'or serve the folder over http instead of opening the file directly'));
      document.head.appendChild(s);
    });
  }

  async function load() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      if (location.protocol === 'file:') return loadViaScript();
      try {
        return await loadViaFetch();
      } catch (err) {
        // A server that does not send a JSON content type, or a fetch blocked
        // for some other reason, should still end in a working page.
        console.warn('corpus fetch failed, falling back to corpus.js:', err.message);
        return await loadViaScript();
      }
    })();
    return loadPromise;
  }

  return {
    load,
    get corpus() { return corpus; },
    get assets() { return corpus ? corpus.assets : []; },
    get(id) { return byId.get(id); },
    all() { return corpus ? corpus.assets : []; },
  };
})();
