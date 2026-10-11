export interface UploadedMedia {
  url: string
  pathname: string
}

interface SignedUpload extends UploadedMedia {
  uploadUrl: string
}

function uploadWithXhr(url: string, file: File, timeout: number, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.timeout = timeout
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`对象存储上传失败（HTTP ${xhr.status}）`))
    }
    xhr.onerror = () => reject(new Error('无法连接对象存储'))
    xhr.ontimeout = () => reject(new Error('对象存储连接超时'))
    xhr.send(file)
  })
}

export async function uploadMediaDirect(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedMedia> {
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ type: file.type, size: file.size }),
  })
  const signed = await response.json().catch(() => null) as SignedUpload | null
  if (!response.ok || !signed?.uploadUrl || !signed.url || !signed.pathname) {
    throw new Error((signed as { error?: string } | null)?.error || `生成上传地址失败（HTTP ${response.status}）`)
  }

  const uploadedUrl = signed.url
  const uploadedPathname = signed.pathname
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await uploadWithXhr(signed.uploadUrl, file, 90_000, onProgress)
      onProgress?.(100)
      return { url: uploadedUrl, pathname: uploadedPathname }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('对象存储上传失败')
      if (attempt < 3) {
        onProgress?.(0)
        await new Promise((resolve) => setTimeout(resolve, attempt * 800))
      }
    }
  }

  // If the browser cannot reach the object-store endpoint, keep the same signed
  // pathname and proxy the upload through this site's origin instead.
  try {
    await uploadWithXhr(
      `/api/upload?pathname=${encodeURIComponent(uploadedPathname)}`,
      file,
      120_000,
      onProgress
    )
    onProgress?.(100)
    return { url: uploadedUrl, pathname: uploadedPathname }
  } catch (error) {
    const proxyError = error instanceof Error ? error : new Error('上传文件失败')
    throw new Error(`${proxyError.message}（直传已重试 3 次）`)
  }
}
