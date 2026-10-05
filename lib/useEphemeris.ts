"use client";

import { useEffect, useState } from "react";
import { EPHEMERIS_URL, seriesFrom, type EphemerisFile, type Series } from "./ephemeris";

export type Ephemeris = { geo: Series; helio: Series };
type State = { data: Ephemeris | null; failed: boolean };

let request: Promise<Ephemeris> | null = null;

function load(): Promise<Ephemeris> {
  request ??= fetch(EPHEMERIS_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`ephemeris ${res.status}`);
      return res.json() as Promise<EphemerisFile>;
    })
    .then((file) => ({ geo: seriesFrom(file, "geo"), helio: seriesFrom(file, "helio") }));
  return request;
}

export function useEphemeris(): State {
  const [state, setState] = useState<State>({ data: null, failed: false });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ data, failed: false }),
      () => {
        request = null; // let a later mount retry
        if (live) setState({ data: null, failed: true });
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}
