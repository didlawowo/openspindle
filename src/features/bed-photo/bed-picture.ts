import { createAtom, useSelector } from "@tanstack/react-store"
import type { BedPicture } from "@/domain/fixtures/bed-photo"

type BedPictureState = {
  /** The last picture taken; kept until the next one, never saved. */
  readonly picture: BedPicture | null
  /** Whether the 3D view draws it: a view setting. */
  readonly shown: boolean
  /** How many photos are taken of how many, while the machine takes them. */
  readonly shooting: { readonly done: number; readonly total: number } | null
  /** The user asked the photos under way to stop. */
  readonly stopRequested: boolean
}

const bedPictureAtom = createAtom<BedPictureState>({
  picture: null,
  shown: true,
  shooting: null,
  stopRequested: false,
})

export const useBedPicture = () => useSelector(bedPictureAtom)

/** The picture the 3D view draws on the bed: the last taken, unless hidden. */
export const shownBedPicture = ({ picture, shown }: BedPictureState) =>
  shown ? picture : null

export function setBedPicture(picture: BedPicture) {
  bedPictureAtom.set((state) => ({ ...state, picture, shown: true }))
}

/** Photos begin, progress or end (null); beginning and ending clear a request to stop. */
export function setShooting(shooting: BedPictureState["shooting"]) {
  bedPictureAtom.set((state) => ({
    ...state,
    shooting,
    stopRequested: shooting?.done ? state.stopRequested : false,
  }))
}

/** Asks the photos under way to stop after the move under way. */
export function requestStop() {
  bedPictureAtom.set((state) => ({ ...state, stopRequested: true }))
}

export const stopRequested = () => bedPictureAtom.get().stopRequested

export function toggleBedPicture() {
  bedPictureAtom.set((state) => ({ ...state, shown: !state.shown }))
}
