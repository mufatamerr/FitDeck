/**
 * Injects Cloudinary URL transformation parameters for high-quality display.
 * Works by inserting a transform segment after /upload/ in the URL.
 */
export function cloudinaryHQ(
  url: string | null | undefined,
  opts: {
    width?: number
    quality?: 'auto:best' | 'auto:good' | '100'
    sharpen?: number
    format?: 'auto' | 'webp' | 'jpg'
    dpr?: 'auto' | '2.0' | '3.0'
  } = {},
): string {
  if (!url || !url.includes('res.cloudinary.com')) return url ?? ''

  const {
    width   = 1200,
    quality = 'auto:best',
    sharpen = 80,
    format  = 'auto',
    dpr     = 'auto',
  } = opts

  const transforms = [
    `w_${width}`,
    `q_${quality}`,
    `f_${format}`,
    `dpr_${dpr}`,
    sharpen > 0 ? `e_sharpen:${sharpen}` : null,
    'c_fill',
    'g_auto',
  ]
    .filter(Boolean)
    .join(',')

  return url.replace('/upload/', `/upload/${transforms}/`)
}
