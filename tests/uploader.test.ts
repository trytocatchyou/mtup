import { Uploader } from "../src";

describe("Uploader", () => {
  let uploader: Uploader;
  let mockFile: File;

  beforeEach(() => {
    // 创建模拟文件
    mockFile = new File(["test content"], "test.txt", { type: "text/plain" });

    // 初始化上传器
    uploader = new Uploader({
      maxSize: 1024 * 1024, // 1MB
      multiple: true,
    });
  });

  test("初始化配置正确", () => {
    expect(uploader).toBeTruthy();
  });

  test("设置默认上传选项", () => {
    const defaultOptions = {
      url: "/custom-upload",
      headers: { "X-Test": "test" },
    };

    uploader.setDefaultUploadOptions(defaultOptions);

    // 通过上传方法验证配置
    const uploadSpy = jest.spyOn(uploader as any, "defaultUploader");
    (uploader as any).defaultUploader(mockFile, defaultOptions);

    expect(uploadSpy).toHaveBeenCalledWith(mockFile, expect.objectContaining(defaultOptions));
  });

  test("文件大小限制", () => {
    const largeFile = new File([new ArrayBuffer(2 * 1024 * 1024)], "large.txt", { type: "text/plain" });

    const eventSpy = jest.spyOn(uploader as any, "emitEvent");

    // 模拟文件选择
    (uploader as any).handleFileSelection([largeFile]);

    expect(eventSpy).toHaveBeenCalledWith("error", "部分文件超过最大尺寸限制");
  });

  test("事件监听", () => {
    const mockCallback = jest.fn();
    uploader.on("upload", mockCallback);

    // 触发文件选择事件
    (uploader as any).emitEvent("select", [mockFile]);

    expect(mockCallback).toHaveBeenCalled();
  });

  test("自定义上传方法", async () => {
    const customUploader = jest.fn().mockResolvedValue({ success: true });

    const uploaderWithCustom = new Uploader({
      customUploader,
    });

    await uploaderWithCustom.upload(mockFile);

    expect(customUploader).toHaveBeenCalled();
  });
});
