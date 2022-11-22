import React, { useState, useEffect } from "react";
import * as Tone from "tone";

const AudioPlayer = ({ children, objectSounds, bpm }) => {
  const [player, setPlayer] = useState(null);
  useEffect(() => {
    const player = new Tone.Players(objectSounds, () => {
      setPlayer(player);
    }).connect(Tone.Destination);
  }, [objectSounds, bpm]);

  return children({ player });
};

export default AudioPlayer;