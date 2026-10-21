'use strict';

// Compressed CDN responses can carry W/"..." while Blob conditional writes
// require the strong storage ETag. Verify against storage metadata, never
// disable ifMatch or blindly strip the weak prefix.
async function readMutableBlob(sdk, pathname) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await sdk.get(pathname, { access: 'private', useCache: false });
    if (!result) return null;
    const etag = result.blob.etag;
    if (etag && !etag.startsWith('W/')) return result;
    if (etag?.startsWith('W/')) {
      const metadata = await sdk.head(pathname);
      if (metadata.etag && etag.slice(2) === metadata.etag) {
        result.blob.etag = metadata.etag;
        return result;
      }
    }
    await result.stream?.cancel();
  }
  const error = new Error('Storage changed while reading. Please try again.');
  error.status = 409;
  throw error;
}
module.exports = { readMutableBlob };
