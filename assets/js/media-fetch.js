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
    var url =
      "https://musicbrainz.org/ws/2/" +
      entity +
      "/" +
      id +
      "?inc=artist-credits+genres" +
      (mediaType === "canção" ? "+releases" : "") +
      "&fmt=json";

    fetch(url, {
      headers: { "User-Agent": "DaniloBortoliBlog/1.0 (blog pessoal)" },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
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
          var date = data["first-release-date"] || data["first-release"] || "";
          if (date) {
            yearEl.textContent = date.substring(0, 4);
          }
        }

        // Genres
        var genreEl = card.querySelector(".media-review-genres");
        if (genreEl && !genreEl.textContent.trim() && data.genres && data.genres.length > 0) {
          genreEl.textContent = data.genres
            .map(function (g) {
              return g.name;
            })
            .join(", ");
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
          var coverId = id;
          var coverEntity = "release-group";
          // For recordings, try to get cover from the first release
          if (mediaType === "canção" && data.releases && data.releases.length > 0) {
            coverId = data.releases[0].id;
            coverEntity = "release";
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
