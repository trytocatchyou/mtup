import { EventEmitter } from 'events';

/**
 * 文件上传配置接口
 */
export interface UploadConfig {
  /** 允许上传的文件类型 */
  accept?: string;
  
  /** 是否多文件上传 */
  multiple?: boolean;
  
  /** 最大重试次数 */
  maxRetries?: number;
  
  /** 上传超时时间(毫秒) */
  timeout?: number;
  
  /** 单文件最大尺寸(字节) */
  maxSize?: number;
  
  /** 自定义上传处理函数 */
  customUploader?: (file: File, uploadOptions: UploadOptions) => Promise<any>;
}

/**
 * 上传配置选项接口
 */
export interface UploadOptions {
  /** 上传目标URL */
  url?: string;
  
  /** HTTP请求方法 */
  method?: 'POST' | 'PUT' | 'PATCH';
  
  /** 自定义请求头 */
  headers?: Record<string, string>;
  
  /** 额外携带的数据 */
  data?: Record<string, any>;
}

/**
 * 上传事件类型接口
 */
export interface UploadEvent {
  type: 'progress' | 'error' | 'success' | 'retry' | 'select';
  payload: any;
}

/**
 * 通用文件上传器
 */
class Uploader {
  private config: UploadConfig;
  private eventEmitter: EventEmitter;
  private fileCache: Map<string, File>;
  private inputElement: HTMLInputElement;
  private defaultUploadOptions: UploadOptions;

  constructor(config: UploadConfig = {}) {
    this.config = {
      accept: '*',
      multiple: false,
      maxRetries: 3,
      timeout: 30000,
      maxSize: 10 * 1024 * 1024,
      ...config
    };
    
    this.eventEmitter = new EventEmitter();
    this.fileCache = new Map();
    this.defaultUploadOptions = {
      method: 'POST',
      url: '/upload'
    };
    
   this.inputElement = this.createInputElement(this.config);
  }

  /**
   * 设置全局默认上传配置
   * @param options 上传配置选项
   */
  setDefaultUploadOptions(options: UploadOptions): void {
    this.defaultUploadOptions = { 
      ...this.defaultUploadOptions, 
      ...options 
    };
  }

  /**
   * 创建文件选择输入元素
   */
  private createInputElement(config: UploadConfig): HTMLInputElement {
    const inputEle: HTMLInputElement = document.createElement('input');
    inputEle.type = 'file';
    inputEle.accept = config.accept!;
    inputEle.multiple = config.multiple!;
    
    inputEle.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files) {
        const selectedFiles = Array.from(files);
        this.handleFileSelection(selectedFiles);
      }
    });
    return inputEle;
  }

  /**
   * 处理文件选择
   * @param files 选择的文件列表
   */
  private handleFileSelection(files: File[]): void {
    const validFiles = files.filter(file => 
      file.size <= (this.config.maxSize || Infinity)
    );

    if (validFiles.length !== files.length) {
      this.emitEvent('error', '部分文件超过最大尺寸限制');
    }

    validFiles.forEach(file => {
      const fileKey = this.generateFileKey(file);
      this.fileCache.set(fileKey, file);
    });

    this.emitEvent('select', validFiles);
  }

  /**
   * 生成文件唯一标识
   * @param file 文件对象
   */
  private generateFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  /**
   * 打开文件选择器
   */
  openFileSelector(): void {
    this.inputElement.click();
  }

  /**
   * 上传文件
   * @param file 待上传文件
   * @param uploadOptions 上传配置选项
   */
  upload(file: File, uploadOptions?: UploadOptions): Promise<any> {
    const fileKey = this.generateFileKey(file);
    const mergedOptions = { 
      ...this.defaultUploadOptions, 
      ...uploadOptions 
    };

    return new Promise(async (resolve, reject) => {
      let retries = 0;

      const attemptUpload = async () => {
        try {
          const uploadFunction = this.config.customUploader || this.defaultUploader;
          
          const uploadPromise = uploadFunction(file, mergedOptions);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout')), this.config.timeout)
          );

          const result = await Promise.race([uploadPromise, timeoutPromise]);

          this.emitEvent('success', result);
          this.fileCache.delete(fileKey);
          resolve(result);
        } catch (error) {
          this.emitEvent('error', error);

          if (retries < this.config.maxRetries!) {
            retries++;
            this.emitEvent('retry', { attempt: retries, error });
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            await attemptUpload();
          } else {
            reject(error);
          }
        }
      };

      this.uploadWithProgress(file, attemptUpload);
    });
  }

  /**
   * 带进度的文件上传
   * @param file 待上传文件
   * @param uploadMethod 上传方法
   */
  private uploadWithProgress(file: File, uploadMethod: () => Promise<any>): void {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        this.emitEvent('progress', { 
          total: event.total, 
          loaded: event.loaded, 
          percent: percentComplete 
        });
      }
    };

    uploadMethod();
  }

  /**
   * 默认上传处理函数
   * @param file 待上传文件
   * @param options 上传配置选项
   */
  private defaultUploader(file: File, options?: UploadOptions): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    // 添加额外的数据
    if (options?.data) {
      Object.entries(options.data).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return fetch(options?.url || '/upload', {
      method: options?.method || 'POST',
      headers: options?.headers,
      body: formData
    }).then(response => response.json());
  }

  /**
   * 获取缓存文件
   * @param fileKey 文件唯一标识
   */
  getCachedFile(fileKey: string): File | undefined {
    return this.fileCache.get(fileKey);
  }

  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param listener 事件处理函数
   */
  on(event: string, listener: (event: UploadEvent) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * 触发事件
   * @param type 事件类型
   * @param payload 事件携带的数据
   */
  private emitEvent(type: UploadEvent['type'], payload: any): void {
    this.eventEmitter.emit('upload', { type, payload });
  }
}

export default Uploader;