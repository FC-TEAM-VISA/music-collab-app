import * as htmlToImage from "html-to-image";
import React, { useState, useEffect, createRef } from "react";
import Looper from "../../components/board/Looper";
import AudioPlayer from "../../components/board/AudioPlayer";
import TopToolbar from "../../components/toolbar/TopToolbar";
import EffectsMenu from "../../components/effectsmenu/EffectsMenu";

//firebase imports
import {
  collection,
  doc,
  serverTimestamp,
  addDoc,
  setDoc,
  where,
  query,
} from "firebase/firestore";
import { database, auth } from "../../../utils/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { useRouter } from "next/router";

/* THE BOARD*/
const steps = 8;
const buttonState = { triggered: false, activated: false, audio: "" };
const sounds = [
  ["1", "2", "3", "4", "5", "6", "7", "8"],
  ["9", "10", "11", "12", "13", "14", "15", "16"],
  ["17", "18", "19", "20", "21", "22", "23", "24"],
  ["25", "26", "27", "28", "29", "30", "31", "32"],
  ["33", "34", "35", "36", "37", "38", "39", "40"],
];

//sets up how big the grid will be
const initialGrid = [
  new Array(8).fill(buttonState),
  new Array(8).fill(buttonState),
  new Array(8).fill(buttonState),
  new Array(8).fill(buttonState),
  new Array(8).fill(buttonState),
];

const Board = () => {
  const router = useRouter();
  //authentication + user info
  const [user] = useAuthState(auth);
  const dbRef = collection(database, "users");
  const [docs] = useCollectionData(dbRef);
  let currentUser;
  if (user) {
    currentUser = docs?.find((doc) => doc.email === user.email);
  }
  //instruments
  const [selectedInstrument, setSelectedInstrument] = useState("selected");
  const [selected, setSelected] = useState("SELECTED");
  const [objectSounds, setObjectSounds] = useState({
    "https://firebasestorage.googleapis.com/v0/b/music-collaboration-app.appspot.com/o/built-in-instruments%2Fdrums%2Fclap%2Fclap-808.wav?alt=media&token=1e2bd7d8-dad2-49b6-a6db-9959a06f1520":
      "https://firebasestorage.googleapis.com/v0/b/music-collaboration-app.appspot.com/o/built-in-instruments%2Fdrums%2Fclap%2Fclap-808.wav?alt=media&token=1e2bd7d8-dad2-49b6-a6db-9959a06f1520",
  });
  const [beat, setBeat] = useState(0);
  const [soundArray, setSoundArray] = useState([]);
  //project info
  const [grid, setGrid] = useState(initialGrid); //project board
  const [uniqueID, setUniqueID] = useState(null); //project id
  const [playing, setPlaying] = useState(false); //audio player
  const [name, setName] = useState("Untitled"); //project name
  const [bpm, setBpm] = useState(120); //tempo
  const [mute] = useState(false); //mute button
  const [masterVolume, setMasterVolume] = useState(1); //master vol
  const ref = createRef(null);
  const dbInstance = query(
    collection(database, "projects"),
    where(`ownerId`, "==", `${user?.uid}`)
  );
  const [projects] = useCollectionData(dbInstance);
  const [chorus, setChorus] = useState({
    rate: 0,
    delay: 0,
    feedback: 0,
    bypass: 0,
  });
  const [reverb, setReverb] = useState({ decay: 1 });
  const [phaser, setPhaser] = useState({
    frequency: 0,
    octaves: 0,
    baseFrequency: 0,
  });
  const [tremolo, setTremolo] = useState({ frequency: 0, depth: 0 });

  useEffect(() => {
    // handleClear
    const gridCopy = [...grid];
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        gridCopy[i][j] = {
          triggered: false,
          activated: false,
          audio: "",
        };
      }
    }
    setGrid(gridCopy);
    console.log("set grid!");
  }, []);

  const handleSave = async () => {
    const image = await takeScreenShot(ref.current);

    if (!uniqueID) {
      const newProject = await addDoc(collection(database, `projects`), {
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        collaboratorIds: [],
        username: currentUser.name,
        name: name,
        soundArray: soundArray,
        beat,
        selected,
        selectedInstrument,
        grid: {
          r1: grid[0],
          r2: grid[1],
          r3: grid[2],
          r4: grid[3],
          r5: grid[4],
        },
        bpm: +bpm,
        masterVolume: +masterVolume,
        isPublic: true,
        screen: image,
      });

      setUniqueID(newProject.id);

      await setDoc(
        doc(database, `projects/${newProject.id}`),
        {
          projectId: newProject.id,
          screen: image,
        },
        { merge: true }
      );

      router.push({
        pathname: `/board/[id]`,
        query: { id: newProject.id },
      });
    }
  };

  const takeScreenShot = async (node) => {
    const dataURI = await htmlToImage.toJpeg(node);
    return dataURI;
  };

  // KEEP THIS FOR TESTING COLLABORATION
  // useEffect(() => {
  //   if (uniqueID) {
  //     const realTime = async () => {
  //       await updateDoc(doc(database, `projects/${uniqueID}`), {
  //         createdAt: serverTimestamp(),
  //         grid: {
  //           r1: grid[0],
  //           r2: grid[1],
  //           r3: grid[2],
  //           r4: grid[3],
  //           r5: grid[4],
  //         },
  //         bpm: +bpm,
  //       });
  //     };
  //     realTime();
  //   }
  // }, [grid, bpm]);

  const [val, setVal] = useState("");

  const handleBeatChange = (value) => {
    const findSample = soundArray.find((sample) => sample === value);
    if (!findSample) {
      let arrayCopy = [...soundArray];
      arrayCopy.push(value);
      setSoundArray(arrayCopy);
    }
    setVal(value);
  };

  useEffect(() => {
    const idx = soundArray.indexOf(val);
    setBeat(idx);
    console.log(val, soundArray, beat);
  }, [soundArray, val, beat]);

  const togglePlaying = () => {
    setPlaying((prev) => !prev);
  };

  return (
    <div>
      <div className="grid grid-cols-12 text-xl">
        <div className="col-span-8 bg-slate-800">
          <AudioPlayer
            objectSounds={objectSounds}
            bpm={bpm}
            mute={mute}
            masterVolume={masterVolume}
          >
            {({ player }) => {
              if (!player) {
                return (
                  <p className="flex items-center justify-center animate-bounce">
                    LOADING....
                  </p>
                );
              }
              return (
                <>
                  <div className="col-span-8 bg-black">
                    {/* TOOLBAR */}
                    <TopToolbar
                      beat={beat}
                      setBeat={setBeat}
                      projects={projects}
                      grid={grid}
                      setGrid={setGrid}
                      setUniqueID={setUniqueID}
                      uniqueID={uniqueID}
                      handleBeatChange={handleBeatChange}
                      currentUser={currentUser}
                      setSelectedInstrument={setSelectedInstrument}
                      playing={playing}
                      player={player}
                      setPlaying={setPlaying}
                      bpm={bpm}
                      setBpm={setBpm}
                      selected={selected}
                      setSelected={setSelected}
                      user={user}
                      handleSave={handleSave}
                      name={name}
                      setName={setName}
                      togglePlaying={togglePlaying}
                      masterVolume={masterVolume}
                      setMasterVolume={setMasterVolume}
                    />
                  </div>
                  <div ref={ref}>
                    <Looper
                      player={player}
                      bpm={bpm}
                      playing={playing}
                      beat={beat}
                      objectSounds={objectSounds}
                      steps={steps}
                      sounds={sounds}
                      grid={grid}
                      setGrid={setGrid}
                      uniqueID={uniqueID}
                      handleSave={handleSave}
                      selectedInstrument={selectedInstrument}
                      selected={selected}
                      masterVolume={masterVolume}
                      soundArray={soundArray}
                      chorus={chorus}
                    />
                  </div>
                </>
              );
            }}
          </AudioPlayer>
        </div>

        <div className="col-span-4 ml-4 bg-prussian_blue">
          <EffectsMenu
            reverb={reverb}
            chorus={chorus}
            phaser={phaser}
            tremolo={tremolo}
            setReverb={setReverb}
            setChorus={setChorus}
            setPhaser={setPhaser}
            setTremolo={setTremolo}
          />
        </div>
      </div>
    </div>
  );
};

export default Board;
