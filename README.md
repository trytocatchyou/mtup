# Upload Service

This is a configurable file upload service written in TypeScript. It provides flexible options for file uploading, including support for multiple file uploads, custom upload handlers, and configurable retry limits.

## Features

- **Configurable File Uploads**: Accepts various file types and supports multiple file uploads.
- **Retry Mechanism**: Allows setting maximum retry attempts for failed uploads.
- **Custom Upload Handling**: Supports custom upload logic through a user-defined function.
- **Timeout Control**: Configurable upload timeout to handle slow network conditions.
- **File Size Validation**: Enforces a maximum file size limit for uploads.

## Installation

To use this upload service, install it via npm:

```bash
npm install upload-service
```

## Usage

### Basic Example

```typescript
import { UploadService, UploadConfig } from 'upload-service';

const config: UploadConfig = {
  accept: 'image/*',
  multiple: true,
  maxRetries: 3,
  timeout: 10000, // 10 seconds
  maxSize: 5 * 1024 * 1024, // 5 MB
};

const uploadService = new UploadService(config);

const fileInput = document.querySelector('input[type="file"]');
if (fileInput) {
  fileInput.addEventListener('change', async () => {
    if (fileInput.files) {
      try {
        await uploadService.uploadFiles(Array.from(fileInput.files));
        console.log('Upload successful');
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  });
}
```

### Custom Uploader Example

```typescript
import { UploadService, UploadConfig, UploadOptions } from 'upload-service';

const customUploader = async (file: File, uploadOptions: UploadOptions) => {
  console.log(`Uploading file: ${file.name}`);
  // Custom upload logic here (e.g., using fetch or Axios)
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async upload
  console.log(`File uploaded: ${file.name}`);
};

const config: UploadConfig = {
  customUploader,
};

const uploadService = new UploadService(config);
```

## Configuration Options

### `UploadConfig`

| Property         | Type                                        | Default        | Description                                                                 |
|------------------|---------------------------------------------|----------------|-----------------------------------------------------------------------------|
| `accept`         | `string`                                   | `""`          | Specifies the allowed file types for upload.                               |
| `multiple`       | `boolean`                                  | `false`        | Enables or disables multiple file uploads.                                 |
| `maxRetries`     | `number`                                   | `3`            | The maximum number of retry attempts for failed uploads.                   |
| `timeout`        | `number`                                   | `10000`        | Upload timeout in milliseconds.                                            |
| `maxSize`        | `number`                                   | `10485760`     | Maximum file size in bytes (default: 10 MB).                               |
| `customUploader` | `(file: File, options: UploadOptions) => Promise<any>` | `undefined`    | A custom function to handle file uploads.                                  |

## Development

### Prerequisites

- Node.js
- npm or Yarn

### Building the Project

To build the project, run:

```bash
npm run build
```

### Running Tests

To run the test suite, use:

```bash
npm test
```

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to suggest changes.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

