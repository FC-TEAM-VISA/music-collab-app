import * as htmlToImage from "html-to-image";
import React, { useState, useEffect, createRef } from "react";
import Looper from "../../components/board/Looper";
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
const buttonState = {
  triggered: false,
  activated: false,
  audio: "",
  instrument: "",
};

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
  const [colorInstrument, setColorInstrument] = useState("");
  const [selected, setSelected] = useState("SELECTED");
  const [beat, setBeat] = useState(0);
  const [soundArray, setSoundArray] = useState([]);
  const [chorus, setChorus] = useState({
    rate: 0,
    delay: 0,
    feedback: 0,
    bypass: 0,
  });
  const [phaser, setPhaser] = useState({
    rate: 0.1, //0.01 to 8 is a decent range, but higher values are possible
    depth: 0, //0 to 1
    feedback: 0, //0 to 1+
    stereoPhase: 0, //0 to 180
    baseModulationFrequency: 700, //500 to 1500
    bypass: 0,
  });
  const [tremolo, setTremolo] = useState({
    intensity: 0, //0 to 1
    rate: 0.001, //0.001 to 8
    stereoPhase: 0, //0 to 180
    bypass: 0,
  });
  const [moog, setMoog] = useState({
    cutoff: 0.0, //0 to 1
    resonance: 0, //0 to 4
    bufferSize: 4096, //256 to 16384
  });
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

  useEffect(() => {
    // handleClear
    const gridCopy = [...grid];
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        gridCopy[i][j] = {
          triggered: false,
          activated: false,
          audio: "",
          instrument: "",
        };
      }
    }
    setGrid(gridCopy);
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
        chorus: chorus,
        phaser: phaser,
        tremolo: tremolo,
        moog: moog,
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
    setColorInstrument(selectedInstrument);
  }, [soundArray, val, beat, selectedInstrument]);

  const togglePlaying = () => {
    setPlaying((prev) => !prev);
  };

  return (
    <div>
      <div className="grid grid-cols-12 text-xl">
        <div className="col-span-8 bg-slate-900">
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
              bpm={bpm}
              playing={playing}
              beat={beat}
              steps={steps}
              grid={grid}
              setGrid={setGrid}
              uniqueID={uniqueID}
              handleSave={handleSave}
              selectedInstrument={selectedInstrument}
              colorInstrument={colorInstrument}
              selected={selected}
              masterVolume={masterVolume}
              soundArray={soundArray}
              chorus={chorus}
              phaser={phaser}
              tremolo={tremolo}
              moog={moog}
            />
          </div>
        </div>

        <div className="col-span-4 ml-4 bg-slate-900">
          <EffectsMenu
            chorus={chorus}
            phaser={phaser}
            tremolo={tremolo}
            setChorus={setChorus}
            setPhaser={setPhaser}
            setTremolo={setTremolo}
            moog={moog}
            setMoog={setMoog}
          />
        </div>
      </div>
    </div>
  );
};

export default Board;
