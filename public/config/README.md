# Configuration Files

This directory contains JSON configuration files for body part mappings.

## Files

- **foot-mapping.json** - Mapping configuration for foot X-rays and 3D models
- Additional body part mappings (hand, knee, etc.) can be added here

## Structure

Each mapping file should follow the `MappingConfig` interface:

```json
{
  "bodyPart": "foot",
  "xrayDimensions": { "width": 1920, "height": 1080 },
  "bones": [
    {
      "id": "unique-bone-id",
      "name": "Display Name",
      "function": "Educational description",
      "commonInjuries": ["Injury 1", "Injury 2"],
      "xrayRegion": {
        "type": "polygon",
        "coordinates": [[x1, y1], [x2, y2], ...]
      },
      "meshId": "MeshNameIn3DModel",
      "highlightColor": "#HEX"
    }
  ]
}
```
