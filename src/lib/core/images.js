import { localStorage } from "../browser/adapter.js"

export const images = {
    DEFAULT_IMAGE_PATH: "images/default-blocked.png",
    BLOCKED_IMAGE_KEY: "blockedImage",
    
    // Load current image
    async loadImage() {
        const { blockedImage } = await localStorage.get([images.BLOCKED_IMAGE_KEY])
        return blockedImage || images.DEFAULT_IMAGE_PATH
    },

    // Save image to storage
    async saveImage(dataUrl) {
        await localStorage.set({ [images.BLOCKED_IMAGE_KEY]: dataUrl })
    },

    // Get current image data
    async getCurrentImage() {
        return await this.loadImage()
    },

    // Reset image to default
    async resetImage() {
        await localStorage.remove([images.BLOCKED_IMAGE_KEY])
    },

    // Compress image with quality optimization
    async compressImage(dataUrl, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.src = dataUrl
            img.onload = () => {
                const canvas = document.createElement("canvas")
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext("2d")
                ctx.drawImage(img, 0, 0)
                try {
                    resolve(canvas.toDataURL("image/jpeg", quality))
                } catch (error) {
                    if (error.message.includes("QUOTA_BYTES_PER_ITEM")) {
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
