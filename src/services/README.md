# Services

This directory contains service layer modules for the BoneVision application.

## Services

- **imageService.ts** - Image loading, format conversion, and DICOM processing
- **modelService.ts** - 3D model loading and management
- **mappingService.ts** - Region mapping between X-rays and 3D models
- **validationService.ts** - File and input validation

## Guidelines

- Services should be stateless and export pure functions or classes
- Use async/await for asynchronous operations
- Handle errors gracefully with descriptive messages
- Follow the interfaces defined in `src/types/index.ts`
