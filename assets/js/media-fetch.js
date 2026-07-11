(function () {
  "use strict";

  var cards = document.querySelectorAll(".media-review");
  if (!cards.length) return;

  Array.prototype.forEach.call(cards, function (card) {
    var type = card.dataset.mediaType;
    var tmdbId = card.dataset.tmdbId;
    var mbId = card.dataset.musicbrainzId;
    var olId = card.dataset.openlibraryId;

    // Only fetch if we have an ID and fields are empty (not manually filled)
    if ((type === "filme" || type === "série") && tmdbId) {
      fetchTMDB(card, tmdbId, type);
    } else if ((type === "álbum" || type === "canção") && mbId) {
      fetchMusicBrainz(card, mbId, type);
    } else if (type === "livro" && olId) {
      fetchOpenLibrary(card, olId);
    }
  });

  function fetchTMDB(card, id, mediaType) {
    var key = window.TMDB_API_KEY;
    if (!key) return;

    var endpoint = mediaType === "série" ? "tv" : "movie";
    var url =
      "https://api.themoviedb.org/3/" +
      endpoint +
      "/" +
      id +
      "?api_key=" +
      key +
      "&language=pt-BR&append_to_response=credits";

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("TMDB HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var title = data.title || data.name || data.original_title || data.original_name;

        // Title
        var titleEl = card.querySelector(".media-review-title");
        if (titleEl && !titleEl.textContent.trim()) {
          titleEl.textContent = title;
        }

        // Poster
        var imgEl = card.querySelector(".media-review-img");
        if (data.poster_path && imgEl.classList.contains("media-review-placeholder")) {
          var img = document.createElement("img");
          img.src = "https://image.tmdb.org/t/p/w300" + data.poster_path;
          img.alt = title || "Poster";
          img.className = "media-review-img";
          imgEl.parentNode.replaceChild(img, imgEl);
        }

        // Director (filme) / Creator (série)
        var dirEl = card.querySelector(".media-review-director");
        if (dirEl && !dirEl.textContent.trim()) {
          var creator = null;
          if (mediaType === "série") {
            if (data.created_by && data.created_by.length > 0) {
              creator = data.created_by.map(function (p) { return p.name; }).join(", ");
            }
          } else if (data.credits && data.credits.crew) {
            var directors = data.credits.crew.filter(function (c) {
              return c.job === "Director";
            });
            if (directors.length > 0) {
              creator = directors.map(function (d) { return d.name; }).join(", ");
            }
          }
          if (creator) dirEl.textContent = creator;
        }

        // Year
        var yearEl = card.querySelector(".media-review-year");
        var date = data.release_date || data.first_air_date;
        if (yearEl && !yearEl.textContent.trim() && date) {
          yearEl.textContent = date.substring(0, 4);
        }

        // Genres
        var genreEl = card.querySelector(".media-review-genres");
        if (genreEl && !genreEl.textContent.trim() && data.genres) {
          genreEl.textContent = data.genres
            .map(function (g) {
              return g.name;
            })
            .join(", ");
        }
      })
      .catch(function (err) {
        console.warn("Erro ao buscar dados do TMDB:", err);
      });
  }

  function fetchMusicBrainz(card, id, mediaType) {
    var entity = mediaType === "álbum" ? "release-group" : "recording";
    var inc = "artist-credits+genres" + (mediaType === "canção" ? "+releases" : "");
    var url =
      "https://musicbrainz.org/ws/2/" + entity + "/" + id +
      "?inc=" + inc + "&fmt=json";

    fetch(url)
      .then(function (r) {
        if (!r.ok) {
          // If album ID is a release instead of release-group, retry as release
          if (mediaType === "álbum" && r.status === 404) {
            return fetch(
              "https://musicbrainz.org/ws/2/release/" + id +
              "?inc=artist-credits+genres+release-groups&fmt=json"
            ).then(function (r2) {
              if (!r2.ok) throw new Error("MusicBrainz HTTP " + r2.status);
              return r2.json().then(function (releaseData) {
                releaseData._isRelease = true;
                return releaseData;
              });
            });
          }
          // If song ID is a release (single) instead of recording, retry as release
          if (mediaType === "canção" && r.status === 404) {
            return fetch(
              "https://musicbrainz.org/ws/2/release/" + id +
              "?inc=artist-credits+genres+recordings+release-groups&fmt=json"
            ).then(function (r2) {
              if (!r2.ok) throw new Error("MusicBrainz HTTP " + r2.status);
              return r2.json().then(function (releaseData) {
                releaseData._isRelease = true;
                // Extract album title from the release itself
                if (!releaseData.releases) {
                  releaseData.releases = [{ id: id, title: releaseData.title }];
                }
                return releaseData;
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

        // Title
        var titleEl = card.querySelector(".media-review-title");
        if (titleEl && !titleEl.textContent.trim()) {
          titleEl.textContent = data.title;
        }

        // Artist
        var artistEl = card.querySelector(".media-review-artist");
        if (artistEl && !artistEl.textContent.trim() && data["artist-credit"]) {
          artistEl.textContent = data["artist-credit"]
            .map(function (a) {
              return a.name || (a.artist && a.artist.name);
            })
            .join(", ");
        }

        // Year
        var yearEl = card.querySelector(".media-review-year");
        if (yearEl && !yearEl.textContent.trim()) {
          var date = data["first-release-date"] || data.date || "";
          if (date) {
            yearEl.textContent = date.substring(0, 4);
          }
        }

        // Genres — for releases, also check release-group genres
        var genreEl = card.querySelector(".media-review-genres");
        if (genreEl && !genreEl.textContent.trim()) {
          var genres = (data.genres && data.genres.length > 0) ? data.genres : null;
          if (!genres && data._isRelease && data["release-group"] && data["release-group"].genres) {
            genres = data["release-group"].genres;
          }
          if (genres && genres.length > 0) {
            genreEl.textContent = genres
              .map(function (g) {
                return g.name;
              })
              .join(", ");
          }
        }

        // Album (for songs)
        if (mediaType === "canção" && data.releases && data.releases.length > 0) {
          var albumEl = card.querySelector(".media-review-album");
          if (albumEl && !albumEl.textContent.trim()) {
            albumEl.textContent = data.releases[0].title;
          }
        }

        // Cover art from Cover Art Archive
        var imgEl = card.querySelector(".media-review-img");
        if (imgEl.classList.contains("media-review-placeholder")) {
          var coverId = releaseGroupId || id;
          var coverEntity = releaseGroupId ? "release-group" : (data._isRelease ? "release" : "release-group");
          // For recordings, try to get cover from the first release
          if (mediaType === "canção" && data.releases && data.releases.length > 0) {
            coverId = data.releases[0].id;
            coverEntity = "release";
          }
          // For song as release, also try release-group for cover
          if (mediaType === "canção" && data._isRelease && data["release-group"]) {
            coverId = data["release-group"].id;
            coverEntity = "release-group";
          }
          fetchCoverArt(coverId, coverEntity, imgEl, data.title || "Capa");
        }
      })
      .catch(function (err) {
        console.warn("Erro ao buscar dados do MusicBrainz:", err);
      });
  }

  function fetchOpenLibrary(card, id) {
    // id can be a works ID (OL...W) or editions ID (OL...M)
    var isWork = /W$/.test(id);
    var url = "https://openlibrary.org/" + (isWork ? "works/" : "books/") + id + ".json";

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("OpenLibrary HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        // Title
        var titleEl = card.querySelector(".media-review-title");
        if (titleEl && !titleEl.textContent.trim() && data.title) {
          titleEl.textContent = data.title;
        }

        // Year
        var yearEl = card.querySelector(".media-review-year");
        if (yearEl && !yearEl.textContent.trim()) {
          var year = "";
          if (data.first_publish_date) {
            year = data.first_publish_date.match(/\d{4}/);
            if (year) year = year[0];
          } else if (data.publish_date) {
            year = data.publish_date.match(/\d{4}/);
            if (year) year = year[0];
          }
          if (year) yearEl.textContent = year;
        }

        // Cover
        var imgEl = card.querySelector(".media-review-img");
        if (imgEl && imgEl.classList.contains("media-review-placeholder")) {
          var coverId = null;
          if (data.covers && data.covers.length > 0) {
            coverId = data.covers[0];
          }
          if (coverId) {
            var img = document.createElement("img");
            img.src = "https://covers.openlibrary.org/b/id/" + coverId + "-M.jpg";
            img.alt = data.title || "Capa";
            img.className = "media-review-img";
            imgEl.parentNode.replaceChild(img, imgEl);
          }
        }

        // Author — works have authors as [{author: {key: "/authors/OL..."}}]
        var authorEl = card.querySelector(".media-review-author");
        if (authorEl && !authorEl.textContent.trim() && data.authors) {
          var authorKeys = data.authors.map(function (a) {
            return a.author ? a.author.key : a.key;
          }).filter(Boolean);

          if (authorKeys.length > 0) {
            Promise.all(authorKeys.map(function (key) {
              return fetch("https://openlibrary.org" + key + ".json")
                .then(function (r) { return r.ok ? r.json() : null; });
            })).then(function (authors) {
              var names = authors.filter(Boolean).map(function (a) { return a.name; });
              if (names.length > 0 && !authorEl.textContent.trim()) {
                authorEl.textContent = names.join(", ");
              }
            });
          }
        }

        // Publisher (editions only)
        var pubEl = card.querySelector(".media-review-publisher");
        if (pubEl && !pubEl.textContent.trim() && data.publishers && data.publishers.length > 0) {
          pubEl.textContent = data.publishers[0];
        }

        // Genres/Subjects
        var genreEl = card.querySelector(".media-review-genres");
        if (genreEl && !genreEl.textContent.trim() && data.subjects && data.subjects.length > 0) {
          var subjects = data.subjects.slice(0, 3);
          // subjects can be strings or objects with name
          genreEl.textContent = subjects.map(function (s) {
            return typeof s === "string" ? s : s.name;
          }).join(", ");
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
          var front = data.images.find(function (img) {
            return img.front;
          });
          var imageUrl = front
            ? front.thumbnails.small || front.thumbnails["250"] || front.image
            : data.images[0].thumbnails.small || data.images[0].image;

          var img = document.createElement("img");
          img.src = imageUrl;
          img.alt = alt;
          img.className = "media-review-img";
          imgEl.parentNode.replaceChild(img, imgEl);
        }
      })
      .catch(function () {
        // Cover art not available, keep placeholder
      });
  }
})();
