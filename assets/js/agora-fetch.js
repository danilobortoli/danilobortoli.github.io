/**
 * agora-fetch.js
 * --------------
 * Para cada elemento .agora-cover com um ID externo (openlibrary_id,
 * musicbrainz_id, tmdb_id), busca a capa real e enriquece os campos
 * "creator" e "year" caso estejam vazios.
 */
(function () {
  "use strict";

  var covers = document.querySelectorAll(".agora-cover[data-media-type]");
  if (!covers.length) return;

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

  covers.forEach(function (cover) {
    var type = cover.dataset.mediaType;
    var tmdbId = cover.dataset.tmdbId;
    var mbId = cover.dataset.musicbrainzId;
    var olId = cover.dataset.openlibraryId;

    if (type === "filme" && tmdbId) {
      fetchTMDB(cover, tmdbId);
    } else if ((type === "álbum" || type === "canção") && mbId) {
      mbQueue.push(function (done) {
        fetchMusicBrainz(cover, mbId, type, done);
      });
      processMbQueue();
    } else if (type === "livro" && olId) {
      fetchOpenLibrary(cover, olId);
    }
  });

  function row(cover) {
    return cover.closest(".agora-media-row");
  }

  function setCoverImage(cover, imageUrl, alt) {
    if (!imageUrl) return;
    cover.innerHTML = "";
    cover.style.background = "none";
    cover.style.padding = "0";
    var img = document.createElement("img");
    img.src = imageUrl;
    img.alt = alt || "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "inherit";
    cover.appendChild(img);
  }

  function fillIfEmpty(scope, selector, value) {
    if (!scope || !value) return;
    var el = scope.querySelector(selector);
    if (el && !el.textContent.trim()) {
      el.textContent = value;
    }
  }

  function fetchTMDB(cover, id) {
    var key = window.TMDB_API_KEY;
    if (!key) return;

    var url =
      "https://api.themoviedb.org/3/movie/" + id +
      "?api_key=" + key +
      "&language=pt-BR&append_to_response=credits";

    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("TMDB " + r.status); return r.json(); })
      .then(function (data) {
        var r = row(cover);
        if (data.poster_path) {
          setCoverImage(cover, "https://image.tmdb.org/t/p/w200" + data.poster_path, data.title);
        }
        fillIfEmpty(r, ".agora-media-titulo", data.title || data.original_title);
        if (data.credits && data.credits.crew) {
          var directors = data.credits.crew.filter(function (c) { return c.job === "Director"; });
          if (directors.length) {
            fillIfEmpty(r, ".agora-media-creator", directors.map(function (d) { return d.name; }).join(", "));
          }
        }
        if (data.release_date) {
          fillIfEmpty(r, ".agora-media-year", data.release_date.substring(0, 4));
        }
      })
      .catch(function (err) { console.warn("TMDB:", err); });
  }

  function fetchMusicBrainz(cover, id, mediaType, done) {
    var entity = mediaType === "álbum" ? "release-group" : "recording";
    var inc = "artist-credits+genres" + (mediaType === "canção" ? "+releases" : "");
    var url =
      "https://musicbrainz.org/ws/2/" + entity + "/" + id +
      "?inc=" + inc + "&fmt=json";

    fetch(url)
      .then(function (r) {
        if (!r.ok) {
          if (mediaType === "álbum" && r.status === 404) {
            return fetch("https://musicbrainz.org/ws/2/release/" + id +
              "?inc=artist-credits+genres+release-groups&fmt=json")
              .then(function (r2) {
                if (!r2.ok) throw new Error("MB " + r2.status);
                return r2.json().then(function (d) { d._isRelease = true; return d; });
              });
          }
          if (mediaType === "canção" && r.status === 404) {
            return fetch("https://musicbrainz.org/ws/2/release/" + id +
              "?inc=artist-credits+genres+recordings+release-groups&fmt=json")
              .then(function (r2) {
                if (!r2.ok) throw new Error("MB " + r2.status);
                return r2.json().then(function (d) {
                  d._isRelease = true;
                  if (!d.releases) d.releases = [{ id: id, title: d.title }];
                  return d;
                });
              });
          }
          throw new Error("MB " + r.status);
        }
        return r.json();
      })
      .then(function (data) {
        var r = row(cover);
        var releaseGroupId = null;
        if (data._isRelease && data["release-group"]) {
          releaseGroupId = data["release-group"].id;
        }

        fillIfEmpty(r, ".agora-media-titulo", data.title);
        if (data["artist-credit"]) {
          fillIfEmpty(r, ".agora-media-creator",
            data["artist-credit"].map(function (a) { return a.name || (a.artist && a.artist.name); }).join(", "));
        }
        var date = data["first-release-date"] || data.date || "";
        if (date) {
          fillIfEmpty(r, ".agora-media-year", date.substring(0, 4));
        }

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
        fetchCoverArt(coverId, coverEntity, cover, data.title);

        if (done) done();
      })
      .catch(function (err) {
        console.warn("MusicBrainz:", err);
        if (done) done();
      });
  }

  function fetchOpenLibrary(cover, id) {
    var isWork = /W$/.test(id);
    var url = "https://openlibrary.org/" + (isWork ? "works/" : "books/") + id + ".json";

    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("OL " + r.status); return r.json(); })
      .then(function (data) {
        var r = row(cover);
        fillIfEmpty(r, ".agora-media-titulo", data.title);

        if (data.covers && data.covers.length > 0) {
          setCoverImage(cover, "https://covers.openlibrary.org/b/id/" + data.covers[0] + "-M.jpg", data.title);
        } else if (isWork) {
          // Work doesn't have a cover at the work level; fall back to its editions.
          fetch("https://openlibrary.org/works/" + id + "/editions.json?limit=50")
            .then(function (resp) { return resp.ok ? resp.json() : null; })
            .then(function (eds) {
              if (!eds || !eds.entries) return;
              var edWithCover = eds.entries.find(function (e) {
                return e.covers && e.covers.length > 0 && e.covers[0] > 0;
              });
              if (edWithCover) {
                setCoverImage(cover, "https://covers.openlibrary.org/b/id/" + edWithCover.covers[0] + "-M.jpg", data.title);
              }
            })
            .catch(function () { /* mantém gradient */ });
        }

        var dateStr = data.first_publish_date || data.publish_date || "";
        if (dateStr) {
          var match = dateStr.match(/\d{4}/);
          if (match) fillIfEmpty(r, ".agora-media-year", match[0]);
        }

        if (data.authors) {
          var authorKeys = data.authors.map(function (a) {
            return a.author ? a.author.key : a.key;
          }).filter(Boolean);

          if (authorKeys.length > 0) {
            Promise.all(authorKeys.map(function (key) {
              return fetch("https://openlibrary.org" + key + ".json")
                .then(function (resp) { return resp.ok ? resp.json() : null; });
            })).then(function (authors) {
              var names = authors.filter(Boolean).map(function (a) { return a.name; });
              if (names.length > 0) fillIfEmpty(r, ".agora-media-creator", names.join(", "));
            });
          }
        }
      })
      .catch(function (err) { console.warn("OpenLibrary:", err); });
  }

  function fetchCoverArt(id, entity, cover, alt) {
    var url = "https://coverartarchive.org/" + entity + "/" + id;
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("CoverArt " + r.status); return r.json(); })
      .then(function (data) {
        if (data.images && data.images.length > 0) {
          var front = data.images.find(function (img) { return img.front; });
          var imageUrl = front
            ? front.thumbnails.small || front.thumbnails["250"] || front.image
            : data.images[0].thumbnails.small || data.images[0].image;
          setCoverImage(cover, imageUrl, alt);
        }
      })
      .catch(function () { /* sem capa, mantém gradient */ });
  }
})();
