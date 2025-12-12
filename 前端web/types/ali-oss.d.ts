declare module 'ali-oss' {
  interface OSSOptions {
    region?: string
    accessKeyId: string
    accessKeySecret: string
    bucket?: string
    authorizationV4?: boolean
    secure?: boolean
    timeout?: number
    stsToken?: string
    endpoint?: string
    cname?: boolean
    isRequestPay?: boolean
    useFetch?: boolean
    refreshSTSToken?: () => Promise<{ accessKeyId: string; accessKeySecret: string; stsToken: string }>
    refreshSTSTokenInterval?: number
  }

  interface PutResult {
    name: string
    url: string
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  interface GetResult {
    content: Buffer
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  interface HeadResult {
    status: number
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  interface SignatureUrlOptions {
    expires?: number
    method?: string
    'Content-Type'?: string
    process?: string
    response?: {
      'content-type'?: string
      'content-disposition'?: string
    }
  }

  interface ListResult {
    objects: Array<{
      name: string
      url: string
      lastModified: string
      etag: string
      type: string
      size: number
      storageClass: string
      owner: {
        id: string
        displayName: string
      }
    }>
    prefixes: string[]
    isTruncated: boolean
    nextMarker: string
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  interface DeleteResult {
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  interface CopyResult {
    data: {
      etag: string
      lastModified: string
    }
    res: {
      status: number
      statusCode: number
      headers: Record<string, string>
    }
  }

  class OSS {
    constructor(options: OSSOptions)
    put(name: string, file: Buffer | string | ReadableStream, options?: Record<string, any>): Promise<PutResult>
    get(name: string, file?: string | WriteStream, options?: Record<string, any>): Promise<GetResult>
    head(name: string, options?: Record<string, any>): Promise<HeadResult>
    delete(name: string, options?: Record<string, any>): Promise<DeleteResult>
    copy(name: string, sourceName: string, options?: Record<string, any>): Promise<CopyResult>
    list(query?: Record<string, any>, options?: Record<string, any>): Promise<ListResult>
    signatureUrl(name: string, options?: SignatureUrlOptions): string
    useBucket(bucket: string): void
  }

  export = OSS
}

