(function () {
  "use strict";

  var cards = document.querySelectorAll(".avaliacao-card");
  if (!cards.length) return;

  // Queue requests to respect MusicBrainz rate limit (1 req/sec)
  var mbQueue = [];
  var mbRunning = false;

  function processMbQueue() {
    if (mbRunning || mbQueue.length === 0) return;
    mbRunning = true;
    var task = mbQueue.shift();
    task(function () {
      mbRunning = false;
      setTimeout(processMbQueue, 1100);
    });
  }

  cards.forEach(function (card) {
    var type = card.dataset.mediaType;
    var tmdbId = card.dataset.tmdbId;
    var mbId = card.dataset.musicbrainzId;
    var olId = card.dataset.openlibraryId;

    if (type === "filme" && tmdbId) {
      fetchTMDB(card, tmdbId);
    } else if ((type === "álbum" || type === "canção") && mbId) {
      mbQueue.push(function (done) {
        fetchMusicBrainz(card, mbId, type, done);
      });
      processMbQueue();
    } else if (type === "livro" && olId) {
      fetchOpenLibrary(card, olId);
    }
  });

  function fetchTMDB(card, id) {
    var key = window.TMDB_API_KEY;
    if (!key) return;

    var url =
      "https://api.themoviedb.org/3/movie/" + id +
      "?api_key=" + key +
      "&language=pt-BR&append_to_response=credits";

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("TMDB HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var titleEl = card.querySelector(".avaliacao-title");
        if (titleEl && !titleEl.textContent.trim()) {
          titleEl.textContent = data.title || data.original_title;
        }

        var imgEl = card.querySelector(".avaliacao-img");
        if (data.poster_path && imgEl && imgEl.classList.contains("avaliacao-placeholder")) {
          var img = document.createElement("img");
          img.src = "https://image.tmdb.org/t/p/w200" + data.poster_path;
          img.alt = data.title || "Poster";
          img.className = "avaliacao-img";
          imgEl.parentNode.replaceChild(img, imgEl);
        }

        var creatorEl = card.querySelector(".avaliacao-creator");
        if (creatorEl && !creatorEl.textContent.trim() && data.credits && data.credits.crew) {
          var directors = data.credits.crew.filter(function (c) {
            return c.job === "Director";
          });
          if (directors.length > 0) {
            creatorEl.textContent = directors.map(function (d) { return d.name; }).join(", ");
          }
        }

        var yearEl = card.querySelector(".avaliacao-year");
        if (yearEl && !yearEl.textContent.trim() && data.release_date) {
          yearEl.textContent = "(" + data.release_date.substring(0, 4) + ")";
        }
      })
      .catch(function (err) {
        console.warn("Erro ao buscar dados do TMDB:", err);
      });
  }

  function fetchMusicBrainz(card, id, mediaType, done) {
    var entity = mediaType === "álbum" ? "release-group" : "recording";
    var inc = "artist-credits+genres" + (mediaType === "canção" ? "+releases" : "");
    var url =
      "https://musicbrainz.org/ws/2/" + entity + "/" + id +
      "?inc=" + inc + "&fmt=json";

    fetch(url)
      .then(function (r) {
        if (!r.ok) {
          if (mediaType === "álbum" && r.status === 404) {
            return fetch(
              "https://musicbrainz.org/ws/2/release/" + id +
              "?inc=artist-credits+genres+release-groups&fmt=json"
            ).then(function (r2) {
              if (!r2.ok) throw new Error("MusicBrainz HTTP " + r2.status);
              return r2.json().then(function (d) { d._isRelease = true; return d; });
            });
          }
          if (mediaType === "canção" && r.status === 404) {
            return fetch(
              "https://musicbrainz.org/ws/2/release/" + id +
              "?inc=artist-credits+genres+recordings+release-groups&fmt=json"
            ).then(function (r2) {
              if (!r2.ok) throw new Error("MusicBrainz HTTP " + r2.status);
              return r2.json().then(function (d) {
                d._isRelease = true;
                if (!d.releases) d.releases = [{ id: id, title: d.title }];
                return d;
              });
            });
          }
          throw new Error("MusicBrainz HTTP " + r.status);
        }
        return r.json();
      })
      .then(function (data) {
        var releaseGroupId = null;
        if (data._isRelease && data["release-group"]) {
          releaseGroupId = data["release-group"].id;
        }

        var titleEl = card.querySelector(".avaliacao-title");
        if (titleEl && !titleEl.textContent.trim()) {
          titleEl.textContent = data.title;
        }

        var creatorEl = card.querySelector(".avaliacao-creator");
        if (creatorEl && !creatorEl.textContent.trim() && data["artist-credit"]) {
          creatorEl.textContent = data["artist-credit"]
            .map(function (a) { return a.name || (a.artist && a.artist.name); })
            .join(", ");
        }

        var yearEl = card.querySelector(".avaliacao-year");
        if (yearEl && !yearEl.textContent.trim()) {
          var date = data["first-release-date"] || data.date || "";
          if (date) yearEl.textContent = "(" + date.substring(0, 4) + ")";
        }

        var imgEl = card.querySelector(".avaliacao-img");
        if (imgEl && imgEl.classList.contains("avaliacao-placeholder")) {
          var coverId = releaseGroupId || id;
          var coverEntity = releaseGroupId ? "release-group" : (data._isRelease ? "release" : "release-group");
          if (mediaType === "canção" && data.releases && data.releases.length > 0) {
            coverId = data.releases[0].id;
            coverEntity = "release";
          }
          if (mediaType === "canção" && data._isRelease && data["release-group"]) {
            coverId = data["release-group"].id;
            coverEntity = "release-group";
          }
          fetchCoverArt(coverId, coverEntity, imgEl, data.title || "Capa");
        }

        if (done) done();
      })
      .catch(function (err) {
        console.warn("Erro ao buscar dados do MusicBrainz:", err);
        if (done) done();
      });
  }

  function fetchOpenLibrary(card, id) {
    var isWork = /W$/.test(id);
    var url = "https://openlibrary.org/" + (isWork ? "works/" : "books/") + id + ".json";

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("OpenLibrary HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var titleEl = card.querySelector(".avaliacao-title");
        if (titleEl && !titleEl.textContent.trim() && data.title) {
          titleEl.textContent = data.title;
        }

        var yearEl = card.querySelector(".avaliacao-year");
        if (yearEl && !yearEl.textContent.trim()) {
          var year = "";
          var dateStr = data.first_publish_date || data.publish_date || "";
          if (dateStr) {
            var match = dateStr.match(/\d{4}/);
            if (match) year = match[0];
          }
          if (year) yearEl.textContent = "(" + year + ")";
        }

        var imgEl = card.querySelector(".avaliacao-img");
        if (imgEl && imgEl.classList.contains("avaliacao-placeholder") && data.covers && data.covers.length > 0) {
          var img = document.createElement("img");
          img.src = "https://covers.openlibrary.org/b/id/" + data.covers[0] + "-M.jpg";
          img.alt = data.title || "Capa";
          img.className = "avaliacao-img";
          imgEl.parentNode.replaceChild(img, imgEl);
        }

        var creatorEl = card.querySelector(".avaliacao-creator");
        if (creatorEl && !creatorEl.textContent.trim() && data.authors) {
          var authorKeys = data.authors.map(function (a) {
            return a.author ? a.author.key : a.key;
          }).filter(Boolean);

          if (authorKeys.length > 0) {
            Promise.all(authorKeys.map(function (key) {
              return fetch("https://openlibrary.org" + key + ".json")
                .then(function (r) { return r.ok ? r.json() : null; });
            })).then(function (authors) {
              var names = authors.filter(Boolean).map(function (a) { return a.name; });
              if (names.length > 0 && !creatorEl.textContent.trim()) {
                creatorEl.textContent = names.join(", ");
              }
            });
          }
        }
      })
      .catch(function (err) {
        console.warn("Erro ao buscar dados do Open Library:", err);
      });
  }

  function fetchCoverArt(id, entity, imgEl, alt) {
    var url = "https://coverartarchive.org/" + entity + "/" + id;
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("CoverArt HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (data.images && data.images.length > 0) {
          var front = data.images.find(function (img) { return img.front; });
          var imageUrl = front
            ? front.thumbnails.small || front.thumbnails["250"] || front.image
            : data.images[0].thumbnails.small || data.images[0].image;

          var img = document.createElement("img");
          img.src = imageUrl;
          img.alt = alt;
          img.className = "avaliacao-img";
          imgEl.parentNode.replaceChild(img, imgEl);
        }
      })
      .catch(function () {
        // Cover art not available
      });
  }
})();
