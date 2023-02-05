import React from "react";
import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const CLIENT_ID = "3f3fdd849d4e4264a9ab4ac9cffa8599";
  const REDIRECT_URI = "http://localhost:3000/callback";
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";

  const [data, setData] = useState(null);
  const [token, setToken] = useState("");
  const [songKey, setSongKey] = useState("");
  const [secondSongKey, setsecondSongKey] = useState("");

  const [track, setTrack] = useState([]);
  const [trackId, setTrackId] = useState([]);

  const [artistId, setArtistId] = useState([]);

  const [dataPack, setDataPack] = useState([]);
  const [audioFeatures, setAudioFeatures] = useState([]);
  const [artistKey, setArtistKey] = useState("");
  const [secondArtistKey, setSecondArtistKey] = useState("");

  const [danceAverage, setDanceAverage] = useState("");

  const [recommendedChoices, setRecommendedChoices] = useState([]);

  //fetch to our api
  // we will use this for saving resources to our database
  //with a link on the frontend routing to this endpoint
  React.useEffect(() => {
    fetch("/api")
      .then((res) => res.json())
      .then((data) => setData(data.message));
  }, []);

  //On mount, the application searches for a token that we need to access spotifys api
  //if it already has it, use it, if not- go into browser memory and splice the hash out of a value we were given
  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("token");

    if (!token && hash) {
      token = hash
        .substring(1)
        .split("&")
        .find((elem) => elem.startsWith("access_token"))
        .split("=")[1];

      window.location.hash = "";
      window.localStorage.setItem("token", token);
    }

    setToken(token);
  }, []);

  //when we fetch for a resource within spotify's api, we need to use that token credential to access the api
  //await returns a promise, we dig the value from that proxy and reveal it on the client

  const main = async (e) => {
    e.preventDefault();

    await searchTracks(songKey, artistKey);
    await searchTracks(secondSongKey, secondArtistKey);
    getCalculation();
  };

  //main only triggers the first two searchTracks
  //wee sett a use effect on track id and artist id. oncce their length is > 1, activate getAudioFeatures;

  useEffect(() => {
    if (artistId.length > 1 && trackId.length > 1) {
      const getAudioFeatures = async (track) => {
        console.log("Track Id: ", trackId);
        const { data } = await axios.get(
          `https://api.spotify.com/v1/audio-features/${track}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const listItems = Object.entries(data).map((item) => (
          <li>{item.join(" : ")}</li>
        ));

        setDataPack((dataPack) => [...dataPack, data]);
        setAudioFeatures((audioFeatures) => [...audioFeatures, listItems]);
      };

      getAudioFeatures(trackId[0]);
      getAudioFeatures([trackId[1]]);
    }
  }, [artistId]);

  const searchTracks = async (song, artist) => {
    const { data } = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: song,
        type: "track",
      },
    });
    console.log("Track: ", data);

    let matchedTrack = data.tracks.items.filter((item) => {
      if (item.artists[0].name.toLowerCase() === artist.toLowerCase()) {
        return item;
      }
    })[0];

    console.log("matchedTrack", matchedTrack);

    setTrackId((trackId) => [...trackId, matchedTrack.id]);
    console.log("trackid", matchedTrack.id);
    setArtistId((artistId) => [...artistId, matchedTrack.artists[0].id]);
  };

  const getCalculation = async () => {
    let danceAcc = 0;

    dataPack.map((song) => {
      danceAcc += song.danceability;
    });

    console.log("datapac", dataPack);

    setDanceAverage(danceAcc / dataPack.length);
    await getRecommendation();
  };

  const getRecommendation = async () => {
    const { data } = await axios.get(
      "https://api.spotify.com/v1/recommendations",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          seed_artists: [artistId[0], artistId[1]],
          seed_genres: "rock,pop",
          seed_tracks: [trackId[0], trackId[1]],
          target_danceability: danceAverage,
        },
      }
    );
    console.log("Recommendations", data);

    const listItems = data.tracks.map((item) => (
      <li>
        {item.artists[0].name} : {item.name}
      </li>
    ));

    setRecommendedChoices(listItems);
  };

  //Logout
  const logout = () => {
    setToken("");
    window.localStorage.removeItem("token");
  };

  return (
    <div className='App'>
      <header className='App-header'>
        <h1>DoppelSönger</h1>
        <h3>
          Type in the name of two songs to algorithmically find a vibe thats
          in-between those two songs.
        </h3>

        {token ? (
          <form onSubmit={main}>
            <div style={{ display: "flex" }}>
              <div>
                <h4>First Song Choice</h4>
                <input
                  type='text'
                  placeholder='Song Choice'
                  onChange={(e) => setSongKey(e.target.value)}
                />
                <input
                  type='text'
                  placeholder='Artist Choice'
                  onChange={(e) => setArtistKey(e.target.value)}
                />
                <ul style={{ fontSize: "12px" }}>{audioFeatures[0]}</ul>
              </div>

              <div>
                <h4>Second Song Choice</h4>
                <input
                  type='text'
                  placeholder='Second Song Choice'
                  onChange={(e) => setsecondSongKey(e.target.value)}
                />
                <input
                  type='text'
                  placeholder='Second Artist Choice'
                  onChange={(e) => setSecondArtistKey(e.target.value)}
                />
                <ul style={{ fontSize: "12px" }}>{audioFeatures[1]}</ul>
              </div>
            </div>
            <button type={"submit"}>Search</button>
          </form>
        ) : (
          <h2>Please login</h2>
        )}

        <div>
          <h5>We Recommend You Listen To: </h5>
          {recommendedChoices}
        </div>

        {!token ? (
          <a
            href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}`}
          >
            Login to Spotify
          </a>
        ) : (
          <button onClick={logout}>Logout</button>
        )}
      </header>
    </div>
  );
}

export default App;
