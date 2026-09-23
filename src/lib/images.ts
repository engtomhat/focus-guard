// Image processing for the custom blocked-page image (needs a DOM: pages only, not the background)

export const images = {
    // Compress image with quality optimization
    async compressImage(dataUrl: string, quality = 0.7): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.src = dataUrl
            img.onload = () => {
                const canvas = document.createElement("canvas")
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Canvas 2D context unavailable"))
                    return
                }
                ctx.drawImage(img, 0, 0)
                try {
                    resolve(canvas.toDataURL("image/jpeg", quality))
                } catch (error) {
                    if (error instanceof Error && error.message.includes("QUOTA_BYTES_PER_ITEM")) {
                        // Try with lower quality if quota is exceeded
                        resolve(canvas.toDataURL("image/jpeg", quality * 0.7))
                    } else {
                        reject(error)
                    }
                }
            }
            img.onerror = (error) => reject(error)
        })
    }
}
