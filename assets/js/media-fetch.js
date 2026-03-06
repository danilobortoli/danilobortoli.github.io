(function () {
  "use strict";

  var card = document.querySelector(".media-review");
  if (!card) return;

  var type = card.dataset.mediaType;
  var tmdbId = card.dataset.tmdbId;
  var mbId = card.dataset.musicbrainzId;

  // Only fetch if we have an ID and fields are empty (not manually filled)
  if (type === "filme" && tmdbId) {
    fetchTMDB(tmdbId);
  } else if ((type === "álbum" || type === "canção") && mbId) {
    fetchMusicBrainz(mbId, type);
  }

  function fetchTMDB(id) {
    var key = window.TMDB_API_KEY;
    if (!key) return;

    var url =
      "https://api.themoviedb.org/3/movie/" +
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
        // Title
        var titleEl = card.querySelector(".media-review-title");
        if (titleEl && !titleEl.textContent.trim()) {
          titleEl.textContent = data.title || data.original_title;
        }

        // Poster
        var imgEl = card.querySelector(".media-review-img");
        if (data.poster_path && imgEl.classList.contains("media-review-placeholder")) {
          var img = document.createElement("img");
          img.src = "https://image.tmdb.org/t/p/w300" + data.poster_path;
          img.alt = data.title || "Poster";
          img.className = "media-review-img";
          imgEl.parentNode.replaceChild(img, imgEl);
        }

        // Director
        var dirEl = card.querySelector(".media-review-director");
        if (dirEl && !dirEl.textContent.trim() && data.credits && data.credits.crew) {
          var directors = data.credits.crew.filter(function (c) {
            return c.job === "Director";
          });
          if (directors.length > 0) {
            dirEl.textContent = directors
              .map(function (d) {
                return d.name;
              })
              .join(", ");
          }
        }

        // Year
        var yearEl = card.querySelector(".media-review-year");
        if (yearEl && !yearEl.textContent.trim() && data.release_date) {
          yearEl.textContent = data.release_date.substring(0, 4);
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

  function fetchMusicBrainz(id, mediaType) {
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
