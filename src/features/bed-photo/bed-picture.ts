import { createAtom, useSelector } from "@tanstack/react-store"
import type { BedPicture } from "@/domain/fixtures/bed-photo"

type BedPictureState = {
  /** The last picture taken; kept until the next one, never saved. */
  readonly picture: BedPicture | null
  /** Whether the 3D view draws it: a view setting. */
  readonly shown: boolean
  /** How many photos are taken of how many, while the machine takes them. */
  readonly shooting: { readonly done: number; readonly total: number } | null
}

const bedPictureAtom = createAtom<BedPictureState>({
  picture: null,
  shown: true,
  shooting: null,
})

export const useBedPicture = () => useSelector(bedPictureAtom)

/** The picture the 3D view draws on the bed: the last taken, unless hidden. */
export const shownBedPicture = ({ picture, shown }: BedPictureState) =>
  shown ? picture : null

export function setBedPicture(picture: BedPicture) {
  bedPictureAtom.set((state) => ({ ...state, picture, shown: true }))
}

export function setShooting(shooting: BedPictureState["shooting"]) {
  bedPictureAtom.set((state) => ({ ...state, shooting }))
}

export function toggleBedPicture() {
  bedPictureAtom.set((state) => ({ ...state, shown: !state.shown }))
}
