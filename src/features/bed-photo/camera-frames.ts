import type { PhotoPixels } from "@/domain/fixtures/bed-photo"
import type { MachineHost } from "@/platform/host"

/** The machine's camera gave no picture: its stream failed, or stayed silent. */
export class CameraSilentError extends Error {}

/**
 * The machine camera's stream, watched for single pictures: `next(count)` gives the `count`th
 * JPEG to come, so the first ones, taken while the bed still moved or the exposure settled, are
 * passed over. It rejects when the stream fails or gives none within `timeoutMs`.
 */
export function watchFrames(machine: MachineHost) {
  let failed = false
  let waiting: {
    left: number
    resolve: (jpeg: Uint8Array) => void
    reject: (error: Error) => void
  } | null = null
  const fail = () => {
    waiting?.reject(new CameraSilentError())
    waiting = null
  }
  const stop = machine.watchCamera((event) => {
    if (event.kind === "status") {
      failed = event.status === "error"
      if (failed) fail()
      return
    }
    if (!waiting) return
    waiting.left -= 1
    if (waiting.left > 0) return
    waiting.resolve(event.jpeg)
    waiting = null
  })
  return {
    next: (count: number, timeoutMs: number) =>
      new Promise<Uint8Array>((resolve, reject) => {
        if (failed) {
          reject(new CameraSilentError())
          return
        }
        const timer = setTimeout(fail, timeoutMs)
        const settle =
          <T>(done: (value: T) => void) =>
          (value: T) => {
            clearTimeout(timer)
            done(value)
          }
        waiting = {
          left: count,
          resolve: settle(resolve),
          reject: settle(reject),
        }
      }),
    stop,
  }
}

/** A JPEG's pixels, as the browser decodes it. */
export async function decodePhoto(jpeg: Uint8Array): Promise<PhotoPixels> {
  const bitmap = await createImageBitmap(
    new Blob([jpeg.slice()], { type: "image/jpeg" })
  )
  const { width, height } = bitmap
  const context = new OffscreenCanvas(width, height).getContext("2d")
  if (!context) throw new Error("No 2D canvas to decode the photo in.")
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  return { width, height, data: context.getImageData(0, 0, width, height).data }
}
