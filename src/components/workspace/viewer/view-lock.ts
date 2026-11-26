/** The switches of the view's orbit controls that a locked view turns off. */
export type OrbitSwitches = { enableRotate: boolean }

/**
 * A locked view holds its angle: drags no longer orbit it, so a drag that misses the selected
 * item moves nothing instead of turning the bed away. Zoom and pan stay.
 */
export function applyViewLock(controls: OrbitSwitches, locked = false) {
  controls.enableRotate = !locked
}
