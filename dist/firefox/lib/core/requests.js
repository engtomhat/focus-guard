// Request analysis utilities
export const requests = {
  isTrackingRequest(url) {
    try {
      const parsedUrl = new URL(url)
      // Check if Facebook tracking request
      return parsedUrl.hostname.includes("facebook.com") && 
      (parsedUrl.pathname.startsWith("/tr/") || 
       parsedUrl.pathname.startsWith("/plugins/"))
    } catch (e) {
      console.error("Invalid URL:", url, e)
      return false
    }
  }
}
